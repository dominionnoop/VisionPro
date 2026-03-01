"use client";

import React from "react"

import { useState } from "react";
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
import type { Model, ModelClass } from "@/types/vision";
import CubeIcon from "@/components/icons/cube";
import PlusIcon from "@/components/icons/plus";

interface ModelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: { file: File; name: string }) => void;
}

const defaultColors = [
  "#22c55e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
];

export function ModelUploadDialog({
  open,
  onOpenChange,
  onUpload,
}: ModelUploadDialogProps) {
  const [name, setName] = useState("");
  const [filename, setFilename] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [classes, setClasses] = useState<ModelClass[]>([
    { id: 0, name: "OK", color: "#22c55e" },
  ]);
  const [newClassName, setNewClassName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (file: File | null) => {
    if (file) {
      setSelectedFile(file);
      setFilename(file.name);
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const newClass: ModelClass = {
      id: classes.length,
      name: newClassName.trim(),
      color: defaultColors[classes.length % defaultColors.length],
    };
    setClasses([...classes, newClass]);
    setNewClassName("");
  };

  const handleRemoveClass = (id: number) => {
    setClasses(classes.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedFile) return;
    onUpload({ file: selectedFile, name: name.trim() });
    // Reset form
    setName("");
    setFilename("");
    setSelectedFile(null);
    setClasses([{ id: 0, name: "OK", color: "#22c55e" }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Upload Model</DialogTitle>
          <DialogDescription>
            Upload an ONNX model file and define its classes
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragOver
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
            {filename ? (
              <div>
                <p className="font-medium">{filename}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click or drag to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">Drop model file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports .onnx, .pt, .tflite files
                </p>
              </div>
            )}
            <input
              type="file"
              accept=".onnx,.pt,.tflite"
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <label htmlFor="modelName" className="text-sm font-medium">
              Model Name
            </label>
            <Input
              id="modelName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter model name"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!filename || !name.trim()}>
              Upload Model
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
