import DashboardPageLayout from "@/components/dashboard/layout";
import CameraIcon from "@/components/icons/camera";
import { CameraList } from "@/components/vision/camera-list";
import { mockCameras } from "@/data/vision-mock";

export default function CamerasPage() {
  return (
    <DashboardPageLayout
      header={{
        title: "Cameras",
        description: "Configure and manage camera connections",
        icon: CameraIcon,
      }}
    >
      <CameraList cameras={mockCameras} />
    </DashboardPageLayout>
  );
}
