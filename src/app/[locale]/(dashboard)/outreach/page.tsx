import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { OutreachFeed } from "@/components/crm/outreach-feed";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

export const metadata = { title: "Outreach — EdPilotHub CRM" };

export default async function OutreachPage() {
  prefetch(trpc.outreach.listAll.queryOptions({ limit: 50 }));
  return (
    <HydrateClient loadingFallback={<TableSkeleton />}>
      <OutreachFeed />
    </HydrateClient>
  );
}
