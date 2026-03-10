"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const OUTCOMES = [
  { value: "NO_ANSWER", label: "No Answer" },
  { value: "LEFT_VOICEMAIL", label: "Left Voicemail" },
  { value: "SPOKE_TO_GATEKEEPER", label: "Spoke to Gatekeeper" },
  { value: "CONNECTED", label: "Connected" },
  { value: "MEETING_BOOKED", label: "Meeting Booked" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
  { value: "CALLBACK_SCHEDULED", label: "Callback Scheduled" },
  { value: "EMAIL_SENT", label: "Email Sent" },
  { value: "EMAIL_OPENED", label: "Email Opened" },
  { value: "EMAIL_REPLIED", label: "Email Replied" },
];

const schema = z.object({
  type: z.enum(["CALL", "EMAIL", "LINKEDIN", "OTHER"]),
  direction: z.enum(["OUTBOUND", "INBOUND"]),
  subject: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  scheduledFollowUp: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface LogOutreachDialogProps {
  schoolId: string;
  onClose: () => void;
}

export function LogOutreachDialog({ schoolId, onClose }: LogOutreachDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "CALL", direction: "OUTBOUND" },
  });

  const { mutate, isPending } = useMutation(
    trpc.outreach.create.mutationOptions({
      onSuccess: () => {
        toast.success("Outreach logged");
        void queryClient.invalidateQueries({
          queryKey: trpc.school.getById.queryKey({ id: schoolId }),
        });
        void queryClient.invalidateQueries({ queryKey: trpc.outreach.listAll.queryKey() });
        onClose();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({
      schoolId,
      type: data.type as "CALL" | "EMAIL" | "LINKEDIN" | "OTHER",
      direction: data.direction as "OUTBOUND" | "INBOUND",
      subject: data.subject,
      outcome: data.outcome as Parameters<typeof mutate>[0]["outcome"],
      notes: data.notes,
      scheduledFollowUp: data.scheduledFollowUp ? new Date(data.scheduledFollowUp) : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Log Outreach</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-slate-700 bg-slate-800">
                        <SelectItem value="CALL" className="text-white">
                          📞 Call
                        </SelectItem>
                        <SelectItem value="EMAIL" className="text-white">
                          📧 Email
                        </SelectItem>
                        <SelectItem value="LINKEDIN" className="text-white">
                          💼 LinkedIn
                        </SelectItem>
                        <SelectItem value="OTHER" className="text-white">
                          Other
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Direction</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-slate-700 bg-slate-800">
                        <SelectItem value="OUTBOUND" className="text-white">
                          Outbound
                        </SelectItem>
                        <SelectItem value="INBOUND" className="text-white">
                          Inbound
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Outcome</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                        <SelectValue placeholder="Select outcome…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="border-slate-700 bg-slate-800">
                      {OUTCOMES.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-white">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Subject</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-slate-700 bg-slate-800 text-white"
                      placeholder="Brief subject"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="border-slate-700 bg-slate-800 text-white"
                      rows={3}
                      placeholder="What happened?"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduledFollowUp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Schedule Follow-up</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="border-slate-700 bg-slate-800 text-white"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-slate-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending ? "Logging…" : "Log Outreach"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
