import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 bg-[#2a2a2a]" />
          <Skeleton className="h-4 w-48 bg-[#161617]" />
        </div>
        <Skeleton className="h-9 w-28 bg-[#2a2a2a]" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 bg-[#161617]" />
        <Skeleton className="h-10 w-44 bg-[#161617]" />
        <Skeleton className="h-10 w-48 bg-[#161617]" />
      </div>
      <div className="overflow-hidden rounded-lg border border-[#2a2a2a]">
        <div className="flex gap-4 border-b border-[#2a2a2a] bg-[#0F0F0F] px-4 py-3">
          {[140, 80, 80, 60, 100, 90, 80].map((w, i) => (
            <Skeleton key={i} className="h-4 bg-[#2a2a2a]" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[#2a2a2a]/50 px-4 py-3.5">
            <Skeleton className="h-4 w-48 bg-[#161617]" />
            <Skeleton className="h-4 w-20 bg-[#161617]" />
            <Skeleton className="h-4 w-20 bg-[#161617]" />
            <Skeleton className="h-5 w-16 rounded-full bg-[#161617]" />
            <Skeleton className="h-4 w-24 bg-[#161617]" />
            <Skeleton className="h-5 w-20 rounded-full bg-[#161617]" />
            <Skeleton className="h-4 w-20 bg-[#161617]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 bg-[#2a2a2a]" />
        <Skeleton className="h-7 w-64 bg-[#2a2a2a]" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-[#2a2a2a] p-4">
            <Skeleton className="h-4 w-24 bg-[#2a2a2a]" />
            <Skeleton className="h-6 w-32 bg-[#161617]" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 bg-[#2a2a2a]" />
        ))}
      </div>
      <Skeleton className="h-64 w-full bg-[#161617]" />
    </div>
  );
}

export function PostListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <PostListSkeleton />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
