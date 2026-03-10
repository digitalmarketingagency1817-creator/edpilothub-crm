import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { RFPDetail } from "@/components/crm/rfp-detail";
import { DetailSkeleton } from "@/components/shared/loading-skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RFPDetailPage({ params }: Props) {
  const { id } = await params;
  prefetch(trpc.rfp.getById.queryOptions({ id }));
  return (
    <HydrateClient loadingFallback={<DetailSkeleton />}>
      <RFPDetail id={id} />
    </HydrateClient>
  );
}
