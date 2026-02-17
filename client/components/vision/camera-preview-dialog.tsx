"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import type { Camera } from "@/types/vision";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface CameraPreviewDialogProps {
    camera: Camera | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CameraPreviewDialog({
    camera,
    open,
    onOpenChange,
}: CameraPreviewDialogProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [timestamp, setTimestamp] = useState(Date.now());

    // Reset state when camera changes or dialog opens
    useEffect(() => {
        if (open) {
            setIsLoading(true);
            setTimestamp(Date.now()); // Force refresh stream by appending timestamp
        }
    }, [open, camera?.id]);

    if (!camera) return null;

    // For MJPEG streams (HTTP or Relay), we can just use the URL in an <img> tag.
    let displayUrl = camera.connection_string;

    // If using internal docker host, use the proxy
    if (displayUrl.includes("host.docker.internal") || displayUrl.includes("172.")) {
        displayUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/vision/proxy/${camera.id}`;
    }

    // Append timestamp to prevent caching
    const streamUrl = `${displayUrl}${displayUrl.includes("?") ? "&" : "?"}_t=${timestamp}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Camera Preview: {camera.name}</DialogTitle>
                    <DialogDescription>
                        Live view from {camera.connection_string}
                    </DialogDescription>
                </DialogHeader>

                <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/50 z-10">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span className="text-sm">Connecting to stream...</span>
                            </div>
                        </div>
                    )}

                    {/* 
            MJPEG Stream rendering. 
            OnLoad fires when the first frame loads (connection established).
            OnError fires if connection fails.
          */}
                    <img
                        src={streamUrl}
                        alt="Live Stream"
                        className="w-full h-full object-contain relative z-20"
                        onLoad={() => setIsLoading(false)}
                        onError={() => setIsLoading(false)} // Stop loading spinner even on error to show broken image icon or alt text
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
