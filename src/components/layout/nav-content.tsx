"use client";

import { useTranslations } from "next-intl";
import { LayoutDashboard, Settings } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function NavContent() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const navItems = [
    { href: "/dashboard" as const, label: t("dashboard"), icon: LayoutDashboard },
    { href: "/settings" as const, label: t("settings"), icon: Settings },
  ];

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-6 px-2">
        <h2 className="text-lg font-semibold">{APP_NAME}</h2>
      </div>
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "secondary" : "ghost"}
          className="w-full justify-start"
          asChild
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
