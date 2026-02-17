"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import CubeIcon from "@/components/icons/cube";
import api from "@/lib/api";

interface ModelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

const MODEL_TYPES = [
  { id: 'yolov8', name: 'YOLOv8', color: '#00D4FF', formats: ['.pt', '.onnx', '.engine'] },
  { id: 'yolov5', name: 'YOLOv5', color: '#4ECDC4', formats: ['.pt', '.onnx', '.engine'] },
  { id: 'yolov7', name: 'YOLOv7', color: '#FFE66D', formats: ['.pt', '.onnx'] },
  { id: 'yolov9', name: 'YOLOv9', color: '#95E1D3', formats: ['.pt', '.onnx'] },
  { id: 'custom', name: 'Custom Model', color: '#F38181', formats: ['.onnx', '.tflite', '.pt', '.engine'] },
];

export function ModelUploadDialog({
  open,
  onOpenChange,
  onUploadSuccess,
}: ModelUploadDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelType, setModelType] = useState("yolov8");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const selectedType = MODEL_TYPES.find(t => t.id === modelType);

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    // Validate file format
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!selectedType?.formats.includes(ext)) {
      setError(`Invalid file format. Supported: ${selectedType?.formats.join(', ')}`);
      return;
    }

    setFile(selectedFile);
    setError("");

    // Auto-fill name if empty
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;

    setUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name.trim());
      formData.append('model_type', modelType);
      if (description) {
        formData.append('description', description);
      }

      // Simulate progress (real progress would need XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vision/models/upload`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      // Success
      setTimeout(() => {
        onOpenChange(false);
        onUploadSuccess?.();
        resetForm();
      }, 500);

    } catch (err: any) {
      setError(err.message || 'Failed to upload model');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setModelType("yolov8");
    setFile(null);
    setUploadProgress(0);
    setError("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Upload Model</DialogTitle>
          <DialogDescription>
            Upload a model file and configure its settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Model Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model Type</label>
            <Select value={modelType} onValueChange={setModelType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_TYPES.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Supported formats: {selectedType?.formats.join(', ')}
            </p>
          </div>

          {/* File Upload Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
              }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <CubeIcon className="size-10 mx-auto mb-3 text-muted-foreground" />
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(file.size)} • Click to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Drop model file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
            )}
            <input
              type="file"
              accept={selectedType?.formats.join(',')}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              disabled={uploading}
            />
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <label htmlFor="modelName" className="text-sm font-medium">
              Model Name *
            </label>
            <Input
              id="modelName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter model name"
              required
              disabled={uploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter model description"
              rows={3}
              disabled={uploading}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || !name.trim() || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Model'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
