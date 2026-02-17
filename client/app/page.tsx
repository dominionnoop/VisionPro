"use client";

import { useEffect, useState } from "react";
import DashboardPageLayout from "@/components/dashboard/layout";
import FolderIcon from "@/components/icons/folder";
import { ProjectList } from "@/components/vision/project-list";
import { ProjectStats } from "@/components/vision/project-stats";
import api from "@/lib/api";
import type { Project, Camera, Model } from "@/types/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [projectsData, camerasData, modelsData] = await Promise.all([
          api.projects.list(),
          api.cameras.list(),
          api.models.list(),
        ]);
        setProjects(projectsData);
        setCameras(camerasData);
        setModels(modelsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardPageLayout
        header={{
          title: "Projects",
          description: "Manage your vision inspection projects",
          icon: FolderIcon,
        }}
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </DashboardPageLayout>
    );
  }

  if (error) {
    return (
      <DashboardPageLayout
        header={{
          title: "Projects",
          description: "Manage your vision inspection projects",
          icon: FolderIcon,
        }}
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </DashboardPageLayout>
    );
  }

  return (
    <DashboardPageLayout
      header={{
        title: "Projects",
        description: "Manage your vision inspection projects",
        icon: FolderIcon,
      }}
    >
      <ProjectStats
        totalProjects={projects.length}
        activeProjects={projects.filter((p) => p.status === "active").length}
        totalCameras={cameras.length}
        totalModels={models.length}
      />

      <ProjectList projects={projects} onUpdate={setProjects} />
    </DashboardPageLayout>
  );
}
