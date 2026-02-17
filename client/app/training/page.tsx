import DashboardPageLayout from "@/components/dashboard/layout";
import GearIcon from "@/components/icons/gear";

  export default function SettingsPage() {
  return (
    <DashboardPageLayout
      header={{
        title: "Training AI",
        description: "Configure and train AI models",
        icon: GearIcon,
      }}
    >
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
        <GearIcon className="size-10 mb-4 opacity-50" />
        <p>No content available</p>
      </div>
    </DashboardPageLayout>
  );
}
