import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { RFPDetail } from "@/components/crm/rfp-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RFPDetailPage({ params }: Props) {
  const { id } = await params;
  prefetch(trpc.rfp.getById.queryOptions({ id }));
  return (
    <HydrateClient>
      <RFPDetail id={id} />
    </HydrateClient>
  );
}
