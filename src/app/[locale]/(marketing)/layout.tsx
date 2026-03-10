import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("MarketingLayout");
  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/pricing", label: t("pricing") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <LocaleSwitcher />
            <Button asChild size="sm">
              <Link href="/sign-in">{t("signIn")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
          <p className="text-muted-foreground text-sm">
            {t("rightsReserved", { year: new Date().getFullYear() })}
          </p>
          <nav className="flex gap-4">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {t("pricing")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
