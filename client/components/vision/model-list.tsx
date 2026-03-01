"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Model, Camera } from "@/types/vision";
import FolderIcon from "@/components/icons/folder";
import CubeIcon from "@/components/icons/cube";
import { ModelUploadDialog } from "./model-upload-dialog";
import { ModelConfigDialog } from "./model-config-dialog";
import { ModelTestDialog } from "./model-test-dialog";
import { MediaLibraryDialog } from "./media-library-dialog";
import { uploadModel, removeModel } from "@/data/vision-api";

interface ModelListProps {
  models: Model[];
  cameras?: Camera[];
}

export function ModelList({ models: initialModels, cameras = [] }: ModelListProps) {
  const [models, setModels] = useState(initialModels);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const handleUploadModel = async (data: { file: File; name: string }) => {
    const created = await uploadModel({
      file: data.file,
      name: data.name,
      modelType: "yolov8",
      confidence: 0.5,
    });

    if (created) {
      setModels([created, ...models]);
    }

    setUploadDialogOpen(false);
  };

  const handleUpdateConfig = (config: { confidence: number; roi?: Model["roi"] }) => {
    if (!selectedModel) return;
    setModels(
      models.map((m) =>
        m.id === selectedModel.id
          ? { ...m, confidence: config.confidence, roi: config.roi }
          : m
      )
    );
    setSelectedModel(null);
    setConfigDialogOpen(false);
  };

  const handleDeleteModel = async (modelId: string) => {
    const ok = await removeModel(modelId);
    if (ok) {
      setModels(models.filter((m) => m.id !== modelId));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = (status: Model["status"]) => {
    switch (status) {
      case "ready":
        return "bg-success/20 text-success border-success/30";
      case "loading":
        return "bg-warning/20 text-warning border-warning/30";
      case "error":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-display">Model List</CardTitle>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMediaLibraryOpen(true)}
                title="Open Media Library"
              >
                <FolderIcon className="size-4" />
              </Button>
              <Button onClick={() => setUploadDialogOpen(true)}>
                Upload Model
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {models.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CubeIcon className="size-12 mb-4 opacity-50" />
              <p className="text-lg">No models uploaded</p>
              <p className="text-sm">Upload an AI model to start inference</p>
            </div>
          ) : (
            <div className="space-y-4">
              {models.map((model) => (
                <div
                  key={model.id}
                  className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                        <CubeIcon className="size-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium">{model.name}</h3>
                          <Badge variant="outline" className={getStatusColor(model.status)}>
                            {model.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {model.filename} ({formatFileSize(model.fileSize)})
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/70">
                          <span>Confidence: {(model.confidence * 100).toFixed(0)}%</span>
                          {model.roi && (
                            <span>
                              ROI: {model.roi.width}x{model.roi.height}
                            </span>
                          )}
                        </div>

                        {/* Classes */}
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-2">
                            Classes ({model.classes.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {model.classes.map((cls) => (
                              <span
                                key={cls.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs"
                                style={{
                                  backgroundColor: `${cls.color}20`,
                                  color: cls.color,
                                  border: `1px solid ${cls.color}40`,
                                }}
                              >
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: cls.color }}
                                />
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedModel(model);
                          setTestDialogOpen(true);
                        }}
                      >
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedModel(model);
                          setConfigDialogOpen(true);
                        }}
                      >
                        Config
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive bg-transparent"
                        onClick={() => handleDeleteModel(model.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ModelUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUploadModel}
      />

      <MediaLibraryDialog
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
      />

      <ModelConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        model={selectedModel}
        onSave={handleUpdateConfig}
      />

      <ModelTestDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        model={selectedModel}
        cameras={cameras}
      />
    </>
  );
}
