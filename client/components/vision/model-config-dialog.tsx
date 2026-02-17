"use client";

import React from "react"

import { useState, useEffect } from "react";
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
import { Slider } from "@/components/ui/slider";
import type { Model, ROI } from "@/types/vision";

interface ModelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model | null;
  onSave: (config: { confidence: number; roi?: ROI }) => void;
}

export function ModelConfigDialog({
  open,
  onOpenChange,
  model,
  onSave,
}: ModelConfigDialogProps) {
  const [confidence, setConfidence] = useState(0.5);
  const [iou, setIou] = useState(0.45);
  const [useROI, setUseROI] = useState(false);
  const [roi, setROI] = useState<ROI>({ x: 0, y: 0, width: 640, height: 480 });

  useEffect(() => {
    if (open && model) {
      setConfidence(model.confidence);
      setIou(0.45); // Default IOU value
      setUseROI(!!model.roi);
      setROI(model.roi || { x: 0, y: 0, width: 640, height: 480 });
    }
  }, [open, model]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      confidence,
      roi: useROI ? roi : undefined,
    });
  };

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Model Configuration
          </DialogTitle>
          <DialogDescription>
            Configure confidence threshold and ROI for {model.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Confidence Threshold */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Confidence Threshold</label>
              <span className="text-sm text-muted-foreground">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[confidence * 100]}
              onValueChange={([value]) => setConfidence(value / 100)}
              min={1}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Detections below this threshold will be filtered out
            </p>
          </div>

          {/* IOU Threshold */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">IOU Threshold</label>
              <span className="text-sm text-muted-foreground">
                {(iou * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[iou * 100]}
              onValueChange={([value]) => setIou(value / 100)}
              min={1}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Intersection over Union threshold for Non-Maximum Suppression
            </p>
          </div>

          {/* ROI Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Use Region of Interest (ROI)</label>
              <Button
                type="button"
                variant={useROI ? "default" : "outline"}
                size="sm"
                onClick={() => setUseROI(!useROI)}
              >
                {useROI ? "Enabled" : "Disabled"}
              </Button>
            </div>
            {useROI && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Click and drag on the live camera view to select ROI region
                </p>
                {roi && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Current ROI: X={roi.x}, Y={roi.y}, W={roi.width}, H={roi.height}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Configuration</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
