import { Card, CardContent } from "@/components/ui/card";
import FolderIcon from "@/components/icons/folder";
import CameraIcon from "@/components/icons/camera";
import CubeIcon from "@/components/icons/cube";
import MonitorIcon from "@/components/icons/monitor";

interface ProjectStatsProps {
  totalProjects: number;
  activeProjects: number;
  totalCameras: number;
  totalModels: number;
}

export function ProjectStats({
  totalProjects,
  activeProjects,
  totalCameras,
  totalModels,
}: ProjectStatsProps) {
  const stats = [
    {
      label: "Total Projects",
      value: totalProjects,
      icon: FolderIcon,
      color: "bg-primary",
    },
    {
      label: "Active Projects",
      value: activeProjects,
      icon: MonitorIcon,
      color: "bg-success",
    },
    {
      label: "Connected Cameras",
      value: totalCameras,
      icon: CameraIcon,
      color: "bg-chart-2",
    },
    {
      label: "Loaded Models",
      value: totalModels,
      icon: CubeIcon,
      color: "bg-chart-3",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${stat.color} text-primary-foreground`}
              >
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-display">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
