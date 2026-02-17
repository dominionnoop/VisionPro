import React from "react"
// import { Roboto_Mono, Inter } from "next/font/google"; // Disabled for offline support
import "./globals.css";
import { Metadata } from "next";
import { V0Provider } from "@/lib/v0-context";
import localFont from "next/font/local";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { TopHeader } from "@/components/dashboard/top-header";
import mockDataJson from "@/mock.json";
import type { MockData } from "@/types/dashboard";
import Widget from "@/components/dashboard/widget";
import Notifications from "@/components/dashboard/notifications";
import { MobileChat } from "@/components/chat/mobile-chat";
import Chat from "@/components/chat";

const mockData = mockDataJson as MockData;


// const inter = Inter({
//   variable: "--font-inter",
//   subsets: ["latin"],
// });

// const robotoMono = Roboto_Mono({
//   variable: "--font-roboto-mono",
//   subsets: ["latin"],
// });

// const rebelGrotesk = localFont({
//   src: "../public/fonts/Rebels-Fett.woff2",
//   variable: "--font-rebels",
//   display: "swap",
// });

// ...

const isV0 = process.env["VERCEL_URL"]?.includes("vusercontent.net") ?? false;

export const metadata: Metadata = {
  title: {
    template: "%s – Fac Vision",
    default: "Fac Vision",
  },
  description:
    "Industrial Machine Vision Inspection System - AI-powered quality control and monitoring.",
  generator: 'v0.app'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/Rebels-Fett.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`antialiased font-sans`} // Removed fonts temporarily
      >
        <V0Provider isV0={isV0}>
          <SidebarProvider>
            {/* Mobile Header - only visible on mobile */}
            <MobileHeader mockData={mockData} />

            {/* Desktop Layout with Top Header */}
            <div className="hidden lg:flex flex-col min-h-screen">
              {/* Top Header Bar - Full Width */}
              <TopHeader />

              {/* Content Area with Sidebar */}
              <div className="flex flex-1 px-sides gap-gap">
                {/* Left Sidebar - Below Header */}
                <div className="w-[200px] shrink-0">
                  <DashboardSidebar />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">{children}</div>

                {/* Right Panel */}
                <div className="w-[320px] shrink-0">
                  <div className="space-y-gap py-4 h-[calc(100vh-var(--header-height))] sticky top-[var(--header-height)] overflow-y-auto">
                    <Widget widgetData={mockData.widgetData} />
                    <Notifications
                      initialNotifications={mockData.notifications}
                    />
                    <Chat />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden">
              {children}
            </div>

            {/* Mobile Chat - floating CTA with drawer */}
            <MobileChat />
          </SidebarProvider>
        </V0Provider>
      </body>
    </html>
  );
}
