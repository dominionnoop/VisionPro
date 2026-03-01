"use client";

import * as React from "react";
import Image from "next/image";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { TopHeader } from "@/components/dashboard/top-header";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import Widget from "@/components/dashboard/widget";
import Notifications from "@/components/dashboard/notifications";
import Chat from "@/components/chat";
import { MobileChat } from "@/components/chat/mobile-chat";
import { useLayoutStore } from "@/lib/store";
import type { Notification, WidgetData } from "@/types/dashboard";

interface FacVisionLayoutShellProps {
  widgetData: WidgetData;
  notifications: Notification[];
  children: React.ReactNode;
}

export function ClientLayoutShell({
  widgetData,
  notifications,
  children,
}: FacVisionLayoutShellProps) {
  const { isRightPanelOpen } = useLayoutStore();

  return (
    <DashboardLayout
      isRightPanelOpen={isRightPanelOpen}
      topHeader={<TopHeader />}
      sidebar={<DashboardSidebar />}
      mobileHeader={<MobileHeader notifications={notifications} />}
      mobileChat={<MobileChat />}
      rightPanel={
        <div className="space-y-gap py-4 h-[calc(100vh-var(--header-height))] sticky top-[var(--header-height)] overflow-y-auto custom-scrollbar pr-1">
          <Widget
            widgetData={widgetData}
            backgroundContent={
              <Image
                src="/assets/pc_blueprint.gif"
                alt="background"
                width={250}
                height={250}
                className="size-full object-contain"
              />
            }
          />
          <Notifications initialNotifications={notifications} />
          <Chat />
        </div>
      }
    >
      {children}
    </DashboardLayout>
  );
}
