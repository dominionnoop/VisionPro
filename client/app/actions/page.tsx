import DashboardPageLayout from "@/components/dashboard/layout";
import ZapIcon from "@/components/icons/zap";
import { ActionSettings } from "@/components/vision/action-settings";

export default function ActionsPage() {
  return (
    <DashboardPageLayout
      header={{
        title: "Actions",
        description: "Configure output actions and integrations",
        icon: ZapIcon,
      }}
    >
      <ActionSettings />
    </DashboardPageLayout>
  );
}
