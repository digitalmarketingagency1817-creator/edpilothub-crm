import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { OutreachFeed } from "@/components/crm/outreach-feed";

export const metadata = { title: "Outreach — EdPilotHub CRM" };

export default async function OutreachPage() {
  prefetch(trpc.outreach.listAll.queryOptions({ limit: 50 }));
  return (
    <HydrateClient>
      <OutreachFeed />
    </HydrateClient>
  );
}
