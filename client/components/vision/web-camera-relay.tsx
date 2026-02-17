"use client";

import { useEffect, useRef, useState } from "react";
import type { Camera } from "@/types/vision";

interface WebCameraRelayProps {
    cameras: Camera[];
    enabled?: boolean;
}

export function WebCameraRelay({ cameras, enabled = true }: WebCameraRelayProps) {
    // Filter for cameras that need relaying
    // 1. Protocol is effectively HTTP (since we converted USB -> HTTP)
    // 2. Connection string contains the backend relay pattern
    const relayCameras = cameras.filter(
        (c) =>
            c.status === "connected" &&
            c.connection_string.includes("/api/vision/relay/")
    );

    const [sharedStream, setSharedStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Manage the MediaStream at the top level (Singleton-ish)
    useEffect(() => {
        // If disabled or no cameras need relay, close stream if open
        if (!enabled || relayCameras.length === 0) {
            if (sharedStream) {
                console.log("[Relay] Disabling/Pausing stream...");
                sharedStream.getTracks().forEach(t => t.stop());
                setSharedStream(null);
            }
            return;
        }

        // If stream already exists, active cameras can just use it.
        if (sharedStream && sharedStream.active) return;

        let mounted = true;

        const initStream = async () => {
            try {
                console.log("[Relay] Requesting shared webcam access...");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 } // Fixed resolution for efficiency
                });

                if (!mounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                setSharedStream(stream);
                setError(null);
            } catch (err: any) {
                console.error("[Relay] Failed to acquire webcam:", err);
                setError(err.name);
                // Retry logic could go here
            }
        };

        initStream();

        return () => {
            mounted = false;
        };
    }, [relayCameras.length > 0, enabled]); // Toggle when enabled changes

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sharedStream) {
                console.log("[Relay] Cleaning up shared stream");
                sharedStream.getTracks().forEach(t => t.stop());
            }
        };
    }, [sharedStream]);

    if (error) {
        return (
            <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 text-xs">
                <p className="font-bold">Camera Relay Error</p>
                <p>{error === 'NotReadableError' ? "Camera is in use by another app." : "Could not access camera."}</p>
            </div>
        );
    }

    return (
        <div className="hidden">
            {relayCameras.map((camera) => (
                <SingleCameraRelay key={camera.id} camera={camera} stream={sharedStream} />
            ))}
        </div>
    );
}

function SingleCameraRelay({ camera, stream }: { camera: Camera, stream: MediaStream | null }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!stream || !videoRef.current) return;

        // Attach stream to video element
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Play failed", e));

        const targetUrl = camera.connection_string;
        const ctx = canvasRef.current?.getContext("2d", { alpha: false }); // Optimize

        // Broadcasting Loop
        // We start immediately.
        intervalRef.current = setInterval(() => {
            if (!videoRef.current || !canvasRef.current || !ctx) return;

            // Skip if video not ready
            if (videoRef.current.readyState < 2) return;

            // Draw video to canvas
            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

            // Export to blob (JPEG)
            canvasRef.current.toBlob((blob) => {
                if (!blob) return;
                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");

                // We use 'keepalive' if possible, or just standard fetch
                fetch(targetUrl, {
                    method: "POST",
                    body: formData,
                    // processing is async, we don't await here to avoid blocking interval (fire and forget-ish)
                }).catch(e => {
                    // Squelch errors to avoid console spam on nav
                });
            }, "image/jpeg", 0.6); // Lower quality for higher FPS potential

        }, 200); // 5 FPS per camera is enough for 'monitoring'

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [stream, camera.connection_string]);

    return (
        <>
            <video ref={videoRef} className="hidden" muted playsInline />
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
        </>
    );
}
