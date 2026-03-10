"use client";

import type { ComponentType, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export { type FallbackProps } from "react-error-boundary";

export function QueryErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const t = useTranslations("Errors");

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-destructive h-5 w-5" />
          <CardTitle className="text-base">{t("queryFailed")}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : t("unexpected")}
        </p>
        <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
          {t("tryAgain")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function QueryErrorBoundary({
  children,
  fallbackComponent,
  resetKeys,
}: {
  children: ReactNode;
  fallbackComponent?: ComponentType<FallbackProps>;
  resetKeys?: Array<unknown>;
}) {
  return (
    <ErrorBoundary
      FallbackComponent={fallbackComponent ?? QueryErrorFallback}
      resetKeys={resetKeys}
    >
      {children}
    </ErrorBoundary>
  );
}
