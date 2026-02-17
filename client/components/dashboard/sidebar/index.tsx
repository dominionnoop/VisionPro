"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FolderIcon from "@/components/icons/folder";
import CameraIcon from "@/components/icons/camera";
import CubeIcon from "@/components/icons/cube";
import MonitorIcon from "@/components/icons/monitor";
import ZapIcon from "@/components/icons/zap";
import GearIcon from "@/components/icons/gear";
import BookIcon from "@/components/icons/book";
import CuteRobotIcon from "@/components/icons/cute-robot";

import { useProjectStore } from "@/lib/store";

// Project specific items
const projectNavItems = [
  {
    title: "Cameras",
    url: "/cameras",
    icon: CameraIcon,
  },
  {
    title: "Models",
    url: "/models",
    icon: CubeIcon,
  },
  {
    title: "Live View",
    url: "/live",
    icon: MonitorIcon,
  },
  {
    title: "Actions",
    url: "/actions",
    icon: ZapIcon,
  },
  {
    title: "Training AI",
    url: "/training",
    icon: CuteRobotIcon,
  },
];

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { selectedProject, setSelectedProject } = useProjectStore();

  return (
    <aside
      className={cn(
        "sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] py-4",
        className
      )}
    >
      <nav className="flex flex-col gap-1 h-full bg-sidebar rounded-2xl p-3">
        {/* Always show Projects (Home) */}
        <Link
          href="/"
          onClick={() => setSelectedProject(null)} // Reset selection when going back to list
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
            pathname === "/"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          )}
        >
          <FolderIcon className="size-5 shrink-0" />
          <span className="text-sm font-medium">Projects</span>
        </Link>

        {/* Project Specific Items - Only if a project is selected */}
        {selectedProject && (
          <div className="mt-4 flex flex-col gap-1 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedProject.name}
            </div>

            {projectNavItems.map((item) => {
              const isActive = pathname === item.url || pathname.startsWith(item.url);

              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="size-5 shrink-0" />
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Non-Project Items */}
        {!selectedProject && (
          <>
            <Link
              href="/training"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                pathname === "/training"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <CuteRobotIcon className="size-5 shrink-0" />
              <span className="text-sm font-medium">Training AI</span>
            </Link>

            <Link
              href="/docs"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors mt-auto",
                pathname === "/docs"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <BookIcon className="size-5 shrink-0" />
              <span className="text-sm font-medium">Documentation</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
