import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ContactsBrowser } from "@/components/crm/contacts-browser";
import { TableSkeleton } from "@/components/shared/loading-skeleton";

export const metadata = {
  title: "Contacts — EdPilotHub CRM",
};

export default async function ContactsPage() {
  prefetch(trpc.contact.list.queryOptions({ limit: 100, page: 1 }));

  return (
    <HydrateClient loadingFallback={<TableSkeleton />}>
      <ContactsBrowser />
    </HydrateClient>
  );
}
