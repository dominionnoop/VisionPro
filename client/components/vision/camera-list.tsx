"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Camera, CameraProtocol } from "@/types/vision";
import PlusIcon from "@/components/icons/plus";
import MonitorIcon from "@/components/icons/monitor";
import { CameraDialog } from "./camera-dialog";
import {
  createCamera,
  updateCamera,
  deleteCamera,
  fetchCameras,
  saveCameraHttpReachability,
} from "@/data/vision-api";

interface CameraListProps {
  cameras: Camera[];
}

export function CameraList({ cameras: initialCameras }: CameraListProps) {
  const [cameras, setCameras] = useState(initialCameras);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCamera, setPreviewCamera] = useState<Camera | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const refreshCameras = async () => {
      const latest = await fetchCameras();
      if (!active) return;

      if (latest) {
        setCameras(latest);
        saveCameraHttpReachability(latest);
      } else {
        saveCameraHttpReachability(cameras);
      }
    };

    void refreshCameras();
    return () => {
      active = false;
    };
    // run once on tab/component open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCamera = async (data: Partial<Camera>) => {
    const created = await createCamera({
      name: data.name || "New Camera",
      protocol: data.protocol || "GigE",
      connectionString: data.connectionString || "",
      mode: data.mode || "auto",
    });

    if (created) {
      const next = [created, ...cameras];
      setCameras(next);
      saveCameraHttpReachability(next);
    }
    setDialogOpen(false);
  };

  const handleEditCamera = async (data: Partial<Camera>) => {
    if (!editingCamera) return;

    const updated = await updateCamera(editingCamera.id, {
      name: data.name,
      protocol: data.protocol,
      connectionString: data.connectionString,
      mode: data.mode,
    });

    if (updated) {
      const latest = await fetchCameras();
      if (latest) {
        setCameras(latest);
        saveCameraHttpReachability(latest);
      } else {
        const next = cameras.map((c) => (c.id === editingCamera.id ? updated : c));
        setCameras(next);
        saveCameraHttpReachability(next);
      }
    }

    setEditingCamera(null);
    setDialogOpen(false);
  };

  const handleDeleteCamera = async (cameraId: string) => {
    const ok = await deleteCamera(cameraId);
    if (ok) {
      const next = cameras.filter((c) => c.id !== cameraId);
      setCameras(next);
      saveCameraHttpReachability(next);
    }
  };

  const handleTestConnection = (camera: Camera) => {
    setPreviewCamera(camera);
    setPreviewKey(Date.now());
    setPreviewError(camera.status !== "connected" ? "HTTP is not available." : null);
    setPreviewOpen(true);
  };

  const getStatusColor = (status: Camera["status"]) => {
    switch (status) {
      case "connected":
        return "bg-success/20 text-success border-success/30";
      case "disconnected":
        return "bg-muted text-muted-foreground border-border";
      case "error":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getProtocolColor = (protocol: CameraProtocol) => {
    switch (protocol) {
      case "GigE":
        return "bg-primary/20 text-primary border-primary/30";
      case "RTSP":
        return "bg-chart-2/20 text-chart-2 border-chart-2/30";
      case "HTTP":
        return "bg-chart-3/20 text-chart-3 border-chart-3/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-display">Vision Source List</CardTitle>
            <Button
              onClick={() => {
                setEditingCamera(null);
                setDialogOpen(true);
              }}
            >
              <PlusIcon className="size-4 mr-2" />
              Add Vision Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MonitorIcon className="size-12 mb-4 opacity-50" />
              <p className="text-lg">No vision sources configured</p>
              <p className="text-sm">Add a vision source to start capturing images</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <MonitorIcon className="size-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium">{camera.name}</h3>
                        <Badge variant="outline" className={getProtocolColor(camera.protocol)}>
                          {camera.protocol}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(camera.status)}>
                          {camera.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {camera.connectionString}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground/70">
                        <span>
                          {camera.settings.resolution.width}x{camera.settings.resolution.height}
                        </span>
                        <span>{camera.settings.frameRate} FPS</span>
                        <span>Mode: {camera.mode}</span>
                        {camera.mode === "snapshot" && camera.triggerSource && (
                          <span>Trigger: {camera.triggerSource}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(camera)}
                    >
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCamera(camera);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive bg-transparent"
                      onClick={() => handleDeleteCamera(camera.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CameraDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={editingCamera ? handleEditCamera : handleCreateCamera}
        defaultValues={editingCamera || undefined}
        mode={editingCamera ? "edit" : "create"}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Vision Source Preview {previewCamera ? `- ${previewCamera.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          {previewCamera ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground break-all">
                {previewCamera.connectionString}
              </p>
              {previewError ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {previewError}
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-2">
                  <img
                    src={`${previewCamera.connectionString}${previewCamera.connectionString.includes("?") ? "&" : "?"}t=${previewKey}`}
                    alt={`Preview from ${previewCamera.name}`}
                    className="w-full max-h-[70vh] object-contain rounded-md"
                    onError={() => {
                      setPreviewError("HTTP is not available.");
                      setCameras(
                        cameras.map((c) =>
                          c.id === previewCamera.id ? { ...c, status: "error" } : c
                        )
                      );
                    }}
                  />
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
