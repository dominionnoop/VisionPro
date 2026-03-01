import * as React from "react";
import { cn } from "@/lib/utils";

export function DashboardRightPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-gap py-4 h-[calc(100vh-var(--header-height))] sticky top-[var(--header-height)] overflow-y-auto custom-scrollbar pr-1 bg-sidebar rounded-2xl px-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
