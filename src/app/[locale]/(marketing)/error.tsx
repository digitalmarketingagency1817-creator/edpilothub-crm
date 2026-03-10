"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");

  useEffect(() => {
    console.error("Marketing error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <AlertTriangle className="text-destructive h-12 w-12" />
      <h2 className="text-xl font-semibold">{t("marketingTitle")}</h2>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        {t("marketingDescription")}
      </p>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
