"use client";

import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { signInSchema, type SignInInput } from "@/lib/validators";
import { signIn } from "@/server/auth/client";
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

export function SignInForm() {
  const t = useTranslations("AuthForms");
  const router = useRouter();

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInInput) => {
    const { error } = await signIn.email({
      ...data,
      callbackURL: "/dashboard",
    });

    if (error) {
      toast.error(error.message ?? t("toastSignInError"));
      return;
    }

    toast.success(t("toastSignInSuccess"));
    router.push("/dashboard");
  };

  return (
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("passwordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("passwordPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("signInSubmitting") : t("signInSubmit")}
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          {t("signInNoAccount")}{" "}
          <Link href="/sign-up" className="text-primary underline-offset-4 hover:underline">
            {t("signInNoAccountLink")}
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link
            href="/reset-password"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
