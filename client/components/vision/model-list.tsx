"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Model, Camera } from "@/types/api";
import PlusIcon from "@/components/icons/plus";
import CubeIcon from "@/components/icons/cube";
import DatabaseIcon from "@/components/icons/database"; // New Icon
import { ModelUploadDialog } from "./model-upload-dialog";
import { ModelConfigDialog } from "./model-config-dialog";
import { ModelTestDialog } from "./model-test-dialog";
import { MediaLibraryDialog } from "./media-library-dialog"; // New Dialog
import api from "@/lib/api";

interface ModelListProps {
  cameras?: Camera[];
}

const MODEL_TYPES = [
  { id: 'all', name: 'All Models', color: '#6B7280' },
  { id: 'yolov8', name: 'YOLOv8', color: '#00D4FF' },
  { id: 'yolov5', name: 'YOLOv5', color: '#4ECDC4' },
  { id: 'yolov7', name: 'YOLOv7', color: '#FFE66D' },
  { id: 'yolov9', name: 'YOLOv9', color: '#95E1D3' },
  { id: 'custom', name: 'Custom', color: '#F38181' },
];

export function ModelList({ cameras = [] }: ModelListProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false); // New State
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const data = await api.models.list();
      setModels(data);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!modelToDelete) return;

    try {
      await api.models.delete(modelToDelete.id);
      setModels(models.filter(m => m.id !== modelToDelete.id));
      setDeleteDialogOpen(false);
      setModelToDelete(null);
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
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
      case "training":
        return "bg-warning/20 text-warning border-warning/30";
      case "error":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTypeColor = (type: string) => {
    return MODEL_TYPES.find(t => t.id === type)?.color || '#6B7280';
  };

  const filteredModels = selectedType === 'all'
    ? models
    : models.filter(m => m.model_type === selectedType);

  const getModelCountByType = (type: string) => {
    if (type === 'all') return models.length;
    return models.filter(m => m.model_type === type).length;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading models...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-display">Model Library</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setMediaLibraryOpen(true)}
                title="Manage Test Media"
              >
                <DatabaseIcon className="size-4 mr-2" />
                Storage
              </Button>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <PlusIcon className="size-4 mr-2" />
                Upload Model
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
              {MODEL_TYPES.map(type => (
                <TabsTrigger key={type.id} value={type.id} className="gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.name}
                  <Badge variant="secondary" className="ml-1">
                    {getModelCountByType(type.id)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedType} className="mt-4">
              {filteredModels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CubeIcon className="size-12 mb-4 opacity-50" />
                  <p className="text-lg">No models found</p>
                  <p className="text-sm">
                    {selectedType === 'all'
                      ? 'Upload a model to get started'
                      : `No ${MODEL_TYPES.find(t => t.id === selectedType)?.name} models`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredModels.map((model) => (
                    <div
                      key={model.id}
                      className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div
                            className="flex size-12 items-center justify-center rounded-xl text-white shrink-0"
                            style={{ backgroundColor: getTypeColor(model.model_type) }}
                          >
                            <CubeIcon className="size-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium">{model.name}</h3>
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: getTypeColor(model.model_type),
                                  color: getTypeColor(model.model_type)
                                }}
                              >
                                {MODEL_TYPES.find(t => t.id === model.model_type)?.name}
                              </Badge>
                              <Badge variant="outline" className={getStatusColor(model.status)}>
                                {model.status}
                              </Badge>
                              <Badge variant="secondary">
                                {model.file_format}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {model.filename} ({formatFileSize(model.file_size)})
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/70">
                              <span>Confidence: {(model.confidence * 100).toFixed(0)}%</span>
                              {model.roi && (
                                <span>
                                  ROI: {model.roi.width}x{model.roi.height}
                                </span>
                              )}
                              {model.framework && <span>Framework: {model.framework}</span>}
                            </div>

                            {/* Classes */}
                            {model.classes && model.classes.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-2">
                                  Classes ({model.classes.length}):
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {model.classes.map((cls: any) => (
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
                            )}
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
                            onClick={() => {
                              setModelToDelete(model);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MediaLibraryDialog
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
      />

      <ModelUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={fetchModels}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{modelToDelete?.name}"? This will permanently remove the model file and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
