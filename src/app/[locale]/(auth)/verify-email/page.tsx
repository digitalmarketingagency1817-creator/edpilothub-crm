import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AuthPages");
  return {
    title: t("verifyEmailMetaTitle"),
    description: t("verifyEmailMetaDescription"),
  };
}

export default async function VerifyEmailPage() {
  const t = await getTranslations("AuthPages");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <MailCheck className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">{t("verifyEmailTitle")}</CardTitle>
          <CardDescription>{t("verifyEmailDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("verifyEmailHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
