import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SettingsPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const t = await getTranslations("SettingsPage");

  if (!session) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>{t("profileTitle")}</CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm font-medium">{t("name")}</p>
            <p className="text-muted-foreground text-sm">{session.user.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{t("email")}</p>
            <p className="text-muted-foreground text-sm">{session.user.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
