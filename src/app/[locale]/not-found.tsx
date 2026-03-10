import { ArrowLeft, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <SearchX className="text-muted-foreground h-16 w-16" />
      <h1 className="mt-6 text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-foreground mt-2">{t("description")}</p>
      <Button asChild className="mt-8">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backHome")}
        </Link>
      </Button>
    </div>
  );
}
