import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { SchoolsBrowser } from "@/components/crm/schools-browser";

export const metadata = {
  title: "Schools — EdPilotHub CRM",
};

export default async function SchoolsPage() {
  prefetch(
    trpc.school.list.queryOptions({
      limit: 50,
      page: 1,
    })
  );

  return (
    <HydrateClient>
      <SchoolsBrowser />
    </HydrateClient>
  );
}
