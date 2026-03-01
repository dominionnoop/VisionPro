"use client";

import React from "react"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Camera, CameraProtocol } from "@/types/vision";

interface CameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Camera>) => void;
  defaultValues?: Partial<Camera>;
  mode: "create" | "edit";
}

const protocols: CameraProtocol[] = ["GigE", "RTSP", "HTTP", "USB"];

export function CameraDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  mode,
}: CameraDialogProps) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [protocol, setProtocol] = useState<CameraProtocol>("HTTP");
  const [connectionString, setConnectionString] = useState(defaultValues?.connectionString || "");

  useEffect(() => {
    if (open) {
      setName(defaultValues?.name || "");
      setProtocol("HTTP");
      setConnectionString(defaultValues?.connectionString || "");
    }
  }, [open, defaultValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !connectionString.trim()) return;
    onSubmit({
      name: name.trim(),
      protocol,
      connectionString: connectionString.trim(),
    });
  };

  const getPlaceholder = () => {
    switch (protocol) {
      case "GigE":
        return "192.168.1.100";
      case "RTSP":
        return "rtsp://192.168.1.100:554/stream";
      case "HTTP":
        return "http://192.168.1.100/snapshot";
      case "USB":
        return "/dev/video0";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {mode === "create" ? "Add New Vision Source" : "Edit Vision Source"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new vision source connection"
              : "Update the vision source configuration"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Vision Source Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter vision source name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Protocol</label>
            <div className="rounded-md border px-3 py-2 text-sm text-foreground bg-muted/40">
              HTTP
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="connectionString" className="text-sm font-medium">
              Connection String
            </label>
            <Input
              id="connectionString"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder={getPlaceholder()}
              required
            />
            <p className="text-xs text-muted-foreground">
              {protocol === "GigE" && "Enter the IP address of the GigE camera"}
              {protocol === "RTSP" && "Enter the RTSP URL with port and stream path"}
              {protocol === "HTTP" && "Enter the HTTP URL for snapshot endpoint"}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {mode === "create" ? "Add Vision Source" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
