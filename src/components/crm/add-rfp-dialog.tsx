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

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  agencyName: z.string().min(1, "Agency is required"),
  agencyState: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourcePlatform: z.enum(["SAM_GOV", "BIDNET", "DEMANDSTAR", "STATE_PORTAL", "OTHER"]),
  description: z.string().optional(),
  postedDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedValue: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function AddRFPDialog({ onClose }: { onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sourcePlatform: "OTHER" },
  });

  const { mutate, isPending } = useMutation(
    trpc.rfp.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("RFP added");
        void queryClient.invalidateQueries({ queryKey: trpc.rfp.list.queryKey() });
        onClose();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({
      ...data,
      sourcePlatform: data.sourcePlatform as
        | "SAM_GOV"
        | "BIDNET"
        | "DEMANDSTAR"
        | "STATE_PORTAL"
        | "OTHER",
      postedDate: data.postedDate ? new Date(data.postedDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[#E4E4E7] bg-white text-[#09090B] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#09090B]">Add RFP Opportunity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-[#E4E4E7] bg-white text-[#09090B]"
                      placeholder="RFP for Learning Management System"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="agencyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Agency *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#E4E4E7] bg-white text-[#09090B]"
                        placeholder="Miami-Dade County Schools"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agencyState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">State</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#E4E4E7] bg-white text-[#09090B]"
                        placeholder="FL"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sourcePlatform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#E4E4E7] bg-white text-[#09090B]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-[#E4E4E7] bg-white">
                        <SelectItem value="SAM_GOV" className="text-[#09090B]">
                          SAM.gov
                        </SelectItem>
                        <SelectItem value="BIDNET" className="text-[#09090B]">
                          BidNet
                        </SelectItem>
                        <SelectItem value="DEMANDSTAR" className="text-[#09090B]">
                          DemandStar
                        </SelectItem>
                        <SelectItem value="STATE_PORTAL" className="text-[#09090B]">
                          State Portal
                        </SelectItem>
                        <SelectItem value="OTHER" className="text-[#09090B]">
                          Other
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Est. Value</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#E4E4E7] bg-white text-[#09090B]"
                        placeholder="$50,000"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Posted Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="border-[#E4E4E7] bg-white text-[#09090B]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Due Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="border-[#E4E4E7] bg-white text-[#09090B]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sourceUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Source URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-[#E4E4E7] bg-white text-[#09090B]"
                      placeholder="https://sam.gov/opp/..."
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="border-[#E4E4E7] bg-white text-[#09090B]"
                      rows={3}
                      placeholder="Brief description of the opportunity..."
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
                className="text-[#09090B] hover:text-[#09090B]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
              >
                {isPending ? "Adding…" : "Add RFP"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
