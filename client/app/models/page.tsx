import DashboardPageLayout from "@/components/dashboard/layout";
import CubeIcon from "@/components/icons/cube";
import { ModelList } from "@/components/vision/model-list";
import { fetchModels, fetchCameras } from "@/data/vision-api";

export default async function ModelsPage() {
  const [models, cameras] = await Promise.all([fetchModels(), fetchCameras()]);
  const m = models || [];
  const c = cameras || [];

  return (
    <DashboardPageLayout
      header={{
        title: "Models",
        description: "Upload and configure AI models",
        icon: CubeIcon,
      }}
    >
      <ModelList models={m} cameras={c} />
    </DashboardPageLayout>
  );
}
