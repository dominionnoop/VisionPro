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
import type { Camera, CameraProtocol, CameraMode, TriggerSource } from "@/types/vision";

interface CameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Camera>) => void;
  defaultValues?: Partial<Camera>;
  mode: "create" | "edit";
}

const protocols: CameraProtocol[] = ["HTTP"];
const cameraModes: CameraMode[] = ["auto", "snapshot"];
const triggerSources: TriggerSource[] = ["software", "hardware", "timer", "external"];

export function CameraDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  mode,
}: CameraDialogProps) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [protocol, setProtocol] = useState<CameraProtocol>(defaultValues?.protocol || "HTTP");
  const [connectionString, setConnectionString] = useState(defaultValues?.connectionString || "");
  const [cameraMode, setCameraMode] = useState<CameraMode>(defaultValues?.mode || "auto");
  const [triggerSource, setTriggerSource] = useState<TriggerSource>(defaultValues?.triggerSource || "software");
  const [triggerInterval, setTriggerInterval] = useState(defaultValues?.triggerInterval || 5000);

  // New state for devices
  const [devices, setDevices] = useState<{ label: string; deviceId: string }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [deviceError, setDeviceError] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName(defaultValues?.name || "");
      setProtocol(defaultValues?.protocol || "HTTP");
      setConnectionString(defaultValues?.connectionString || "");
      setCameraMode(defaultValues?.mode || "auto");
      setTriggerSource(defaultValues?.triggerSource || "software");
      setTriggerInterval(defaultValues?.triggerInterval || 5000);

      // Fetch devices when dialog opens
      loadDevices();
    }
  }, [open, defaultValues]);

  const loadDevices = async () => {
    setDeviceError("");
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        // Check if we are in a secure context
        if (window.isSecureContext === false) {
          setDeviceError("Camera access requires HTTPS or localhost.");
          return;
        }

        // Strategy: Try enumerating FIRST. If we get labels, we don't need to wake up the camera.
        let devices = await navigator.mediaDevices.enumerateDevices();
        let hasLabels = devices.some(d => d.kind === 'videoinput' && d.label);

        if (!hasLabels) {
          // No labels -> We probably need permission. Request it now.
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Stop immediately to release lock
            stream.getTracks().forEach(track => track.stop());

            // Re-enumerate to get labels
            devices = await navigator.mediaDevices.enumerateDevices();
          } catch (err: any) {
            // If specific camera fails (NotReadable), we MIGHT still have enumeration access if permission was granted previously.
            // We re-throw only if we really got nothing.
            if (err.name === 'NotReadableError') {
              console.warn("Got NotReadableError during permission probe. Ignoring to show device list.");
              // Retry enumeration one last time just in case
              devices = await navigator.mediaDevices.enumerateDevices();
            } else {
              throw err;
            }
          }
        }

        const videoDevices = devices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({
            label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`,
            deviceId: d.deviceId
          }));

        if (videoDevices.length === 0) {
          setDeviceError("No cameras found. Please connect a webcam.");
        }

        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Only set default if nothing selected or current selection is invalid
          if (!selectedDeviceId || !videoDevices.find(d => d.deviceId === selectedDeviceId)) {
            setSelectedDeviceId(videoDevices[0].deviceId);
          }
        }
      } else {
        setDeviceError("Camera access not supported in this browser.");
      }
    } catch (err: any) {
      console.error("Error enumerating devices:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setDeviceError("Permission denied. Please allow camera access.");
      } else if (err.name === 'NotFoundError') {
        setDeviceError("No camera hardware found.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setDeviceError(`[${err.name}] Camera is in use. Message: ${err.message}`);
      } else {
        // Show RAW error for debugging
        setDeviceError(`Unexpected Error! Name: "${err.name}" Message: "${err.message}"`);
      }
    }
  };

  // Reactive conversion: Update connection string when device or protocol changes
  useEffect(() => {
    if (protocol === "USB") {
      if (selectedDeviceId === "custom") {
        if (connectionString.includes("/api/vision/relay")) {
          setConnectionString("");
        }
      } else {
        // Auto-generate Relay URL
        if (!connectionString.includes("/api/vision/relay")) {
          const streamId = Math.random().toString(36).substring(7);
          setConnectionString(`http://localhost:8000/api/vision/relay/${streamId}`);
        }
      }
    }
  }, [selectedDeviceId, protocol]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !connectionString.trim()) return;

    // If USB is selected, we save it as HTTP protocol with the generated URL
    const finalProtocol = protocol === "USB" ? "HTTP" : protocol;

    onSubmit({
      name: name.trim(),
      protocol: finalProtocol,
      connection_string: connectionString.trim(),
      connectionString: connectionString.trim(),
      mode: cameraMode,
      triggerSource: cameraMode === "snapshot" ? triggerSource : undefined,
      triggerInterval: cameraMode === "snapshot" && triggerSource === "timer" ? triggerInterval : undefined,
    });
  };

  const getPlaceholder = () => {
    switch (protocol) {
      case "GigE":
        return "192.168.1.100";
      case "RTSP":
        return "rtsp://192.168.1.100:554/stream";
      case "HTTP":
        return "http://host.docker.internal:8000/video_feed";
      case "USB":
        return "0 (or /dev/video0)";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "Add New Camera" : "Edit Camera"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new camera connection"
              : "Update the camera configuration"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Camera Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter camera name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Protocol</label>
            <div className="flex gap-2">
              {protocols.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={protocol === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProtocol(p)}
                  className="flex-1"
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="connectionString" className="text-sm font-medium">
              {protocol === "USB" ? "Select Camera Device" : "Connection String"}
            </label>

            {protocol === "USB" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                  >
                    {devices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label} (Index: {idx})
                      </option>
                    ))}
                    <option value="custom">-- Custom Path --</option>
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={loadDevices}
                    title="Rescan Cameras"
                    className="px-3"
                  >
                    ↻
                  </Button>
                </div>

                {deviceError && (
                  <p className="text-xs text-red-500 font-medium">{deviceError}</p>
                )}

                <div className="relative">
                  <Input
                    id="connectionString"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder="0"
                    className={selectedDeviceId !== "custom" ? "bg-muted text-muted-foreground" : ""}
                    readOnly={selectedDeviceId !== "custom"}
                  />
                  {selectedDeviceId !== "custom" && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Auto-generated Relay URL (Backend Loopback)
                    </div>
                  )}
                </div>

                <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
                  <strong>Important:</strong> This uses your Browser as the camera source.
                  <ul className="mt-1 list-disc pl-4">
                    <li>This web page must remain open to stream video.</li>
                    <li>Frames are pushed to the backend for AI processing.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <Input
                  id="connectionString"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  placeholder={getPlaceholder()}
                  required={protocol !== "USB"}
                />
                <p className="text-xs text-muted-foreground">
                  {protocol === "GigE" && "Enter the IP address of the GigE camera"}
                  {protocol === "RTSP" && "Enter the RTSP URL with port and stream path"}
                  {protocol === "HTTP" && "Enter the HTTP URL for snapshot endpoint"}
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mode</label>
            <div className="flex gap-2">
              {cameraModes.map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant={cameraMode === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCameraMode(m)}
                  className="flex-1 capitalize"
                >
                  {m}
                </Button>
              ))}
            </div>
          </div>

          {cameraMode === "snapshot" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trigger Source</label>
                <div className="grid grid-cols-2 gap-2">
                  {triggerSources.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={triggerSource === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTriggerSource(t)}
                      className="capitalize"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              {triggerSource === "timer" && (
                <div className="space-y-2">
                  <label htmlFor="triggerInterval" className="text-sm font-medium">
                    Trigger Interval (ms)
                  </label>
                  <Input
                    id="triggerInterval"
                    type="number"
                    value={triggerInterval}
                    onChange={(e) => setTriggerInterval(Number(e.target.value))}
                    min={100}
                    step={100}
                  />
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {mode === "create" ? "Add Camera" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
