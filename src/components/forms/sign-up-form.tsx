"use client";

import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { signUpSchema, type SignUpInput } from "@/lib/validators";
import { signUp } from "@/server/auth/client";
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

export function SignUpForm() {
  const t = useTranslations("AuthForms");
  const router = useRouter();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignUpInput) => {
    const { error, data: result } = await signUp.email({
      ...data,
      callbackURL: "/dashboard",
    });

    if (error) {
      toast.error(error.message ?? t("toastSignUpError"));
      return;
    }

    toast.success(t("toastSignUpSuccess"));
    router.push(result?.token ? "/dashboard" : "/verify-email");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("nameLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
          {form.formState.isSubmitting ? t("signUpSubmitting") : t("signUpSubmit")}
        </Button>
        <p className="text-muted-foreground text-center text-sm">
          {t("signUpHasAccount")}{" "}
          <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
            {t("signUpHasAccountLink")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
