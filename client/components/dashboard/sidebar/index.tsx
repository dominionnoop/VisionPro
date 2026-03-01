"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import FolderIcon from "@/components/icons/folder";
import CameraIcon from "@/components/icons/camera";
import CubeIcon from "@/components/icons/cube";
import MonitorIcon from "@/components/icons/monitor";
import ZapIcon from "@/components/icons/zap";
import BookIcon from "@/components/icons/book";

import { useProjectStore } from "@/lib/store";

// Project specific items
const projectNavItems = [
  {
    title: "Vision Sources",
    url: "/cameras",
    icon: MonitorIcon,
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
];

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const safePathname = pathname ?? "";
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
            safePathname === "/"
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
              const isActive =
                safePathname === item.url ||
                (item.url !== "/" && safePathname.startsWith(item.url));

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
              href="/docs"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors mt-auto",
                safePathname === "/docs"
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
