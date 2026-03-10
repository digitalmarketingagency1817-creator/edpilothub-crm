"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function PostList({ limit = 10 }: { limit?: number }) {
  const t = useTranslations("DashboardPostList");
  const locale = useLocale();
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.post.list.queryOptions({ limit }));

  if (data.posts.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center">{t("empty")}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.posts.map((post) => (
        <Card key={post.id}>
          {post.imageUrl && (
            <div className="overflow-hidden rounded-t-lg">
              <Image
                src={post.imageUrl}
                alt={post.title}
                width={800}
                height={400}
                className="h-48 w-full object-cover"
              />
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{post.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={post.author.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {post.author.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-xs">{post.author.name}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground line-clamp-2 text-sm">{post.content}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              {new Date(post.createdAt).toLocaleDateString(locale)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
