import * as React from "react";
import { cn } from "@/lib/utils";

export interface DashboardBackgroundProps {
  className?: string;
  overlayClassName?: string;
  children?: React.ReactNode;
}

export function DashboardBackground({
  className,
  overlayClassName,
  children,
}: DashboardBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 -z-10",
        "bg-gradient-to-br from-background via-background to-background/95",
        className,
      )}
    >
      {/* subtle dot-grid pattern overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-[0.03]",
          "bg-[radial-gradient(circle,_currentColor_1px,_transparent_1px)]",
          "bg-[size:24px_24px]",
          overlayClassName,
        )}
      />
      {children}
    </div>
  );
}
