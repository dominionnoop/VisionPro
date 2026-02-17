"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Model, Detection, Camera } from "@/types/vision";
import Image from "next/image";

interface ModelTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model | null;
  cameras?: Camera[];
}

// Mock detection results
const generateMockDetections = (model: Model): Detection[] => {
  const numDetections = Math.floor(Math.random() * 4) + 1;
  return Array.from({ length: numDetections }, (_, i) => {
    const cls = model.classes[Math.floor(Math.random() * model.classes.length)];
    return {
      classId: cls.id,
      className: cls.name,
      confidence: Math.random() * 0.3 + 0.7,
      boundingBox: {
        x: Math.floor(Math.random() * 200) + 50,
        y: Math.floor(Math.random() * 150) + 50,
        width: Math.floor(Math.random() * 100) + 80,
        height: Math.floor(Math.random() * 80) + 60,
      },
      color: cls.color,
    };
  });
};

export function ModelTestDialog({
  open,
  onOpenChange,
  model,
  cameras = [],
}: ModelTestDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [processingTime, setProcessingTime] = useState(0);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [resultMedia, setResultMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [testSource, setTestSource] = useState<"upload" | "camera">("upload");
  const [confidence, setConfidence] = useState(0.5);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleRunInference = async () => {
    if (!model || !uploadedFile) return;
    setIsProcessing(true);
    setDetections([]);
    setResultMedia(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', uploadedFile);
      formData.append('confidence', confidence.toString());
      formData.append('iou_threshold', '0.45');

      // Call real API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/vision/models/${model.id}/test`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Inference failed');
      }

      const result = await response.json();

      // Set result media from API (persistent URL)
      if (result.output_url) {
        // Fix: Use origin because result.output_url includes /media/ (mounted at root)
        // whereas NEXT_PUBLIC_API_URL includes /api/
        const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
        const fullUrl = `${apiUrl.origin}${result.output_url}`;

        setResultMedia({
          url: fullUrl,
          type: result.type || 'image'
        });
      } else {
        console.warn("No output_url in result");
      }

      // Convert API response to Detection format
      // Convert API response to Detection format
      const apiDetections = (result.detections || []).map((det: any) => ({
        classId: det.class_id,
        className: det.class_name,
        confidence: det.confidence,
        boundingBox: {
          x: det.bbox?.x ?? 0,
          y: det.bbox?.y ?? 0,
          width: det.bbox?.width ?? 0,
          height: det.bbox?.height ?? 0,
        },
        color: model.classes.find((c) => c.id === det.class_id)?.color || '#00D4FF',
      }));

      setDetections(apiDetections);
      setProcessingTime(result.inference_time);

    } catch (error) {
      console.error('Inference error:', error);
      alert('Failed to run inference. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (file: File | null) => {
    if (file) {
      setUploadedFile(file);
      setResultMedia(null); // Clear previous result

      const reader = new FileReader();
      reader.onload = (e) => {
        setTestImage(e.target?.result as string);
        setDetections([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    // Not implemented for video yet
    if (!selectedCamera) return;
    setTestImage("/assets/pc_blueprint.gif");
    setDetections([]);
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Test Model - {model.name}
          </DialogTitle>
          <DialogDescription>
            Upload an image or video to test the model
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          {/* Source Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={testSource === "upload" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTestSource("upload");
                setTestImage(null);
                setResultMedia(null);
                setDetections([]);
              }}
              className="flex-1"
            >
              Upload File
            </Button>
            <Button
              type="button"
              variant={testSource === "camera" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTestSource("camera");
                setTestImage(null);
                setResultMedia(null);
                setDetections([]);
              }}
              className="flex-1"
              disabled={cameras.length === 0}
            >
              Use Camera
            </Button>
          </div>

          {/* Camera Selection */}
          {testSource === "camera" && cameras.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Camera to Test</label>
              <div className="flex flex-wrap gap-2">
                {cameras.map((camera) => (
                  <Button
                    key={camera.id}
                    variant={selectedCamera?.id === camera.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCamera(camera);
                      setResultMedia(null);
                      setDetections([]);
                    }}
                    disabled={camera.status !== "connected"}
                  >
                    {camera.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Preview Area */}
          <div
            className="relative bg-muted/50 rounded-xl overflow-hidden border border-border min-h-[300px] flex items-center justify-center bg-black/5"
          >
            {resultMedia ? (
              // Show Result (Server generated)
              resultMedia.type === 'video' ? (
                <video
                  src={resultMedia.url}
                  controls
                  className="max-h-[60vh] w-auto h-auto"
                />
              ) : (
                <img
                  src={resultMedia.url}
                  alt="Inference result"
                  className="max-h-[60vh] w-auto h-auto object-contain"
                />
              )
            ) : selectedCamera ? (
              // Show Live Camera Stream
              (() => {
                let displayUrl = selectedCamera.connection_string;
                // Auto-Proxy for docker host
                if (displayUrl.includes("host.docker.internal") || displayUrl.includes("172.")) {
                  displayUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/vision/proxy/${selectedCamera.id}`;
                }
                // Append timestamp
                const streamUrl = `${displayUrl}${displayUrl.includes("?") ? "&" : "?"}_t=${Date.now()}`;

                return (
                  <img
                    src={streamUrl}
                    alt="Camera Stream"
                    className="max-h-[60vh] w-full h-full object-contain"
                  />
                );
              })()
            ) : testImage ? (
              // Show Preview (Input) - Legacy or fallback
              uploadedFile?.type.startsWith('video/') ? (
                <video
                  src={testImage}
                  controls
                  className="max-h-[60vh] w-auto h-auto"
                />
              ) : (
                <img
                  src={testImage}
                  alt="Test image"
                  className="max-h-[60vh] w-auto h-auto object-contain"
                />
              )
            ) : (
              // Empty State
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <p className="text-lg">
                  {testSource === 'camera' ? 'Select a camera below' : 'Upload an image below'}
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {testSource === "upload" ? (
              <div className="relative flex-1">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
                />
                <Button variant="outline" className="w-full bg-transparent">
                  Upload Image/Video
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCameraCapture}
                disabled={!selectedCamera || selectedCamera.status !== "connected"}
                title="Capture feature coming soon"
              >
                Capture Frame (Coming Soon)
              </Button>
            )}

            <Button
              onClick={handleRunInference}
              disabled={!uploadedFile || isProcessing}
            >
              {isProcessing ? "Processing..." : "Run Inference"}
            </Button>
          </div>

          {/* Results Summary */}
          {detections.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Detection Results (Updated)</span>
                <span className="text-muted-foreground">
                  Processing time: {processingTime}ms
                </span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {detections.map((detection, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      backgroundColor: `${detection.color}10`,
                      border: `1px solid ${detection.color}30`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: detection.color }}
                      />
                      <span className="font-medium">{detection.className}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-col items-end">
                      <span className="font-mono font-bold">
                        {(detection.confidence * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs opacity-75">
                        Result: {detection.className}
                      </span>
                      <span className="text-xs font-mono mt-1">
                        Box: [{detection.boundingBox.x}, {detection.boundingBox.y}, {detection.boundingBox.width}, {detection.boundingBox.height}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
