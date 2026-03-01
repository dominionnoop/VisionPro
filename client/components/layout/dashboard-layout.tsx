import * as React from "react";
import { cn } from "@/lib/utils";
import { DashboardBackground } from "./background";

export interface DashboardLayoutProps {
  className?: string;
  contentClassName?: string;
  sidebarClassName?: string;
  rightPanelClassName?: string;
  backgroundClassName?: string;
  mobileHeader?: React.ReactNode;
  topHeader?: React.ReactNode;
  sidebar?: React.ReactNode;
  rightPanel?: React.ReactNode;
  mobileChat?: React.ReactNode;
  children: React.ReactNode;
  isRightPanelOpen?: boolean;
}

export function DashboardLayout({
  className,
  contentClassName,
  sidebarClassName,
  rightPanelClassName,
  backgroundClassName,
  mobileHeader,
  topHeader,
  sidebar,
  rightPanel,
  mobileChat,
  children,
  isRightPanelOpen = false,
}: DashboardLayoutProps) {
  return (
    <>
      <DashboardBackground className={backgroundClassName} />
      <div className="lg:hidden">{mobileHeader}</div>
      <div className={cn("flex flex-col min-h-screen", className)}>
        <div className="hidden lg:block">{topHeader}</div>
        <div className={cn("flex flex-1 px-sides gap-gap", contentClassName)}>
          {sidebar ? (
            <div className={cn("hidden lg:block w-[200px] shrink-0", sidebarClassName)}>
              {sidebar}
            </div>
          ) : null}
          <div className="flex-1 min-w-0">{children}</div>
          {rightPanel && isRightPanelOpen ? (
            <div
              className={cn(
                "hidden lg:block w-[320px] shrink-0 animate-in slide-in-from-right-4 duration-300",
                rightPanelClassName,
              )}
            >
              {rightPanel}
            </div>
          ) : null}
        </div>
      </div>
      {mobileChat}
    </>
  );
}
