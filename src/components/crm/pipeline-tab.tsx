"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PipelineStage } from "@/generated/prisma";

const PIPELINE_STAGES = [
  { value: "UNCONTACTED", label: "Uncontacted" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ENGAGED", label: "Engaged" },
  { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "CLOSED_WON", label: "Closed Won ✅" },
  { value: "CLOSED_LOST", label: "Closed Lost" },
  { value: "NOT_A_FIT", label: "Not a Fit" },
];

const schema = z.object({
  stage: z.nativeEnum(PipelineStage),
  notes: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  lastContactedAt: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface PipelineTabProps {
  schoolId: string;
  pipeline: {
    stage: PipelineStage;
    notes: string | null;
    nextFollowUpAt: Date | null;
    lastContactedAt: Date | null;
  } | null;
}

export function PipelineTab({ schoolId, pipeline }: PipelineTabProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      stage: pipeline?.stage ?? PipelineStage.UNCONTACTED,
      notes: pipeline?.notes ?? "",
      nextFollowUpAt: pipeline?.nextFollowUpAt
        ? new Date(pipeline.nextFollowUpAt).toISOString().split("T")[0]
        : "",
      lastContactedAt: pipeline?.lastContactedAt
        ? new Date(pipeline.lastContactedAt).toISOString().split("T")[0]
        : "",
    },
  });

  const { mutate, isPending } = useMutation(
    trpc.pipeline.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Pipeline updated");
        void queryClient.invalidateQueries({
          queryKey: trpc.school.getById.queryKey({ id: schoolId }),
        });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({
      schoolId,
      stage: data.stage,
      notes: data.notes,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
      lastContactedAt: data.lastContactedAt ? new Date(data.lastContactedAt) : undefined,
    });
  };

  return (
    <Card className="max-w-xl border-[#E4E4E7] bg-white">
      <CardHeader>
        <CardTitle className="text-base text-white">Pipeline Status</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-[#E4E4E7] bg-[#F8F8F8] text-white">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border-[#E4E4E7] bg-[#F8F8F8]">
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-white">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastContactedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Last Contacted</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="border-[#E4E4E7] bg-[#F8F8F8] text-white"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextFollowUpAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Next Follow-up</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="border-[#E4E4E7] bg-[#F8F8F8] text-white"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="border-[#E4E4E7] bg-[#F8F8F8] text-white"
                      rows={4}
                      placeholder="Pipeline notes..."
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isPending ? "Saving…" : "Save Pipeline"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
