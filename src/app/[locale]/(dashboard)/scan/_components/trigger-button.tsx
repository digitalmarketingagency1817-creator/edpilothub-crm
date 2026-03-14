"use client";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scan, Loader2 } from "lucide-react";

export function TriggerScanButton() {
  const trpc = useTRPC();

  const { mutate, isPending } = useMutation(
    trpc.scan.triggerWebsiteScan.mutationOptions({
      onSuccess: () => {
        toast.success("Website scan triggered! Running in background every 6h or on-demand.");
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to trigger scan");
      },
    })
  );

  return (
    <Button
      onClick={() => mutate()}
      disabled={isPending}
      className="gap-2 bg-[#435EBD] hover:bg-[#3451a8] text-white"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Scan className="h-4 w-4" />
      )}
      {isPending ? "Triggering…" : "Trigger Website Scan"}
    </Button>
  );
}
