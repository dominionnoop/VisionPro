"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchMediaRecords, type MediaRecord } from "@/data/vision-api";

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaLibraryDialog({ open, onOpenChange }: MediaLibraryDialogProps) {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<"all" | "image" | "video">("all");

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      try {
        const records = await fetchMediaRecords();
        setMedia(records ?? []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open]);

  const filteredMedia = useMemo(() => {
    if (selectedType === "all") return media;
    return media.filter((item) => item.type === selectedType);
  }, [media, selectedType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Media Library</DialogTitle>
          <DialogDescription>
            Uploaded test images and outputs from model inference
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant={selectedType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("all")}
          >
            All ({media.length})
          </Button>
          <Button
            variant={selectedType === "image" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("image")}
          >
            Images ({media.filter((m) => m.type === "image").length})
          </Button>
          <Button
            variant={selectedType === "video" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("video")}
          >
            Videos ({media.filter((m) => m.type === "video").length})
          </Button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading media...</div>
        ) : filteredMedia.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No media found yet. Run model test to create records.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMedia.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/50 overflow-hidden bg-card">
                <div className="aspect-video bg-muted/40 flex items-center justify-center overflow-hidden">
                  {item.type === "image" ? (
                    <img
                      src={item.outputUrl || item.inputUrl}
                      alt={item.modelName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.outputUrl || item.inputUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{item.modelName}</p>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

