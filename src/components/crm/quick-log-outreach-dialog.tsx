"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
import { useState } from "react";
import { Search } from "lucide-react";

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
  schoolId: z.string().min(1, "School is required"),
  type: z.enum(["CALL", "EMAIL", "LINKEDIN", "OTHER"]),
  outcome: z.string().optional(),
  notes: z.string().optional(),
  scheduledFollowUp: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function QuickLogOutreachDialog({ onClose }: { onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);

  const { data: schoolData } = useSuspenseQuery(
    trpc.school.list.queryOptions({
      limit: 10,
      search: schoolSearch || undefined,
    })
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "CALL" },
  });

  const { mutate, isPending } = useMutation(
    trpc.outreach.create.mutationOptions({
      onSuccess: () => {
        toast.success("Activity logged");
        void queryClient.invalidateQueries({ queryKey: trpc.outreach.listAll.queryKey() });
        onClose();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({
      schoolId: data.schoolId,
      type: data.type as "CALL" | "EMAIL" | "LINKEDIN" | "OTHER",
      direction: "OUTBOUND",
      outcome: data.outcome as Parameters<typeof mutate>[0]["outcome"],
      notes: data.notes,
      scheduledFollowUp: data.scheduledFollowUp ? new Date(data.scheduledFollowUp) : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Log Outreach Activity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* School search */}
            <FormItem>
              <FormLabel className="text-slate-300">School *</FormLabel>
              {selectedSchool ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
                  <span className="text-sm text-white">{selectedSchool.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSchool(null);
                      form.setValue("schoolId", "");
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      placeholder="Search school name..."
                      className="border-slate-700 bg-slate-800 pl-9 text-white placeholder:text-slate-500"
                    />
                  </div>
                  {schoolSearch && schoolData.schools.length > 0 && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800">
                      {schoolData.schools.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          onClick={() => {
                            setSelectedSchool(school);
                            form.setValue("schoolId", school.id);
                            setSchoolSearch("");
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-300 first:rounded-t-lg last:rounded-b-lg hover:bg-slate-700 hover:text-white"
                        >
                          <span className="font-medium">{school.name}</span>
                          {school.city && <span className="text-slate-500">{school.city}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </FormItem>

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
                {isPending ? "Logging…" : "Log Activity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
