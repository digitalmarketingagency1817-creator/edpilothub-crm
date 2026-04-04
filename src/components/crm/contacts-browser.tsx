"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Search, Mail, Phone, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 50;

export function ContactsBrowser() {
  const trpc = useTRPC();
  const router = useRouter();
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const { data } = useSuspenseQuery(
    trpc.contact.list.queryOptions({
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    })
  );

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void setSearch(e.target.value || null);
      void setPage(1); // reset to page 1 on new search
    },
    [setSearch, setPage]
  );

  const handlePrev = () => void setPage(Math.max(1, page - 1));
  const handleNext = () => void setPage(Math.min(totalPages, page + 1));

  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#09090B]">Contacts</h1>
            <p className="mt-1 text-sm text-[#374151]">
              {total > 0 ? (
                <>
                  <span className="font-medium text-[#435EBD]">{total}</span> contact
                  {total !== 1 ? "s" : ""} across all schools
                </>
              ) : (
                "All contacts across schools"
              )}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#374151]" />
            <Input
              value={search}
              onChange={handleSearch}
              placeholder="Search by name or email…"
              className="h-9 border-[#E4E4E7] bg-white pl-9 text-sm text-[#09090B] placeholder:text-[#9CA3AF]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#374151]">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">
              {search ? "No contacts match your search" : "No contacts yet"}
            </p>
            {search && (
              <button
                onClick={() => void setSearch(null)}
                className="text-xs text-[#435EBD] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#E4E4E7] hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-[#374151]">Name</TableHead>
                <TableHead className="text-xs font-semibold text-[#374151]">Title</TableHead>
                <TableHead className="text-xs font-semibold text-[#374151]">School</TableHead>
                <TableHead className="text-xs font-semibold text-[#374151]">Email</TableHead>
                <TableHead className="text-xs font-semibold text-[#374151]">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-[#374151]">Primary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer border-[#E4E4E7] hover:bg-[#F9FAFB]"
                  onClick={() => router.push(`/schools/${contact.school.id}`)}
                >
                  <TableCell className="font-medium text-[#09090B]">{contact.name}</TableCell>
                  <TableCell className="text-sm text-[#374151]">{contact.title ?? "—"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/schools/${contact.school.id}` as Parameters<typeof Link>[0]["href"]}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-[#435EBD] hover:underline"
                    >
                      {contact.school.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-[#374151]">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 hover:text-[#435EBD]"
                      >
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        {contact.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[#374151]">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 hover:text-[#435EBD]"
                      >
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        {contact.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.isPrimary && (
                      <Badge className="h-5 bg-[#EEF2FF] px-1.5 text-[10px] text-[#435EBD]">
                        Primary
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[#374151]">
            Showing{" "}
            <span className="font-medium text-[#09090B]">
              {startItem}–{endItem}
            </span>{" "}
            of <span className="font-medium text-[#09090B]">{total}</span> contacts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={page <= 1}
              className="h-8 border-[#E4E4E7] px-3 text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-[#374151]">
              Page <span className="font-medium text-[#09090B]">{page}</span> of{" "}
              <span className="font-medium text-[#09090B]">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={page >= totalPages}
              className="h-8 border-[#E4E4E7] px-3 text-sm"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
