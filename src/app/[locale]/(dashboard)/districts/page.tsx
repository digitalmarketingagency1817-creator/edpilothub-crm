import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { DistrictsBrowser } from "@/components/crm/districts-browser";

export const metadata = { title: "Districts — EdPilotHub CRM" };

export default async function DistrictsPage() {
  prefetch(trpc.district.list.queryOptions({ limit: 100 }));
  return (
    <HydrateClient>
      <DistrictsBrowser />
    </HydrateClient>
  );
}
