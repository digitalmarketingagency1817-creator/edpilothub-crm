import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/components/forms/sign-in-form";
import { auth } from "@/server/auth";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sign In — EdPilotHub CRM",
  description: "Sign in to your EdPilotHub CRM account",
};

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F3F4F6]">
      <div className="mb-8">
        <Image
          src="/logo.jpg"
          alt="EdPilotHub"
          width={180}
          height={48}
          className="h-12 w-auto object-contain"
          priority
        />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-[#09090B]">Welcome back</CardTitle>
          <CardDescription className="text-[#6B7280]">Sign in to your CRM account</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
      <p className="mt-6 text-xs text-[#9CA3AF]">
        © {new Date().getFullYear()} EdPilotHub. All rights reserved.
      </p>
    </div>
  );
}
