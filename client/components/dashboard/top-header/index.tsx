"use client";

import BellIcon from "@/components/icons/bell";
import GearIcon from "@/components/icons/gear";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sun, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useTheme } from "next-themes";
import { useLayoutStore } from "@/lib/store";
import { useEffect, useMemo, useState } from "react";

const user = {
  name: "Admin",
  avatar: "/avatars/user_krimson.png",
};

export function TopHeader() {
  const { setTheme, theme } = useTheme();
  const { isRightPanelOpen, toggleRightPanel } = useLayoutStore();
  const [backendConnected, setBackendConnected] = useState(false);

  const healthUrl = useMemo(() => {
    return "/health";
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const response = await fetch(healthUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!cancelled) {
          setBackendConnected(response.ok);
        }
      } catch {
        if (!cancelled) {
          setBackendConnected(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [healthUrl]);

  return (
    <header className="sticky top-0 z-50 w-full bg-sidebar rounded-b-2xl">
      <div className="flex h-[var(--header-height)] items-center justify-between px-6">
        {/* Left - Logo Image */}
        <div className="flex items-center gap-4">
          <Image
            src="/assets/logos/logo-fac-vision-dark.png"
            alt="Fac Vision"
            width={160}
            height={51}
            className="h-15 w-auto object-contain dark:hidden"
            priority
          />
          <Image
            src="/assets/logos/logo-fac-vision-light.png"
            alt="Fac Vision"
            width={160}
            height={51}
            className="hidden h-15 w-auto object-contain dark:block"
            priority
          />
        </div>

        {/* Center */}
        <div className="flex-1" />

        {/* Right - Actions and User */}
        <div className="flex items-center gap-3">
          <Badge
            variant={backendConnected ? "outline-success" : "outline-destructive"}
            className="hidden md:inline-flex"
          >
            BE {backendConnected ? "Connected" : "Disconnected"}
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground ml-2"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

        </div>
      </div>
    </header>
  );
}
