"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Model, Detection, Camera } from "@/types/vision";
import {
  closeLiveInferenceWebRTCPeer,
  createLiveInferenceWebRTCOffer,
  fetchCameras,
  fetchInferenceDevices,
  getCameraSnapshotUrl,
  resolveMediaUrl,
  stopLiveInferenceStream,
  testModelFromCameraId,
  testModelFromMediaPath,
  uploadInputMedia,
  type InferenceDevice,
} from "@/data/vision-api";

interface ModelTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: Model | null;
  cameras?: Camera[];
}

export function ModelTestDialog({
  open,
  onOpenChange,
  model,
  cameras = [],
}: ModelTestDialogProps) {
  const [runtimeCameras, setRuntimeCameras] = useState<Camera[]>(cameras);

  const cameraOptions = runtimeCameras.filter(
    (camera) => camera.protocol === "HTTP" || camera.protocol === "USB"
  );
  const connectedCameraOptions = cameraOptions.filter((camera) => camera.status === "connected");
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [processingTime, setProcessingTime] = useState(0);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedMediaPath, setUploadedMediaPath] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [testSource, setTestSource] = useState<"upload" | "camera">("upload");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<InferenceDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("cpu");
  const [liveConfidence, setLiveConfidence] = useState<number>(0.5);
  const [liveIouThreshold, setLiveIouThreshold] = useState<number>(0.45);
  const [liveFps, setLiveFps] = useState<number>(10);
  const [isWebRTCConnecting, setIsWebRTCConnecting] = useState(false);
  const [webrtcPeerId, setWebrtcPeerId] = useState<string | null>(null);
  const webrtcPeerRef = useRef<RTCPeerConnection | null>(null);
  const webrtcVideoRef = useRef<HTMLVideoElement | null>(null);
  const [liveStreamTarget, setLiveStreamTarget] = useState<{ cameraId: string; modelId: string } | null>(null);
  const isCameraStreaming =
    !!liveStreamTarget &&
    !!selectedCamera &&
    !!model &&
    liveStreamTarget.cameraId === selectedCamera.id &&
    liveStreamTarget.modelId === model.id;

  useEffect(() => {
    setRuntimeCameras(cameras);
  }, [cameras]);

  const refreshCameraAvailability = async () => {
    const latest = await fetchCameras();
    if (latest) {
      setRuntimeCameras(latest);
    }
  };

  useEffect(() => {
    if (!open) return;

    const loadDevices = async () => {
      const res = await fetchInferenceDevices();
      if (!res || res.length === 0) {
        setDevices([{ id: "cpu", name: "CPU", type: "cpu" }]);
        setSelectedDevice("cpu");
        return;
      }

      setDevices(res);
      setSelectedDevice((prev) => {
        const exists = res.some((d) => d.id === prev);
        if (exists) return prev;
        return res[0].id;
      });
    };

    void loadDevices();
  }, [open]);

  useEffect(() => {
    if (!open || !model) return;
    setLiveConfidence(model.confidence ?? 0.5);
    setLiveIouThreshold(0.45);
    setLiveFps(10);
  }, [open, model]);

  useEffect(() => {
    if (!open || testSource !== "camera") return;
    void refreshCameraAvailability();
  }, [open, testSource]);

  useEffect(() => {
    if (testSource !== "camera") return;
    if (connectedCameraOptions.length === 0) {
      setSelectedCamera(null);
      return;
    }

    if (!selectedCamera || !connectedCameraOptions.some((c) => c.id === selectedCamera.id)) {
      setSelectedCamera(connectedCameraOptions[0]);
    }
  }, [connectedCameraOptions, selectedCamera, testSource]);

  useEffect(() => {
    if (testSource !== "camera" || !selectedCamera) return;

    setResultImage(null);
    setDetections([]);
    setCameraError(null);

    if (selectedCamera.protocol === "HTTP") {
      const separator = selectedCamera.connectionString.includes("?") ? "&" : "?";
      setTestImage(`${selectedCamera.connectionString}${separator}t=${Date.now()}`);
      return;
    }

    setTestImage(getCameraSnapshotUrl(selectedCamera.id));
  }, [selectedCamera, testSource]);

  const handleRunInference = async () => {
    if (!model) return;
    if (testSource === "upload" && !uploadedMediaPath) return;
    if (testSource === "camera" && !selectedCamera) return;

    if (testSource === "camera" && selectedCamera?.status !== "connected") {
      setCameraError("Selected camera is disconnected. Please choose a connected camera.");
      return;
    }

    if (testSource === "camera" && selectedCamera) {
      if (
        liveStreamTarget &&
        (liveStreamTarget.cameraId !== selectedCamera.id || liveStreamTarget.modelId !== model.id)
      ) {
        await stopLiveIfRunning();
      }

      const closeLocalPeer = () => {
        if (webrtcVideoRef.current) {
          webrtcVideoRef.current.srcObject = null;
        }
        if (webrtcPeerRef.current) {
          webrtcPeerRef.current.ontrack = null;
          webrtcPeerRef.current.onicecandidate = null;
          webrtcPeerRef.current.onicegatheringstatechange = null;
          webrtcPeerRef.current.close();
          webrtcPeerRef.current = null;
        }
      };

      const waitForIceGathering = async (pc: RTCPeerConnection, timeoutMs = 2000) =>
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") {
            resolve();
            return;
          }

          const done = () => {
            pc.removeEventListener("icegatheringstatechange", onStateChange);
            resolve();
          };

          const onStateChange = () => {
            if (pc.iceGatheringState === "complete") {
              done();
            }
          };

          pc.addEventListener("icegatheringstatechange", onStateChange);
          setTimeout(done, timeoutMs);
        });

      try {
        setIsWebRTCConnecting(true);
        setCameraError(null);

        closeLocalPeer();

        const pc = new RTCPeerConnection();
        const transceiver = pc.addTransceiver("video", { direction: "recvonly" });

        const caps = RTCRtpReceiver.getCapabilities("video");
        const h264Codecs = (caps?.codecs || []).filter((c) => c.mimeType.toLowerCase() === "video/h264");
        if (h264Codecs.length > 0) {
          transceiver.setCodecPreferences(h264Codecs);
        }

        pc.ontrack = (event) => {
          if (webrtcVideoRef.current && event.streams[0]) {
            webrtcVideoRef.current.srcObject = event.streams[0];
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);

        const localDesc = pc.localDescription;
        if (!localDesc?.sdp) {
          throw new Error("Failed to create local WebRTC offer");
        }

        const answer = await createLiveInferenceWebRTCOffer(selectedCamera.id, model.id, {
          sdp: localDesc.sdp,
          type: "offer",
          confidence: liveConfidence,
          iou_threshold: liveIouThreshold,
          fps: liveFps,
          device: selectedDevice,
        });

        if (!answer?.sdp || !answer?.peer_id) {
          throw new Error("WebRTC signaling failed");
        }

        await pc.setRemoteDescription({ type: answer.type, sdp: answer.sdp });

        webrtcPeerRef.current = pc;
        setWebrtcPeerId(answer.peer_id);
        setLiveStreamTarget({ cameraId: selectedCamera.id, modelId: model.id });
        setDetections([]);
        setProcessingTime(0);
        setResultImage(null);
        return;
      } catch (error) {
        closeLocalPeer();
        setWebrtcPeerId(null);
        setLiveStreamTarget(null);
        setCameraError(error instanceof Error ? error.message : "Failed to start WebRTC stream");
        return;
      } finally {
        setIsWebRTCConnecting(false);
      }
    }

    setIsProcessing(true);
    setDetections([]);

    try {
      const res =
        testSource === "camera" && selectedCamera
          ? await testModelFromCameraId(
              model.id,
              selectedCamera.id,
              model.confidence,
              selectedDevice
            )
          : await testModelFromMediaPath(
              model.id,
              uploadedMediaPath ?? "",
              model.confidence,
              selectedDevice
            );
      const parsed: Detection[] = (res?.detections || []).map(
        (d: {
          class_id: number;
          class_name: string;
          confidence: number;
          bbox: { x: number; y: number; width: number; height: number };
        }) => ({
          classId: d.class_id,
          className: d.class_name,
          confidence: d.confidence,
          boundingBox: d.bbox,
          color: model.classes.find((c) => c.id === d.class_id)?.color || "#ef4444",
        })
      );
      setDetections(parsed);
      setProcessingTime(res?.inference_time || 0);
      const outputUrl = resolveMediaUrl(res?.output_url);
      setResultImage(outputUrl ? `${outputUrl}${outputUrl.includes("?") ? "&" : "?"}t=${Date.now()}` : null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (file: File | null) => {
    if (file) {
      setCameraError(null);
      setSelectedFile(file);
      setUploadedMediaPath(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setTestImage(e.target?.result as string);
        setResultImage(null);
        setDetections([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadSelectedFileToMedia = async (file: File) => {
    const uploaded = await uploadInputMedia(file);
    if (!uploaded?.media_path) {
      throw new Error("Failed to save image to media folder");
    }

    setUploadedMediaPath(uploaded.media_path);
  };

  const handleCameraCapture = async (): Promise<File | null> => {
    if (!selectedCamera) return null;

    try {
      setCameraError(null);

      if (selectedCamera.protocol === "USB") {
        throw new Error("USB camera uses backend capture. Please click Run Inference directly.");
      }

      const separator = selectedCamera.connectionString.includes("?") ? "&" : "?";
      const url = `${selectedCamera.connectionString}${separator}t=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Failed to capture image (${response.status})`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) {
        throw new Error("Camera endpoint did not return an image");
      }

      const blob = await response.blob();
      const file = new File([blob], `${selectedCamera.name}-capture.jpg`, {
        type: contentType,
      });

      setSelectedFile(file);
      setUploadedMediaPath(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setTestImage(e.target?.result as string);
        setResultImage(null);
        setDetections([]);
      };
      reader.readAsDataURL(file);
      return file;
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Failed to capture image");
      return null;
    }
  };

  const refreshCameraPreview = () => {
    if (!selectedCamera) return;

    setResultImage(null);
    setDetections([]);
    setCameraError(null);

    if (selectedCamera.protocol === "HTTP") {
      const separator = selectedCamera.connectionString.includes("?") ? "&" : "?";
      setTestImage(`${selectedCamera.connectionString}${separator}t=${Date.now()}`);
      return;
    }

    setTestImage(getCameraSnapshotUrl(selectedCamera.id));
  };

  const resetTestState = () => {
    setDetections([]);
    setProcessingTime(0);
    setResultImage(null);
    setCameraError(null);
    setUploadedMediaPath(null);
    setSelectedFile(null);
    setTestImage(null);
  };

  const stopLiveIfRunning = async () => {
    if (webrtcVideoRef.current) {
      webrtcVideoRef.current.srcObject = null;
    }

    if (webrtcPeerRef.current) {
      webrtcPeerRef.current.close();
      webrtcPeerRef.current = null;
    }

    if (webrtcPeerId) {
      await closeLiveInferenceWebRTCPeer(webrtcPeerId);
      setWebrtcPeerId(null);
    }

    if (liveStreamTarget) {
      await stopLiveInferenceStream(liveStreamTarget.cameraId, liveStreamTarget.modelId);
    }

    setLiveStreamTarget(null);
  };

  const handleDialogOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      await stopLiveIfRunning();
      resetTestState();
      setTestSource("upload");
    }

    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (testSource === "camera") return;
    if (!liveStreamTarget) return;

    void stopLiveInferenceStream(liveStreamTarget.cameraId, liveStreamTarget.modelId);
    setLiveStreamTarget(null);
  }, [testSource, liveStreamTarget]);

  useEffect(() => {
    if (open) return;
    if (!liveStreamTarget) return;

    void stopLiveIfRunning();
  }, [open, liveStreamTarget]);

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Test Model - {model.name}
          </DialogTitle>
          <DialogDescription>
            Upload an image and run inference to test the model
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
                setResultImage(null);
                setSelectedFile(null);
                setUploadedMediaPath(null);
                setDetections([]);
                setCameraError(null);
              }}
              className="flex-1"
            >
              Upload Image
            </Button>
            <Button
              type="button"
              variant={testSource === "camera" ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                setTestSource("camera");
                setTestImage(null);
                setResultImage(null);
                setSelectedFile(null);
                setUploadedMediaPath(null);
                setDetections([]);
                setCameraError(null);

                await refreshCameraAvailability();
              }}
              className="flex-1"
              disabled={connectedCameraOptions.length === 0}
            >
              Use Camera
            </Button>
          </div>

          <div
            className={
              testSource === "camera" && cameraOptions.length > 0
                ? "grid gap-4 md:grid-cols-2"
                : "grid gap-4 grid-cols-1"
            }
          >
            {/* Camera Selection */}
            {testSource === "camera" && cameraOptions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Camera</label>
                <select
                  value={selectedCamera?.id || ""}
                  onChange={(e) => {
                    const next = cameraOptions.find((c) => c.id === e.target.value) || null;
                    setSelectedCamera(next);
                    setCameraError(null);
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select camera
                  </option>
                  {connectedCameraOptions.map((camera) => (
                    <option
                      key={camera.id}
                      value={camera.id}
                    >
                      {camera.name} ({camera.protocol})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Processor Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Processor</label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                disabled={devices.length === 0}
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {testSource === "camera" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Confidence</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={liveConfidence}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isNaN(next)) return;
                    setLiveConfidence(Math.min(1, Math.max(0, next)));
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">IoU Threshold</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={liveIouThreshold}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isNaN(next)) return;
                    setLiveIouThreshold(Math.min(1, Math.max(0, next)));
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">FPS</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={liveFps}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isNaN(next)) return;
                    setLiveFps(Math.min(60, Math.max(1, Math.round(next))));
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          {/* Image Preview Area */}
          <div className="relative aspect-video bg-muted/50 rounded-xl overflow-hidden border border-border">
            {(testSource === "camera" && isCameraStreaming) ? (
              <video
                ref={webrtcVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain"
              />
            ) : testImage || resultImage ? (
              <div className="relative w-full h-full">
                <img
                  src={resultImage || testImage || "/placeholder.svg"}
                  alt="Test image"
                  className="h-full w-full object-contain"
                />
                {/* Bounding Boxes Overlay */}
                {!resultImage && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {detections.map((detection, i) => (
                      <g key={i}>
                        <rect
                          x={`${(detection.boundingBox.x / 640) * 100}%`}
                          y={`${(detection.boundingBox.y / 480) * 100}%`}
                          width={`${(detection.boundingBox.width / 640) * 100}%`}
                          height={`${(detection.boundingBox.height / 480) * 100}%`}
                          fill="none"
                          stroke={detection.color}
                          strokeWidth="2"
                        />
                        <text
                          x={`${(detection.boundingBox.x / 640) * 100}%`}
                          y={`${((detection.boundingBox.y - 5) / 480) * 100}%`}
                          fill={detection.color}
                          fontSize="12"
                          fontFamily="monospace"
                        >
                          {detection.className} ({(detection.confidence * 100).toFixed(0)}%)
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-lg">No image selected</p>
                <p className="text-sm">
                  {testSource === "camera"
                    ? "Select a connected camera to preview"
                    : "Upload an image to test"}
                </p>
              </div>
            )}
          </div>

          {testSource === "camera" && cameraError ? (
            <div className="text-sm text-destructive">{cameraError}</div>
          ) : null}

          {testSource === "camera" && connectedCameraOptions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              HTTP is not available. Please connect a camera first.
            </div>
          ) : null}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {testSource === "upload" ? (
              <div className="relative flex-1">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] || null;
                    handleImageUpload(file);
                    if (file) {
                      try {
                        await uploadSelectedFileToMedia(file);
                      } catch (error) {
                        setCameraError(
                          error instanceof Error
                            ? error.message
                            : "Failed to save uploaded image"
                        );
                      }
                    }
                  }}
                />
                <Button variant="outline" className="w-full bg-transparent">
                  Upload Test Image
                </Button>
              </div>
            ) : null}

            {testSource === "camera" ? (
              <>
                <Button
                  onClick={async () => {
                    if (isCameraStreaming) {
                      await stopLiveIfRunning();
                      setResultImage(null);
                      refreshCameraPreview();
                      return;
                    }

                    await handleRunInference();
                  }}
                  disabled={!selectedCamera || isWebRTCConnecting}
                  className="flex-1"
                >
                  {isCameraStreaming ? "Stop" : isWebRTCConnecting ? "Connecting..." : "Run Inference"}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleRunInference}
                disabled={
                  isProcessing ||
                  !uploadedMediaPath
                }
              >
                {isProcessing ? "Processing..." : "Run Inference"}
              </Button>
            )}
          </div>

          {/* Results */}
          {testSource === "upload" && detections.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Detection Results</span>
                <span className="text-muted-foreground">
                  Processing time: {processingTime}ms
                </span>
              </div>
              <div className="text-xs text-muted-foreground">Device: {selectedDevice}</div>
              <div className="space-y-2">
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
                    <div className="text-sm text-muted-foreground">
                      <span>Confidence: {(detection.confidence * 100).toFixed(1)}%</span>
                      <span className="mx-2">|</span>
                      <span>
                        Box: ({detection.boundingBox.x}, {detection.boundingBox.y},{" "}
                        {detection.boundingBox.width}, {detection.boundingBox.height})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {testSource === "upload" && detections.length === 0 && testImage && !isProcessing && processingTime > 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No detections above confidence threshold ({(model.confidence * 100).toFixed(0)}%)
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
