"use client";

import React, { useEffect, useState } from "react";
import DashboardPageLayout from "@/components/dashboard/layout";
import MonitorIcon from "@/components/icons/monitor";
import { LiveMonitor } from "@/components/vision/live-monitor";
import { fetchCameras, fetchModels, fetchInferenceResults } from "@/data/vision-api";
import type { Camera, Model, InferenceResult } from "@/types/vision";

export default function LivePage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [results, setResults] = useState<InferenceResult[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cams, mods, res] = await Promise.all([
          fetchCameras(),
          fetchModels(),
          fetchInferenceResults(),
        ]);
        if (!mounted) return;
        setCameras(cams || []);
        setModels(mods || []);
        setResults(res || []);
      } catch (e) {
        console.warn("Failed to load live data:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardPageLayout
      header={{
        title: "Live View",
        description: "Real-time monitoring and detection results",
        icon: MonitorIcon,
      }}
    >
      <LiveMonitor cameras={cameras} models={models} initialResults={results} />
    </DashboardPageLayout>
  );
}
