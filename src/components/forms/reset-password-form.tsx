"use client";

import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validators";
import { authClient } from "@/server/auth/client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const t = useTranslations("AuthForms");

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    const { error } = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: "/reset-password",
    });

    if (error) {
      toast.error(error.message ?? t("toastResetError"));
      return;
    }

    toast.success(t("toastResetSuccess"));
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("emailLabel")}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t("emailPlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t("resetSubmitting") : t("resetSubmit")}
          </Button>
        </form>
      </Form>
      <p className="mt-4 text-center text-sm">
        <Link href="/sign-in" className="text-muted-foreground underline-offset-4 hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  );
}
