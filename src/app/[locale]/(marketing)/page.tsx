import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HomePage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HomePage() {
  const t = await getTranslations("HomePage");

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground mt-4">{t("description")}</p>
      <div className="mt-8 flex items-center gap-3">
        <Button asChild>
          <Link href="/dashboard">{t("dashboardCta")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sign-in">{t("signInCta")}</Link>
        </Button>
      </div>
    </div>
  );
}
