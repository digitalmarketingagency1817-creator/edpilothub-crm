import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PricingPlan = {
  name: string;
  price: string;
  description: string;
  customPrice: boolean;
  popular: boolean;
  features: string[];
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PricingPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PricingPage() {
  const t = await getTranslations("PricingPage");
  const plans = t.raw("plans") as PricingPlan[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-4 text-lg">{t("subtitle")}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.popular && <Badge>{t("popular")}</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <p className="mt-2 text-3xl font-bold">
                {plan.price}
                {!plan.customPrice && (
                  <span className="text-muted-foreground text-sm font-normal">{t("perMonth")}</span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="text-primary h-4 w-4" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full" variant={plan.popular ? "default" : "outline"}>
                {plan.customPrice ? t("contactUs") : t("getStarted")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
