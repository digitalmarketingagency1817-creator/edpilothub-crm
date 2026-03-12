"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { signOut, useSession } from "@/server/auth/client";
import {
  School,
  Building2,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Kanban,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const navItems = [
  { href: "/schools", label: "Schools", icon: School },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/opportunities", label: "Opportunities", icon: Target },
  { href: "/districts", label: "Districts", icon: Building2 },
  { href: "/rfp", label: "RFP Radar", icon: FileText },
  { href: "/outreach", label: "Outreach", icon: MessageSquare },
];

const adminItems = [{ href: "/settings", label: "Settings", icon: Settings }];

interface CRMSidebarProps {
  onClose?: () => void;
}

export function CRMSidebar({ onClose }: CRMSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user;
  const isAdmin = (user as { role?: string } | undefined)?.role === "ADMIN";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/sign-in");
  };

  return (
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col border-r border-[#E4E4E7] bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-[#E4E4E7] px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#435EBD]">
            <School className="h-4 w-4 text-[#09090B]" />
          </div>
          <span className="text-sm font-bold tracking-tight text-[#09090B]">EdPilotHub</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#374151] hover:bg-[#F4F4F5] hover:text-[#09090B] md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href as Parameters<typeof Link>[0]["href"]}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-l-2 border-[#435EBD] bg-[#EEF2FF] pl-[10px] text-[#435EBD]"
                    : "text-[#374151] hover:bg-[#F4F4F5] hover:text-[#09090B]"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="mt-6 mb-2 px-2 text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase">
              Admin
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href as Parameters<typeof Link>[0]["href"]}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "border-l-2 border-[#435EBD] bg-[#EEF2FF] pl-[10px] text-[#435EBD]"
                        : "text-[#374151] hover:bg-[#F4F4F5] hover:text-[#09090B]"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-[#E4E4E7] px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#435EBD] text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#09090B]">{user?.name ?? "User"}</p>
            <p className="truncate text-xs text-[#374151]">{user?.email}</p>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="rounded-md p-1.5 text-[#374151] hover:bg-[#F4F4F5] hover:text-[#09090B]"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
