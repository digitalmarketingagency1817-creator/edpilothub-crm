"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export function DistrictsBrowser() {
  const trpc = useTRPC();
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const { data, isFetching } = useQuery({
    ...trpc.district.list.queryOptions({ limit: 50, page, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const districts = data?.districts ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Districts</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-400">{total} districts</p>
            {isFetching && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                Updating…
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search districts…"
          value={search}
          onChange={(e) => {
            void setSearch(e.target.value || null);
            void setPage(1);
          }}
          className="border-slate-700 bg-slate-800 pl-9 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">District Name</TableHead>
              <TableHead className="text-slate-400">County</TableHead>
              <TableHead className="text-slate-400">City</TableHead>
              <TableHead className="text-slate-400">Schools</TableHead>
              <TableHead className="text-slate-400">Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {districts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                  No districts found.
                </TableCell>
              </TableRow>
            ) : (
              districts.map((district) => (
                <TableRow key={district.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-white">{district.name}</TableCell>
                  <TableCell className="text-slate-300">{district.county ?? "—"}</TableCell>
                  <TableCell className="text-slate-300">{district.city ?? "—"}</TableCell>
                  <TableCell className="text-slate-300">
                    {district._count.schools.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {district.website ? (
                      <a
                        href={district.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Visit
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page - 1)}
              disabled={page <= 1}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void setPage(page + 1)}
              disabled={page >= pages}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
