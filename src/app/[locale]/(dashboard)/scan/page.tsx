import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TriggerScanButton } from "./_components/trigger-button";
import { Globe, School, BarChart3 } from "lucide-react";

interface CountyRow {
  county: string;
  missing: number;
  total: number;
}

async function getScanStats() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = db as any;

  const [withWebsite, total, countyData] = await Promise.all([
    p.school.count({ where: { website: { not: null } } }) as Promise<number>,
    p.school.count() as Promise<number>,
    p.$queryRaw`
      SELECT
        county,
        COUNT(*) FILTER (WHERE website IS NULL)::int AS missing,
        COUNT(*)::int AS total
      FROM "School"
      WHERE county IS NOT NULL
      GROUP BY county
      ORDER BY missing DESC
      LIMIT 15
    ` as Promise<CountyRow[]>,
  ]);

  const pct = total > 0 ? Math.round((withWebsite / total) * 100) : 0;
  return { withWebsite, total, pct, countyData };
}

export default async function ScanPage() {
  const { withWebsite, total, pct, countyData } = await getScanStats();
  const missing = total - withWebsite;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#09090B]">Website Scanner</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Find and verify school websites using DuckDuckGo search
          </p>
        </div>
        <TriggerScanButton />
      </div>

      {/* Coverage stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border border-[#E4E4E7] bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              With Website
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#09090B]">{withWebsite.toLocaleString()}</p>
            <Badge className="mt-2 bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] border-0 text-xs">
              {pct}% coverage
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-[#E4E4E7] bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] flex items-center gap-2">
              <School className="h-3.5 w-3.5" />
              Missing Website
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#09090B]">{missing.toLocaleString()}</p>
            <Badge className="mt-2 bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7] border-0 text-xs">
              {100 - pct}% remaining
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-[#E4E4E7] bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-[#6B7280] flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Total Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#09090B]">{total.toLocaleString()}</p>
            <Badge className="mt-2 bg-[#EEF2FF] text-[#435EBD] hover:bg-[#EEF2FF] border-0 text-xs">
              FL database
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Coverage progress */}
      <Card className="border border-[#E4E4E7] bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#09090B]">Overall Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-[#F4F4F5] rounded-full h-3">
            <div
              className="bg-[#435EBD] h-3 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-[#6B7280]">
            {withWebsite.toLocaleString()} of {total.toLocaleString()} schools have websites
          </p>
        </CardContent>
      </Card>

      {/* County breakdown */}
      <Card className="border border-[#E4E4E7] bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#09090B]">
            Top 15 Counties by Missing Websites
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E4E4E7]">
                <TableHead className="text-xs font-semibold text-[#6B7280] pl-6">County</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7280]">Missing</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7280]">Total</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7280]">Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countyData.map((row) => {
                const coverage =
                  row.total > 0
                    ? Math.round(((row.total - row.missing) / row.total) * 100)
                    : 0;
                return (
                  <TableRow key={row.county} className="border-[#E4E4E7] hover:bg-[#F9FAFB]">
                    <TableCell className="font-medium text-[#09090B] pl-6 capitalize">
                      {row.county.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2] border-0 text-xs"
                      >
                        {row.missing}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#374151]">{row.total}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[#F4F4F5] rounded-full h-1.5">
                          <div
                            className="bg-[#435EBD] h-1.5 rounded-full"
                            style={{ width: `${coverage}%` }}
                          />
                        </div>
                        <span className="text-xs text-[#6B7280]">{coverage}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Schedule info */}
      <Card className="border border-[#E4E4E7] bg-[#EEF2FF] shadow-none">
        <CardContent className="py-4">
          <p className="text-sm text-[#435EBD] font-medium">
            🕐 Automatic scan runs every 6 hours (cron: <code className="font-mono">0 */6 * * *</code>).
            Each run processes 150 schools via DuckDuckGo with 1.5s rate limiting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
