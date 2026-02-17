"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import { Trash2, Play, Image as ImageIcon, Film, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface MediaRecord {
    id: string;
    type: "image" | "video";
    input_url: string;
    output_url: string | null;
    created_at: string;
    model_name: string;
}

const getMediaUrl = (path: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;

    // Construct full backend URL
    // path is like "/media/inputs/file.jpg"
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:8000";
    return `${backendUrl}${path}`;
};

export function MediaLibraryDialog({ open, onOpenChange }: MediaLibraryDialogProps) {
    const [media, setMedia] = useState<MediaRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<"all" | "image" | "video">("all");
    const [previewMedia, setPreviewMedia] = useState<MediaRecord | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"output" | "input">("output"); // New state

    useEffect(() => {
        if (open) {
            fetchMedia();
        }
    }, [open]);

    const fetchMedia = async () => {
        try {
            setLoading(true);
            const data = await api.media.list();
            setMedia(data);
        } catch (error) {
            console.error("Failed to fetch media:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.media.delete(deleteId);
            setMedia(media.filter((m) => m.id !== deleteId));
            if (previewMedia?.id === deleteId) {
                setPreviewMedia(null);
            }
            setDeleteId(null);
        } catch (error) {
            console.error("Failed to delete media:", error);
        }
    };

    const filteredMedia = media.filter(
        (m) => selectedType === "all" || m.type === selectedType
    );

    // Helper to get the correct URL based on view mode
    const getDisplayUrl = (item: MediaRecord) => {
        return viewMode === "output" ? (item.output_url || item.input_url) : item.input_url;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display flex items-center gap-2">
                            Media Library
                        </DialogTitle>
                        <DialogDescription>
                            Manage images and videos from model tests.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between mt-4 gap-4">
                        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
                            <TabsList>
                                <TabsTrigger value="all">All Media ({media.length})</TabsTrigger>
                                <TabsTrigger value="image">Images ({media.filter(m => m.type === 'image').length})</TabsTrigger>
                                <TabsTrigger value="video">Videos ({media.filter(m => m.type === 'video').length})</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                            <Button
                                variant={viewMode === "output" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("output")}
                                className="text-xs"
                            >
                                Output (Analyzed)
                            </Button>
                            <Button
                                variant={viewMode === "input" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewMode("input")}
                                className="text-xs"
                            >
                                Input (Original)
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Grid List */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-12 text-muted-foreground">Loading...</div>
                        ) : filteredMedia.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                No media found. Run some tests to generate media!
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredMedia.map((item) => (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all",
                                            previewMedia?.id === item.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                                        )}
                                        onClick={() => setPreviewMedia(item)}
                                    >
                                        {/* Thumbnail */}
                                        {item.type === "video" ? (
                                            <div className="w-full h-full bg-black/5 flex items-center justify-center relative">
                                                <div className="w-full h-full bg-black/10 absolute inset-0" />
                                                <Film className="size-8 text-foreground/50" />
                                                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                                                    <span className="text-[10px] text-white font-mono">{item.model_name}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <img
                                                src={getMediaUrl(getDisplayUrl(item))}
                                                alt="Media"
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        )}

                                        {/* Overlay Info */}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-xs text-white font-medium truncate">{item.model_name}</p>
                                            <p className="text-[10px] text-white/70">{new Date(item.created_at).toLocaleDateString()}</p>
                                        </div>

                                        {/* Delete Button (Hover) */}
                                        <button
                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteId(item.id);
                                            }}
                                        >
                                            <Trash2 className="size-4" />
                                        </button>

                                        {/* Type Badge */}
                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider">
                                            {item.type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview Panel (Right Side) */}
                    {previewMedia && (
                        <div className="w-[400px] border-l bg-muted/10 flex flex-col overflow-hidden shrink-0 transition-all">
                            <div className="p-4 border-b flex items-center justify-between bg-background">
                                <h3 className="font-medium">Preview</h3>
                                <Button variant="ghost" size="icon" onClick={() => setPreviewMedia(null)}>
                                    <X className="size-4" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                                <div className="rounded-xl overflow-hidden border bg-black/5 flex items-center justify-center min-h-[200px]">
                                    {previewMedia.type === 'video' ? (
                                        <video
                                            src={getMediaUrl(getDisplayUrl(previewMedia))}
                                            controls
                                            className="max-w-full max-h-[400px]"
                                            autoPlay
                                        />
                                    ) : (
                                        <img
                                            src={getMediaUrl(getDisplayUrl(previewMedia))}
                                            className="max-w-full h-auto"
                                        />
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Model</label>
                                        <p className="font-medium">{previewMedia.model_name}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Created At</label>
                                        <p className="text-sm">{new Date(previewMedia.created_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Paths</label>
                                        <div className="text-xs font-mono text-muted-foreground truncate bg-muted p-2 rounded mt-1">
                                            Input: {previewMedia.input_url}
                                        </div>
                                        {previewMedia.output_url && (
                                            <div className="text-xs font-mono text-muted-foreground truncate bg-muted p-2 rounded mt-1">
                                                Output: {previewMedia.output_url}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4">
                                    <Button
                                        variant="destructive"
                                        className="w-full gap-2"
                                        onClick={() => setDeleteId(previewMedia.id)}
                                    >
                                        <Trash2 className="size-4" />
                                        Delete Permanent
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Media?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this {media.find(m => m.id === deleteId)?.type} from storage.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
