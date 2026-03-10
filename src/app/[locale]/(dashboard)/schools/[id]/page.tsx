import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { SchoolDetail } from "@/components/crm/school-detail";
import { DetailSkeleton } from "@/components/shared/loading-skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SchoolDetailPage({ params }: Props) {
  const { id } = await params;
  prefetch(trpc.school.getById.queryOptions({ id }));

  return (
    <HydrateClient loadingFallback={<DetailSkeleton />}>
      <SchoolDetail id={id} />
    </HydrateClient>
  );
}
