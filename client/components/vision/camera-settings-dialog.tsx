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
import { Slider } from "@/components/ui/slider";
import type { Camera, CameraSettings } from "@/types/vision";

interface CameraSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: Camera | null;
  onSave: (settings: CameraSettings) => void;
}

const resolutionPresets = [
  { label: "4K", value: "3840x2160" },
  { label: "1080p", value: "1920x1080" },
  { label: "720p", value: "1280x720" },
  { label: "VGA", value: "640x480" },
];

export function CameraSettingsDialog({
  open,
  onOpenChange,
  camera,
  onSave,
}: CameraSettingsDialogProps) {
  const [settings, setSettings] = useState<CameraSettings>({
    resolution: "1920x1080",
    fps: 30,
    exposure: 10000,
    gain: 1.0,
  });

  useEffect(() => {
    if (open && camera) {
      setSettings(camera.settings);
    }
  }, [open, camera]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  if (!camera) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Camera Settings - {camera.name}
          </DialogTitle>
          <DialogDescription>
            Adjust resolution, frame rate, and image parameters
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resolution */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Resolution</label>
            <div className="flex flex-wrap gap-2">
              {resolutionPresets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant={
                    settings.resolution === preset.value
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({ ...settings, resolution: preset.value })
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Current: {settings.resolution || "1920x1080"}
            </p>
          </div>

          {/* Frame Rate */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Frame Rate</label>
              <span className="text-sm text-muted-foreground">
                {settings.fps || 30} FPS
              </span>
            </div>
            <Slider
              value={[settings.fps || 30]}
              onValueChange={([value]) =>
                setSettings({ ...settings, fps: value })
              }
              min={1}
              max={120}
              step={1}
            />
          </div>

          {/* Exposure */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Exposure</label>
              <span className="text-sm text-muted-foreground">
                {settings.exposure || 10000} μs
              </span>
            </div>
            <Slider
              value={[settings.exposure || 10000]}
              onValueChange={([value]) =>
                setSettings({ ...settings, exposure: value })
              }
              min={100}
              max={100000}
              step={100}
            />
          </div>

          {/* Gain */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Gain</label>
              <span className="text-sm text-muted-foreground">
                {(settings.gain || 1.0).toFixed(1)}x
              </span>
            </div>
            <Slider
              value={[(settings.gain || 1.0) * 10]}
              onValueChange={([value]) =>
                setSettings({ ...settings, gain: value / 10 })
              }
              min={1}
              max={100}
              step={1}
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
            <Button type="submit">Save Settings</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
