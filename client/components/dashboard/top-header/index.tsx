"use client";

import CameraIcon from "@/components/icons/camera";
import BellIcon from "@/components/icons/bell";
import GearIcon from "@/components/icons/gear";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

const user = {
  name: "Admin",
  avatar: "/avatars/user_krimson.png",
};

export function TopHeader() {
  return (
    <header className="sticky top-0 z-50 w-full bg-sidebar rounded-b-2xl">
      <div className="flex h-[var(--header-height)] items-center justify-between px-6">
        {/* Left - Logo and Brand */}
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CameraIcon className="size-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-display text-foreground">Fac Vision</span>
            <span className="text-xs uppercase text-muted-foreground">Machine Vision System</span>
          </div>
        </div>

        {/* Center - Navigation or Search (optional) */}
        <div className="flex-1" />

        {/* Right - Actions and User */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <BellIcon className="size-5" />
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <GearIcon className="size-5" />
            </Button>
          </Link>
          <div className="ml-2 flex items-center gap-3">
            <div className="size-9 rounded-full overflow-clip bg-primary">
              <Image
                src={user.avatar || "/placeholder.svg"}
                alt={user.name}
                width={36}
                height={36}
                className="size-full object-cover"
              />
            </div>
            <span className="font-display text-lg text-foreground">{user.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
