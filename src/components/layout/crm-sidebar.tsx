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
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const navItems = [
  { href: "/schools", label: "Schools", icon: School },
  { href: "/districts", label: "Districts", icon: Building2 },
  { href: "/rfp", label: "RFP Radar", icon: FileText },
  { href: "/outreach", label: "Outreach", icon: MessageSquare },
];

const adminItems = [{ href: "/settings", label: "Settings", icon: Settings }];

export function CRMSidebar() {
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
    <aside className="flex h-screen w-64 flex-shrink-0 flex-col" style={{ background: "#0f172a" }}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "#3b82f6" }}
          >
            <School className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">EdPilotHub</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        <div className="mb-2">
          <p className="px-3 py-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            CRM
          </p>
        </div>

        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href as Parameters<typeof Link>[0]["href"]}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
                {active && <ChevronRight className="ml-auto h-3 w-3" />}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="mt-4 mb-2">
              <p className="px-3 py-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Admin
              </p>
            </div>
            {adminItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href as Parameters<typeof Link>[0]["href"]}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
            <AvatarFallback className="bg-blue-600 text-xs text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name ?? "Agent"}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
