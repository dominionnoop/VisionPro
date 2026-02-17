"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import type { Camera, Model, Device } from "@/types/api";
import api from "@/lib/api";

interface Detection {
  classId: number;
  className: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
}

interface InferenceResult {
  id: string;
  timestamp: string;
  cameraId: string;
  modelId: string;
  detections: Detection[];
  processingTime: number;
}

interface LiveMonitorProps {
  cameras: Camera[];
  models: Model[];
}

export function LiveMonitor({ cameras, models }: LiveMonitorProps) {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(
    cameras.find((c) => c.status === "connected") || cameras[0] || null
  );
  const [selectedModels, setSelectedModels] = useState<Model[]>(
    models.filter((m) => m.status === "ready").slice(0, 1)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<InferenceResult[]>([]);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [fps, setFps] = useState(10); // Default 10 FPS
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("cpu"); // Default ID
  const [stats, setStats] = useState({
    totalInspections: 0,
    passCount: 0,
    failCount: 0,
    avgProcessingTime: 0,
  });

  // Dynamic Stream Configuration
  const [streamConfig, setStreamConfig] = useState<Record<string, { visible: boolean; color: string }>>({});

  // Initialize config when model changes
  useEffect(() => {
    if (selectedModels.length > 0 && selectedModels[0].classes) {
      const initialConfig: Record<string, { visible: boolean; color: string }> = {};
      selectedModels[0].classes.forEach(c => {
        initialConfig[c.name] = { visible: true, color: c.color || '#00FF00' };
      });
      setStreamConfig(initialConfig);
    }
  }, [selectedModels]);

  const updateStreamConfig = async (newConfig: typeof streamConfig) => {
    setStreamConfig(newConfig);
    if (isRunning && selectedCamera && selectedModels.length > 0) {
      try {
        await fetch(`/api/vision/inference/live/config/${selectedCamera.id}/${selectedModels[0].id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig)
        });
      } catch (e) {
        console.error("Failed to update stream config:", e);
      }
    }
  };

  // Refs for stream and canvas
  const videoRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to get stream URL
  const getStreamUrl = (camera: Camera | null) => {
    if (!camera) return "";
    // Use backend proxy for camera streams
    return `/api/vision/cameras/${camera.id}/stream`;
  };


  // Helper to get inference stream URL
  const getInferenceStreamUrl = () => {
    if (!selectedCamera || selectedModels.length === 0) return "";
    const model = selectedModels[0];
    // Use relative path to leverage Next.js proxy (which handles Docker network correctly)
    const url = `/api/vision/inference/live/stream/${selectedCamera.id}/${model.id}?confidence=0.5&iou_threshold=0.45&fps=${fps}&device=${encodeURIComponent(selectedDevice)}`;
    console.log('🔗 Generated URL:', url);
    return url;
  }

  // Update stream URL when running state or selections change
  useEffect(() => {
    if (isRunning && selectedCamera && selectedModels.length > 0) {
      setAnnotatedImageUrl(getInferenceStreamUrl());
    } else {
      // Force cleanup: set to empty string first, then null
      setAnnotatedImageUrl("");
      setTimeout(() => setAnnotatedImageUrl(null), 100);
    }
  }, [isRunning, selectedCamera, selectedModels, fps, selectedDevice]);

  // Poll for detection data to update stats and results
  useEffect(() => {
    // 1. Check status on selection change (Auto-Sync)
    const checkStatus = async () => {
      if (!selectedCamera || selectedModels.length === 0) return;
      const model = selectedModels[0];
      try {
        const response = await fetch(`/api/vision/inference/live/stream/${selectedCamera.id}/${model.id}/results`);
        if (response.ok) {
          const data = await response.json();
          // If backend says active, sync UI to running
          if (data.status === "active" && !isRunning) {
            setIsRunning(true);
          }
          // If backend says stopped/inactive, sync UI to stopped (optional, maybe user just stopped it)
          // But don't force stop if we just started it? 
          // Better usage: only sync "active" -> "running"
        }
      } catch (e) {
        console.error("Status check failed", e);
      }
    };
    checkStatus();

    if (!isRunning || !selectedCamera || selectedModels.length === 0) return;

    const pollDetections = async () => {
      try {
        const model = selectedModels[0];
        const response = await fetch(`/api/vision/inference/live/stream/${selectedCamera.id}/${model.id}/results`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Polling failed:", response.status, response.statusText, errorText);
          return;
        }

        const resultJson = await response.json();
        console.log("Poll Result:", resultJson); // DEBUG LOG

        if (resultJson.status === "active" && resultJson.data) {
          const data = resultJson.data;

          // Update detections
          setCurrentDetections(data.detections);

          // Create result record
          const newResult: InferenceResult = {
            id: `result-${Date.now()}`,
            timestamp: data.timestamp,
            cameraId: resultJson.camera_id,
            modelId: resultJson.model_id,
            detections: data.detections,
            processingTime: data.inference_time_ms || 0,
          };

          // Update results list
          // Only log if there are detections (Prevent spamming PASS on empty frames)
          if (data.detections.length > 0) {
            setResults((prev) => {
              // Avoid duplicates based on timestamp
              const isDuplicate = prev.length > 0 && prev[0].timestamp === data.timestamp;
              if (isDuplicate) return prev;
              return [newResult, ...prev].slice(0, 50);
            });
          }

          // Update stats
          setStats((prev) => {
            const hasDefect = data.detections.some((d: Detection) => {
              // Assuming defect logic: non-OK or explicit 'defect' class
              return d.className.toLowerCase() !== "ok";
            });
            const totalInspections = prev.totalInspections + 1;
            const passCount = hasDefect ? prev.passCount : prev.passCount + 1;
            const failCount = hasDefect ? prev.failCount + 1 : prev.failCount;

            return {
              totalInspections,
              passCount,
              failCount,
              avgProcessingTime: (prev.avgProcessingTime * prev.totalInspections + (data.inference_time_ms || 0)) / (prev.totalInspections + 1)
            };
          });
        }
      } catch (error) {
        console.error("Failed to poll detections:", error);
      }
    };

    // Poll every 500ms
    const interval = setInterval(pollDetections, 500);
    return () => clearInterval(interval);
  }, [isRunning, selectedCamera, selectedModels]);

  // Fetch devices on mount
  useEffect(() => {
    const checkActiveStream = async () => {
      try {
        const response = await fetch("/api/vision/inference/live/detections");
        if (response.ok) {
          const data = await response.json();
          if (data.status === "ok" && data.camera_id && data.model_id) {
            console.log("🔄 Found active stream, syncing state...", data);

            const activeCam = cameras.find(c => c.id === data.camera_id);
            const activeModel = models.find(m => m.id === data.model_id);

            if (activeCam && activeModel) {
              // Only update if not already running matching stream
              if (!isRunning || selectedCamera?.id !== activeCam.id) {
                setSelectedCamera(activeCam);
                setSelectedModels([activeModel]);
                setIsRunning(true);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to check active stream:", error);
      }
    };

    const fetchDevices = async () => {
      try {
        const devicesData = await api.devices.list();
        setDevices(devicesData);
        // Default to first GPU if available
        const gpu = devicesData.find(d => d.type === 'gpu');
        if (gpu) {
          setSelectedDevice(gpu.id);
        } else if (devicesData.length > 0) {
          setSelectedDevice(devicesData[0].id);
        }

        // Check for active stream on mount
        await checkActiveStream();

      } catch (error) {
        console.error("Failed to fetch devices:", error);
      }
    };
    fetchDevices();

    // Re-check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkActiveStream();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cameras, models, isRunning, selectedCamera]); // Add deps to effect

  const toggleModel = (model: Model) => {
    setSelectedModels((prev) => {
      const isSelected = prev.some((m) => m.id === model.id);
      if (isSelected) {
        // Remove model
        return prev.filter((m) => m.id !== model.id);
      } else {
        // Add model
        return [...prev, model];
      }
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Camera Selection */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">
                Camera
              </label>
              <Select
                value={selectedCamera?.id}
                onValueChange={(id) => {
                  const cam = cameras.find(c => c.id === id);
                  if (cam) setSelectedCamera(cam);
                }}
                disabled={isRunning}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem
                      key={camera.id}
                      value={camera.id}
                      disabled={camera.status !== "connected"}
                    >
                      {camera.name}
                      {camera.status !== "connected" && " (Offline)"}
                    </SelectItem>
                  ))}
                  {cameras.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">No cameras available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">
                Model
              </label>
              <Select
                value={selectedModels[0]?.id}
                onValueChange={(id) => {
                  const model = models.find(m => m.id === id);
                  if (model) setSelectedModels([model]);
                }}
                disabled={isRunning}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      disabled={model.status !== "ready"}
                    >
                      {model.name}
                    </SelectItem>
                  ))}
                  {models.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">No models available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* FPS Selection */}
            <div className="min-w-[120px]">
              <label className="text-xs text-muted-foreground block mb-1">
                Frame Rate
              </label>
              <Select
                value={fps.toString()}
                onValueChange={(val) => setFps(parseInt(val))}
                disabled={isRunning}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="FPS" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30].map((f) => (
                    <SelectItem key={f} value={f.toString()}>
                      {f} FPS
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Device Selection */}
            <div className="min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">
                Device
              </label>
              <Select
                value={selectedDevice}
                onValueChange={setSelectedDevice}
                disabled={isRunning}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} <span className="text-muted-foreground text-xs ml-2">({d.type.toUpperCase()})</span>
                    </SelectItem>
                  ))}
                  {devices.length === 0 && (
                    <SelectItem value="cpu">CPU (Default)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Start/Stop & Settings */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-1">
                  Control
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={isRunning ? "destructive" : "default"}
                    onClick={async () => {
                      if (isRunning) {
                        try {
                          const model = selectedModels[0];
                          await fetch(`/api/vision/inference/live/stop/${selectedCamera?.id}/${model.id}`, { method: 'POST' });
                        } catch (e) { console.error(e); }
                        setIsRunning(false);
                      } else {
                        setIsRunning(true);
                      }
                    }}
                    disabled={!selectedCamera || selectedModels.length === 0}
                    className="min-w-[100px]"
                  >
                    {isRunning ? "Stop" : "Start"}
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" disabled={!selectedCamera || selectedModels.length === 0}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">Stream Settings</h4>
                          <p className="text-sm text-muted-foreground">
                            Customize class visibility and colors.
                          </p>
                        </div>
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                          {Object.entries(streamConfig).map(([className, config]) => (
                            <div key={className} className="flex items-center justify-between space-x-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`show-${className}`}
                                  checked={config.visible}
                                  onCheckedChange={(checked: boolean | "indeterminate") => {
                                    const newConfig = { ...streamConfig, [className]: { ...config, visible: !!checked } };
                                    updateStreamConfig(newConfig);
                                  }}
                                />
                                <Label htmlFor={`show-${className}`}>{className}</Label>
                              </div>
                              <Input
                                type="color"
                                value={config.color}
                                className="w-12 h-8 p-1"
                                onChange={(e) => {
                                  const newConfig = { ...streamConfig, [className]: { ...config, color: e.target.value } };
                                  updateStreamConfig(newConfig);
                                }}
                              />
                            </div>
                          ))}
                          {Object.keys(streamConfig).length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-4">
                              No classes found for this model.
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Inspections</p>
            <p className="text-2xl font-display">{stats.totalInspections}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pass</p>
            <p className="text-2xl font-display text-success">{stats.passCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fail</p>
            <p className="text-2xl font-display text-destructive">
              {stats.failCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Processing Time</p>
            <p className="text-2xl font-display">
              {stats.avgProcessingTime.toFixed(1)} ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live View */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              Live View
              {isRunning && (
                <span className="flex items-center gap-1 text-xs font-normal text-success">
                  <span className="size-2 rounded-full bg-success animate-pulse" />
                  Running
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-muted/50 rounded-xl overflow-hidden">
              {isRunning && annotatedImageUrl ? (
                // Show MJPEG stream with bounding boxes
                <img
                  src={annotatedImageUrl}
                  alt="Live inference stream"
                  className="w-full h-full object-fill"
                  onLoad={() => console.log('✅ Stream loaded:', annotatedImageUrl)}
                  onError={(e) => console.error('❌ Stream error:', annotatedImageUrl, e)}
                />
              ) : isRunning && selectedCamera ? (
                // Show camera stream while waiting for first inference
                <img
                  ref={videoRef}
                  src={getStreamUrl(selectedCamera)}
                  alt="Live camera feed"
                  className="w-full h-full object-contain"
                />
              ) : (
                // Show GIF preview when not running
                <img
                  src="/assets/pc_blueprint.gif"
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
              {!isRunning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white">Click Start to begin inspection</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Log */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Results Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.slice(0, 20).map((result) => {
                const hasDefect = result.detections.some((d) => d.classId !== 0);
                return (
                  <div
                    key={result.id}
                    className={`p-2 rounded-lg text-xs ${hasDefect
                      ? "bg-destructive/10 border border-destructive/30"
                      : "bg-success/10 border border-success/30"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {formatTime(result.timestamp)}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          hasDefect
                            ? "bg-destructive/20 text-destructive"
                            : "bg-success/20 text-success"
                        }
                      >
                        {hasDefect ? "FAIL" : "PASS"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.detections.map((d, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{
                            backgroundColor: `${d.color}20`,
                            color: d.color,
                          }}
                        >
                          {d.className}
                        </span>
                      ))}
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {result.processingTime}ms
                    </p>
                  </div>
                );
              })}
              {results.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No results yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
