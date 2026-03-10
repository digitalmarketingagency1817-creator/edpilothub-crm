import "server-only";

import { createTRPCOptionsProxy, type TRPCQueryOptions } from "@trpc/tanstack-react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cache, Suspense, type ComponentType } from "react";
import type { FallbackProps } from "react-error-boundary";
import { createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";
import { LoadingFallback } from "@/components/shared/loading-fallback";
import { QueryErrorBoundary } from "@/components/shared/query-error-boundary";

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

interface HydrateClientProps {
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: ComponentType<FallbackProps>;
  resetKeys?: Array<unknown>;
  loadingMessage?: string;
}

export function HydrateClient({
  children,
  loadingFallback,
  errorFallback,
  resetKeys,
  loadingMessage = "Loading...",
}: HydrateClientProps) {
  const queryClient = getQueryClient();

  const defaultLoadingFallback = loadingFallback || <LoadingFallback message={loadingMessage} />;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QueryErrorBoundary fallbackComponent={errorFallback} resetKeys={resetKeys}>
        <Suspense fallback={defaultLoadingFallback}>{children}</Suspense>
      </QueryErrorBoundary>
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(queryOptions: T) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}
