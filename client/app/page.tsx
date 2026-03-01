import DashboardPageLayout from "@/components/dashboard/layout";
import FolderIcon from "@/components/icons/folder";
import { ProjectList } from "@/components/vision/project-list";
import { ProjectStats } from "@/components/vision/project-stats";
import { fetchProjects, fetchCameras, fetchModels } from "@/data/vision-api";
import type { Camera, Model, Project } from "@/types/vision";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectsPage() {
  const [projects, cameras, models] = await Promise.all([
    fetchProjects(),
    fetchCameras(),
    fetchModels(),
  ]);

  const p: Project[] = projects ?? [];
  const c: Camera[] = cameras ?? [];
  const m: Model[] = models ?? [];

  return (
    <DashboardPageLayout
      header={{
        title: "Projects",
        description: "Manage your vision inspection projects",
        icon: FolderIcon,
      }}
    >
      <ProjectStats
        totalProjects={p.length}
        activeProjects={p.filter((proj) => proj.status === "active").length}
        totalCameras={c.length}
        totalModels={m.length}
      />

      <ProjectList projects={p} />
    </DashboardPageLayout>
  );
}
