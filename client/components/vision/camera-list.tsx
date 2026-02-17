"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Camera, CameraProtocol } from "@/types/vision";
import PlusIcon from "@/components/icons/plus";
import CameraIcon from "@/components/icons/camera";
import { CameraDialog } from "./camera-dialog";
import { CameraSettingsDialog } from "./camera-settings-dialog";
import { CameraPreviewDialog } from "./camera-preview-dialog";
import { WebCameraRelay } from "./web-camera-relay";

interface CameraListProps {
  cameras: Camera[];
}

export function CameraList({ cameras: initialCameras }: CameraListProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [previewCamera, setPreviewCamera] = useState<Camera | null>(null);

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/vision/cameras`);
      if (res.ok) {
        const data = await res.json();
        setCameras(data);
      }
    } catch (error) {
      console.error("Failed to fetch cameras:", error);
    }
  };

  const handleCreateCamera = async (data: Partial<Camera>) => {
    const formData = new FormData();
    formData.append("name", data.name || "New Camera");
    formData.append("protocol", data.protocol || "GigE");
    formData.append("connection_string", data.connectionString || data.connection_string || "");
    formData.append("mode", data.mode || "auto");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/vision/cameras`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        fetchCameras();
        setDialogOpen(false);
      } else {
        const errText = await res.text();
        console.error("Failed to create camera:", res.status, errText);
        alert(`Failed to create camera: ${res.status} - ${errText}`);
      }
    } catch (error) {
      console.error("Error creating camera:", error);
      alert(`Error creating camera: ${error}`);
    }
  };

  const handleEditCamera = async (data: Partial<Camera>) => {
    if (!editingCamera) return;

    const formData = new FormData();
    if (data.name) formData.append("name", data.name);
    if (data.protocol) formData.append("protocol", data.protocol);
    if (data.connectionString) formData.append("connection_string", data.connectionString);
    if (data.mode) formData.append("mode", data.mode);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/vision/cameras/${editingCamera.id}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        fetchCameras();
        setEditingCamera(null);
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Error updating camera:", error);
    }
  };

  const handleUpdateSettings = (settings: Camera["settings"]) => {
    // Settings update logic not yet implemented in backend, keeping mock for now for settings UI
    if (!selectedCamera) return;
    setCameras(
      cameras.map((c) =>
        c.id === selectedCamera.id ? { ...c, settings } : c
      )
    );
    setSelectedCamera(null);
    setSettingsDialogOpen(false);
  };

  const handleDeleteCamera = async (cameraId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/vision/cameras/${cameraId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCameras();
      }
    } catch (error) {
      console.error("Error deleting camera:", error);
    }
  };

  const handleTestConnection = (camera: Camera) => {
    setPreviewCamera(camera);
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
            <CardTitle className="text-xl font-display">Camera List</CardTitle>
            <Button
              onClick={() => {
                setEditingCamera(null);
                setDialogOpen(true);
              }}
            >
              <PlusIcon className="size-4 mr-2" />
              Add Camera
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cameras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CameraIcon className="size-12 mb-4 opacity-50" />
              <p className="text-lg">No cameras configured</p>
              <p className="text-sm">Add a camera to start capturing images</p>
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
                      <CameraIcon className="size-6" />
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
                        {camera.connection_string}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground/70">
                        <span>
                          {typeof camera.settings.resolution === 'object' && camera.settings.resolution !== null
                            ? `${(camera.settings.resolution as any).width}x${(camera.settings.resolution as any).height}`
                            : camera.settings.resolution || "1920x1080"}
                        </span>
                        <span>{camera.settings.fps || 30} FPS</span>
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
                        setSelectedCamera(camera);
                        setSettingsDialogOpen(true);
                      }}
                    >
                      Settings
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

      <CameraSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        camera={selectedCamera}
        onSave={handleUpdateSettings}
      />

      <CameraPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        camera={previewCamera}
      />

      <WebCameraRelay cameras={cameras} enabled={!dialogOpen} />
    </>
  );
}
