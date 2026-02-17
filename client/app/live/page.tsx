"use client";

import { useState, useEffect } from "react";
import DashboardPageLayout from "@/components/dashboard/layout";
import MonitorIcon from "@/components/icons/monitor";
import { LiveMonitor } from "@/components/vision/live-monitor";
import api from "@/lib/api";
import type { Camera, Model } from "@/types/api";

export default function LivePage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [camerasData, modelsData] = await Promise.all([
          api.cameras.list(),
          api.models.list(),
        ]);
        setCameras(camerasData);
        setModels(modelsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardPageLayout
        header={{
          title: "Live View",
          description: "Real-time monitoring and detection results",
          icon: MonitorIcon,
        }}
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout
      header={{
        title: "Live View",
        description: "Real-time monitoring and detection results",
        icon: MonitorIcon,
      }}
    >
      <LiveMonitor cameras={cameras} models={models} />
    </DashboardPageLayout>
  );
}
