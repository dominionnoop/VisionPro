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
import type { Camera, CameraSettings } from "@/types/vision";

interface CameraSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: Camera | null;
  onSave: (settings: CameraSettings) => void;
}

const resolutionPresets = [
  { label: "4K", width: 3840, height: 2160 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "720p", width: 1280, height: 720 },
  { label: "VGA", width: 640, height: 480 },
  { label: "Custom", width: 0, height: 0 },
];

export function CameraSettingsDialog({
  open,
  onOpenChange,
  camera,
  onSave,
}: CameraSettingsDialogProps) {
  const [settings, setSettings] = useState<CameraSettings>({
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    exposure: 10000,
    gain: 1.0,
    brightness: 50,
    contrast: 50,
    saturation: 50,
  });
  const [customResolution, setCustomResolution] = useState(false);

  useEffect(() => {
    if (open && camera) {
      setSettings(camera.settings);
      const isPreset = resolutionPresets.some(
        (p) =>
          p.width === camera.settings.resolution.width &&
          p.height === camera.settings.resolution.height
      );
      setCustomResolution(!isPreset);
    }
  }, [open, camera]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  const handleResolutionPreset = (preset: (typeof resolutionPresets)[0]) => {
    if (preset.label === "Custom") {
      setCustomResolution(true);
    } else {
      setCustomResolution(false);
      setSettings({
        ...settings,
        resolution: { width: preset.width, height: preset.height },
      });
    }
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
                    (!customResolution &&
                      settings.resolution.width === preset.width &&
                      settings.resolution.height === preset.height) ||
                    (customResolution && preset.label === "Custom")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleResolutionPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {customResolution && (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={settings.resolution.width}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      resolution: {
                        ...settings.resolution,
                        width: Number(e.target.value),
                      },
                    })
                  }
                  placeholder="Width"
                  className="w-24"
                />
                <span className="text-muted-foreground">x</span>
                <Input
                  type="number"
                  value={settings.resolution.height}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      resolution: {
                        ...settings.resolution,
                        height: Number(e.target.value),
                      },
                    })
                  }
                  placeholder="Height"
                  className="w-24"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Current: {settings.resolution.width}x{settings.resolution.height}
            </p>
          </div>

          {/* Frame Rate */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Frame Rate</label>
              <span className="text-sm text-muted-foreground">
                {settings.frameRate} FPS
              </span>
            </div>
            <Slider
              value={[settings.frameRate]}
              onValueChange={([value]) =>
                setSettings({ ...settings, frameRate: value })
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
                {settings.exposure} μs
              </span>
            </div>
            <Slider
              value={[settings.exposure]}
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
                {settings.gain.toFixed(1)}x
              </span>
            </div>
            <Slider
              value={[settings.gain * 10]}
              onValueChange={([value]) =>
                setSettings({ ...settings, gain: value / 10 })
              }
              min={1}
              max={100}
              step={1}
            />
          </div>

          {/* Brightness */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Brightness</label>
              <span className="text-sm text-muted-foreground">
                {settings.brightness}%
              </span>
            </div>
            <Slider
              value={[settings.brightness]}
              onValueChange={([value]) =>
                setSettings({ ...settings, brightness: value })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Contrast */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Contrast</label>
              <span className="text-sm text-muted-foreground">
                {settings.contrast}%
              </span>
            </div>
            <Slider
              value={[settings.contrast]}
              onValueChange={([value]) =>
                setSettings({ ...settings, contrast: value })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Saturation */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Saturation</label>
              <span className="text-sm text-muted-foreground">
                {settings.saturation}%
              </span>
            </div>
            <Slider
              value={[settings.saturation]}
              onValueChange={([value]) =>
                setSettings({ ...settings, saturation: value })
              }
              min={0}
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
