"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { NavContent } from "@/components/layout/nav-content";

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <aside
      className={cn(
        "bg-background hidden border-r transition-all duration-300 md:flex md:flex-col",
        sidebarOpen ? "md:w-64" : "md:w-0 md:overflow-hidden"
      )}
    >
      <NavContent />
    </aside>
  );
}
