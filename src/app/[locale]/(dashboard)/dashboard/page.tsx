import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/server/auth";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { PostList } from "@/components/dashboard/post-list";
import { CreatePostForm } from "@/components/dashboard/create-post-form";
import { PostListSkeleton } from "@/components/shared/loading-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashboardPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const t = await getTranslations("DashboardPage");

  if (!session) redirect("/sign-in");

  prefetch(trpc.post.list.queryOptions({ limit: 10 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("welcome", { name: session.user.name ?? "" })}</p>
        </div>
        <CreatePostForm />
      </div>

      <HydrateClient loadingFallback={<PostListSkeleton />}>
        <PostList limit={10} />
      </HydrateClient>
    </div>
  );
}
