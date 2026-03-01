import DashboardPageLayout from "@/components/dashboard/layout";
import MonitorIcon from "@/components/icons/monitor";
import { CameraList } from "@/components/vision/camera-list";
import { fetchCameras } from "@/data/vision-api";

export default async function CamerasPage() {
  const cameras = (await fetchCameras()) || [];

  return (
    <DashboardPageLayout
      header={{
        title: "Vision Sources",
        description: "Configure and manage vision source connections",
        icon: MonitorIcon,
      }}
    >
      <CameraList cameras={cameras} />
    </DashboardPageLayout>
  );
}
