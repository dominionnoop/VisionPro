"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Brain, Copy } from "lucide-react";
import type { Camera, Detection, InferenceResult, Model } from "@/types/vision";
import {
  fetchInferenceDevices,
  fetchModelClasses,
  getLiveInferenceStreamUrl,
  stopLiveInferenceStream,
  type InferenceDevice,
} from "@/data/vision-api";

interface LiveMonitorProps {
  cameras: Camera[];
  models: Model[];
  initialResults: InferenceResult[];
}

type StreamClassConfig = Record<string, { visible: boolean; color: string; isDefect: boolean }>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export function LiveMonitor({ cameras, models, initialResults }: LiveMonitorProps) {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(
    cameras.find((c) => c.status === "connected") || cameras[0] || null
  );
  const [selectedModel, setSelectedModel] = useState<Model | null>(
    models.find((m) => m.status === "ready") || models[0] || null
  );
  const [isRunning, setIsRunning] = useState(false);
  const [modelOptions, setModelOptions] = useState<Model[]>(models);
  const [results, setResults] = useState<InferenceResult[]>(initialResults);
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);

  const [devices, setDevices] = useState<InferenceDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("cpu");
  const [fps, setFps] = useState<number>(10);
  const [confidence, setConfidence] = useState<number>(0.5);
  const [iouThreshold, setIouThreshold] = useState<number>(0.45);
  const [frameBuffer, setFrameBuffer] = useState<number>(3);
  const [streamConfig, setStreamConfig] = useState<StreamClassConfig>({});
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [classSearch, setClassSearch] = useState("");
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setModelOptions(models);
  }, [models]);

  useEffect(() => {
    if (!selectedCamera && cameras.length > 0) {
      setSelectedCamera(cameras.find((c) => c.status === "connected") || cameras[0]);
    }
  }, [cameras, selectedCamera]);

  useEffect(() => {
    if (!selectedModel && modelOptions.length > 0) {
      setSelectedModel(modelOptions.find((m) => m.status === "ready") || modelOptions[0]);
    }
  }, [modelOptions, selectedModel]);

  const [stats, setStats] = useState({
    totalInspections: 0,
    passCount: 0,
    failCount: 0,
    avgProcessingTime: 0,
  });

  const lastTimestampRef = useRef<string | null>(null);

  // Prevent API polling from overwriting Sliders while user is currently dragging them
  const isDraggingConfidence = useRef(false);
  const isDraggingIou = useRef(false);
  const isDraggingFrameBuffer = useRef(false);
  const isDraggingConfig = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadDevices = async () => {
      const list = await fetchInferenceDevices();
      if (!mounted) return;
      if (!list || list.length === 0) {
        setDevices([{ id: "cpu", name: "CPU", type: "cpu" }]);
        setSelectedDevice("cpu");
        return;
      }

      setDevices(list);
      const gpu = list.find((d) => d.type === "gpu");
      setSelectedDevice(gpu?.id || list[0].id);
    };

    void loadDevices();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedModel) {
      setStreamConfig({});
      return;
    }

    setStreamConfig((prev) => {
      const next: StreamClassConfig = {};
      for (const cls of selectedModel.classes || []) {
        const prevClass = prev[cls.name];
        next[cls.name] = {
          visible: prevClass?.visible ?? false,
          color: prevClass?.color || cls.color || "#00ff00",
          isDefect: prevClass?.isDefect ?? false,
        };
      }
      return next;
    });
  }, [selectedModel]);

  // Handle clicking outside the class dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false);
      }
    };

    if (isClassDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isClassDropdownOpen]);

  useEffect(() => {
    if (!selectedModel || (selectedModel.classes && selectedModel.classes.length > 0)) return;

    let mounted = true;
    const loadClasses = async () => {
      const loadedClasses = await fetchModelClasses(selectedModel.id);
      if (!mounted || !loadedClasses || loadedClasses.length === 0) return;

      setModelOptions((prev) =>
        prev.map((m) => (m.id === selectedModel.id ? { ...m, classes: loadedClasses } : m))
      );
      setSelectedModel((prev) => (prev && prev.id === selectedModel.id ? { ...prev, classes: loadedClasses } : prev));
    };

    void loadClasses();
    return () => {
      mounted = false;
    };
  }, [selectedModel]);

  const canStart = !!selectedCamera && !!selectedModel && selectedCamera.status === "connected";

  const filteredModelClasses = useMemo(() => {
    if (!selectedModel) return [];
    const q = classSearch.trim().toLowerCase();
    if (!q) return selectedModel.classes || [];
    return (selectedModel.classes || []).filter((cls) => cls.name.toLowerCase().includes(q));
  }, [selectedModel, classSearch]);

  const selectedVisibleClasses = useMemo(() => {
    if (!selectedModel) return [] as Model["classes"];
    return (selectedModel.classes || []).filter((cls) => streamConfig[cls.name]?.visible ?? false);
  }, [selectedModel, streamConfig]);

  const computedStreamUrl = useMemo(() => {
    if (!selectedCamera || !selectedModel) return "";
    const base = getLiveInferenceStreamUrl(selectedCamera.id, selectedModel.id, {
      confidence,
      iouThreshold,
      fps,
      device: selectedDevice,
    });
    return base;
  }, [selectedCamera, selectedModel, confidence, iouThreshold, fps, selectedDevice]);

  useEffect(() => {
    if (isRunning && canStart) {
      setIsStreamReady(false);
      setStreamUrl(computedStreamUrl);
      return;
    }
    setStreamUrl(null);
    setIsStreamReady(false);
  }, [isRunning, canStart, computedStreamUrl]);

  useEffect(() => {
    if (!selectedCamera || !selectedModel) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/vision/inference/live/stream/${selectedCamera.id}/${selectedModel.id}/results`,
          { cache: "no-store" }
        );
        if (!res.ok) return;

        const json = await res.json();

        // Sync Global Running State across Tabs
        if (json?.status === "active" && !isRunning) {
          setIsRunning(true);
        } else if (json?.status !== "active" && isRunning) {
          setIsRunning(false);
          setStreamUrl(null);
        }

        if (json?.status !== "active" || !json?.data) return;

        const ts = json.data.timestamp as string | null;
        if (!ts || lastTimestampRef.current === ts) return;
        lastTimestampRef.current = ts;

        const detections = (json.data.detections || []) as Detection[];
        const logEvents = (json.data.log_events || []) as Detection[];
        const processingTime = Number(json.data.inference_time_ms || 0);

        setCurrentDetections(detections);

        // Sync Stream Configuration Settings across Tabs
        if (json.data.confidence !== undefined && !isDraggingConfidence.current) setConfidence(json.data.confidence);
        if (json.data.iou !== undefined && !isDraggingIou.current) setIouThreshold(json.data.iou);
        if (json.data.frame_buffer !== undefined && !isDraggingFrameBuffer.current) setFrameBuffer(json.data.frame_buffer);
        if (json.data.config && Object.keys(json.data.config).length > 0 && !isDraggingConfig.current) {
          setStreamConfig(json.data.config);
        }

        if (logEvents.length > 0) {
          const newResult: InferenceResult = {
            id: `result-${Date.now()}`,
            timestamp: ts,
            cameraId: json.camera_id,
            modelId: json.model_id,
            imageUrl: streamUrl || "",
            detections: logEvents, // Only save new stable events to the history log
            processingTime,
          };
          setResults((prev) => [newResult, ...prev].slice(0, 50));
        }

        // Update counts and stats from Backend (Persistent Source of Truth)
        if (json.data.total_inspections !== undefined) {
          setStats((prev) => ({
            ...prev,
            totalInspections: json.data.total_inspections,
            passCount: json.data.pass_count || 0,
            failCount: json.data.fail_count || 0,
            avgProcessingTime: prev.avgProcessingTime === 0
              ? processingTime
              : (prev.avgProcessingTime * 0.9) + (processingTime * 0.1),
          }));
        } else {
          setStats((prev) => ({
            ...prev,
            avgProcessingTime: prev.avgProcessingTime === 0
              ? processingTime
              : (prev.avgProcessingTime * 0.9) + (processingTime * 0.1),
          }));
        }

        if (json.data.class_counts) {
          setClassCounts(json.data.class_counts);
        }
      } catch {
        // ignore polling errors in UI
      }
    };

    const timer = setInterval(() => {
      void poll();
    }, 500);

    return () => clearInterval(timer);
  }, [isRunning, selectedCamera, selectedModel, streamUrl]);

  const pushStreamConfig = async (
    config: StreamClassConfig,
    overrides?: { confidence?: number; iou?: number; frame_buffer?: number }
  ) => {
    if (!selectedCamera || !selectedModel || !isRunning) return;
    try {
      const payload = {
        ...config,
        confidence: overrides?.confidence ?? confidence,
        iou: overrides?.iou ?? iouThreshold,
        frame_buffer: overrides?.frame_buffer ?? frameBuffer,
      };

      console.log("Pushing Real-Time Stream Config to API:", payload);

      await fetch(`${API_BASE}/vision/inference/live/config/${selectedCamera.id}/${selectedModel.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to push stream config:", err);
    }
  };

  const updateStreamConfig = (nextConfig: StreamClassConfig | ((prev: StreamClassConfig) => StreamClassConfig)) => {
    setStreamConfig((prev) => {
      const updated = typeof nextConfig === "function" ? nextConfig(prev) : nextConfig;
      if (isRunning) {
        // use setTimeout to ensure react state commit if needed, or just push immediately
        setTimeout(() => pushStreamConfig(updated), 50);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (!isRunning || !selectedCamera || !selectedModel) return;

    // push config on start (we rely on direct calls for sliders now to avoid debounce lag)
    void pushStreamConfig(streamConfig);
  }, [isRunning, selectedCamera, selectedModel]);

  const handleStop = async () => {
    if (selectedCamera && selectedModel) {
      await stopLiveInferenceStream(selectedCamera.id, selectedModel.id);
    }
    setIsRunning(false);
    setStreamUrl(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">Camera</label>
              <select
                value={selectedCamera?.id || ""}
                onChange={(e) => setSelectedCamera(cameras.find((c) => c.id === e.target.value) || null)}
                disabled={isRunning}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id} disabled={camera.status !== "connected"}>
                    {camera.name} {camera.status !== "connected" ? "(Offline)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">Model</label>
              <select
                value={selectedModel?.id || ""}
                onChange={(e) => setSelectedModel(modelOptions.find((m) => m.id === e.target.value) || null)}
                disabled={isRunning}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id} disabled={model.status !== "ready"}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[120px]">
              <label className="text-xs text-muted-foreground block mb-1">FPS</label>
              <select
                value={String(fps)}
                onChange={(e) => setFps(Number(e.target.value))}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {[5, 10, 12, 15, 20, 30].map((f) => (
                  <option key={f} value={String(f)}>
                    {f} FPS
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[160px] flex-1">
              <label className="text-xs text-muted-foreground flex justify-between mb-2">
                <span>Confidence</span>
                <span className="font-mono">{confidence.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={confidence}
                onPointerDown={() => { isDraggingConfidence.current = true; }}
                onPointerUp={() => { isDraggingConfidence.current = false; }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setConfidence(val);
                  if (isRunning) void pushStreamConfig(streamConfig, { confidence: val });
                }}
                className="w-full accent-primary"
              />
            </div>

            <div className="min-w-[160px] flex-1">
              <label className="text-xs text-muted-foreground flex justify-between mb-2">
                <span>IoU</span>
                <span className="font-mono">{iouThreshold.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={iouThreshold}
                onPointerDown={() => { isDraggingIou.current = true; }}
                onPointerUp={() => { isDraggingIou.current = false; }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIouThreshold(val);
                  if (isRunning) void pushStreamConfig(streamConfig, { iou: val });
                }}
                className="w-full accent-primary"
              />
            </div>

            <div className="min-w-[160px] flex-1">
              <label className="text-xs text-muted-foreground flex justify-between mb-2">
                <span>Frame Buffer</span>
                <span className="font-mono">{frameBuffer}</span>
              </label>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={frameBuffer}
                onPointerDown={() => { isDraggingFrameBuffer.current = true; }}
                onPointerUp={() => { isDraggingFrameBuffer.current = false; }}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFrameBuffer(val);
                  if (isRunning) void pushStreamConfig(streamConfig, { frame_buffer: val });
                }}
                className="w-full accent-primary"
              />
            </div>

            <div className="min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">Device</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                disabled={isRunning}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Control</label>
              <div className="flex items-center gap-3">
                <Button
                  variant={isRunning ? "destructive" : "default"}
                  onClick={() => (isRunning ? void handleStop() : setIsRunning(true))}
                  disabled={!canStart}
                  className="min-w-[100px]"
                >
                  {isRunning ? "Stop" : "Start"}
                </Button>
                {!canStart && selectedCamera?.status !== "connected" && (
                  <span className="text-sm font-medium text-destructive">
                    Camera is disconnected!
                  </span>
                )}
                {!canStart && !selectedCamera && (
                  <span className="text-sm font-medium text-destructive">
                    No camera selected!
                  </span>
                )}
                {!canStart && selectedCamera?.status === "connected" && !selectedModel && (
                  <span className="text-sm font-medium text-destructive">
                    No model selected!
                  </span>
                )}
              </div>
            </div>
          </div>

          {selectedModel ? (
            <div className="mt-4 rounded-md border border-border/70 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Class / Bounding Box Settings
              </p>
              <div className="relative max-w-sm" ref={dropdownRef}>
                <Button
                  variant="outline"
                  onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                  className="w-full justify-between font-normal h-9 px-3 text-xs"
                >
                  <span>{selectedVisibleClasses.length > 0 ? `${selectedVisibleClasses.length} Classes Selected...` : "Select Classes..."}</span>
                  {isClassDropdownOpen ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
                </Button>

                {isClassDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-2 max-h-[350px] flex flex-col">
                    <input
                      type="text"
                      autoFocus
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder="Search class..."
                      className="h-8 w-full rounded-sm border border-border bg-muted/50 px-2 text-xs mb-2 shrink-0 outline-none focus:ring-1 focus:ring-primary/30"
                    />

                    {selectedModel.classes.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-1">Selected model has no class metadata.</p>
                    ) : filteredModelClasses.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-1">No class matched your search.</p>
                    ) : (
                      <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {filteredModelClasses.map((cls) => {
                          const cfg = streamConfig[cls.name] || {
                            visible: false,
                            color: cls.color || "#00ff00",
                          };

                          return (
                            <label
                              key={cls.name}
                              className="flex items-center gap-2 rounded hover:bg-muted px-2 py-1.5 cursor-pointer border border-transparent hover:border-border/50"
                            >
                              <input
                                type="checkbox"
                                checked={cfg.visible}
                                onPointerDown={() => { isDraggingConfig.current = true; }}
                                onPointerUp={() => { isDraggingConfig.current = false; }}
                                onChange={(e) => {
                                  updateStreamConfig({
                                    ...streamConfig,
                                    [cls.name]: { ...cfg, visible: e.target.checked },
                                  });
                                  isDraggingConfig.current = false;
                                }}
                                className="mr-1 accent-primary"
                              />
                              <div className="flex-1 flex items-center justify-between gap-2 overflow-hidden">
                                <span className="text-[11px] font-medium truncate">{cls.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-5 px-1.5 text-[9px] font-bold uppercase transition-colors ${cfg.isDefect
                                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                      : "bg-success/10 text-success hover:bg-success/20"
                                      }`}
                                    onPointerDown={() => { isDraggingConfig.current = true; }}
                                    onPointerUp={() => { isDraggingConfig.current = false; }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      updateStreamConfig({
                                        ...streamConfig,
                                        [cls.name]: { ...cfg, isDefect: !cfg.isDefect },
                                      });
                                      isDraggingConfig.current = false;
                                    }}
                                  >
                                    {cfg.isDefect ? "Fail" : "Pass"}
                                  </Button>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedVisibleClasses.length > 0 ? (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <p className="text-[11px] text-muted-foreground">Selected classes & color</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedVisibleClasses.map((cls) => {
                      const cfg = streamConfig[cls.name] || {
                        visible: true,
                        color: cls.color || "#00ff00",
                      };
                      return (
                        <div key={`selected-${cls.name}`} className="flex items-center gap-2 rounded border border-border/60 px-2 py-1.5">
                          <span className="h-3 w-8 rounded-sm shrink-0" style={{ backgroundColor: cfg.color }} />
                          <div className="flex-1 flex items-center justify-between gap-1 overflow-hidden">
                            <span className="text-xs truncate">{cls.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge
                                variant="outline"
                                className={`h-4 px-1 text-[9px] font-bold leading-none ${cfg.isDefect ? "border-destructive text-destructive" : "border-success text-success"
                                  }`}
                              >
                                {cfg.isDefect ? "FAIL" : "PASS"}
                              </Badge>
                            </div>
                          </div>
                          <input
                            type="color"
                            value={cfg.color}
                            onPointerDown={() => { isDraggingConfig.current = true; }}
                            onPointerUp={() => { isDraggingConfig.current = false; }}
                            onChange={(e) => {
                              updateStreamConfig({
                                ...streamConfig,
                                [cls.name]: { ...cfg, color: e.target.value },
                              });
                            }}
                            className="h-7 w-9 rounded border border-border/60 bg-background p-0 cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Inspections</p><p className="text-2xl font-display">{stats.totalInspections}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pass</p><p className="text-2xl font-display text-success">{stats.passCount}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fail</p><p className="text-2xl font-display text-destructive">{stats.failCount}</p></CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Processing Time</p><p className="text-2xl font-display">{stats.avgProcessingTime.toFixed(1)} ms</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              Live View
              {isRunning ? (
                <span className="flex items-center gap-1 text-xs font-normal text-success">
                  <span className="size-2 rounded-full bg-success animate-pulse" />Running
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-muted/50 rounded-xl overflow-hidden">
              {isRunning && streamUrl ? (
                <>
                  {!isStreamReady && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm text-primary">
                      <div className="relative w-20 h-20 mb-6 flex items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-background/50">
                        <Brain className="w-10 h-10 text-primary/50 animate-pulse" />
                        <div className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_3px_rgba(var(--primary),0.8)] animate-scan" />
                      </div>
                      <h3 className="text-lg font-semibold animate-pulse tracking-wide">Waiting for Inference...</h3>
                      <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">Loading Model & Connection</p>
                    </div>
                  )}
                  <img
                    src={streamUrl}
                    alt="Live inference stream"
                    className="w-full h-full object-fill"
                    onLoad={() => setIsStreamReady(true)}
                  />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white">Click Start to begin inspection</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border/50 flex-1">
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
                      className={`p-2 rounded-lg text-xs ${hasDefect ? "bg-destructive/10 border border-destructive/30" : "bg-success/10 border border-success/30"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{new Date(result.timestamp).toLocaleTimeString()}</span>
                        <Badge variant="outline" className={hasDefect ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}>
                          {hasDefect ? "FAIL" : "PASS"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{result.processingTime}ms • {result.detections.length} objs</p>
                      {result.detections.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {result.detections.slice(0, 4).map((detection, idx) => {
                            const cfg = streamConfig[detection.className];
                            const color = cfg?.color || detection.color || "#22c55e";
                            return (
                              <span
                                key={`${result.id}-${idx}`}
                                className="inline-flex items-center rounded border px-1.5 py-0.5"
                                style={{ borderColor: color, color }}
                              >
                                {detection.className} {(detection.confidence * 100).toFixed(0)}%
                              </span>
                            );
                          })}
                          {result.detections.length > 4 ? (
                            <span className="text-muted-foreground">+{result.detections.length - 4} more</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {results.length === 0 ? <p className="text-center text-muted-foreground py-8">No results yet</p> : null}
              </div>
              {isRunning ? (
                <div className="pt-3 text-xs text-muted-foreground">
                  Active detections: {currentDetections.length}
                </div>
              ) : null}
            </CardContent>
          </Card>


        </div>
      </div>
    </div>
  );
}

