import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/constants";

export default async function RootNotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "NotFound" });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center">
        <SearchX className="text-muted-foreground h-16 w-16" />
        <h1 className="mt-6 text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backHome")}
        </Link>
        <title>{`404 | ${APP_NAME}`}</title>
      </body>
    </html>
  );
}
