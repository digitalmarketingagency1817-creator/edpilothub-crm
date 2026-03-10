import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { RFPBrowser } from "@/components/crm/rfp-browser";

export const metadata = { title: "RFP Radar — EdPilotHub CRM" };

export default async function RFPPage() {
  prefetch(trpc.rfp.list.queryOptions({ limit: 50 }));
  return (
    <HydrateClient>
      <RFPBrowser />
    </HydrateClient>
  );
}
