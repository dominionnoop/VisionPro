import React from "react";

interface DashboardPageLayoutProps {
  children: React.ReactNode;

  header: {
    title: string;
    description?: string;
    icon: React.ElementType;
  };
}

export default function DashboardPageLayout({
  children,
  header,
}: DashboardPageLayoutProps) {
  return (
    <div className="flex flex-col relative w-full gap-1 min-h-full py-4">
      {/* Page Header */}
      <div className="flex items-center gap-4 px-6 py-4 bg-card rounded-2xl border border-border/50">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <header.icon className="size-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-display leading-[1]">
            {header.title}
          </h1>
        </div>
        {header.description && (
          <span className="text-xs md:text-sm text-muted-foreground">
            {header.description}
          </span>
        )}
      </div>
      
      {/* Page Content */}
      <div className="min-h-full flex-1 flex flex-col gap-6 py-4">
        {children}
      </div>
    </div>
  );
}
