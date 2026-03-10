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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

type FormData = z.infer<typeof schema>;

interface CreateProposalDialogProps {
  rfpId: string;
  rfpTitle: string;
  onClose: () => void;
}

export function CreateProposalDialog({ rfpId, rfpTitle, onClose }: CreateProposalDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: `Proposal for: ${rfpTitle}`, content: "" },
  });

  const { mutate, isPending } = useMutation(
    trpc.proposal.create.mutationOptions({
      onSuccess: () => {
        toast.success("Proposal created");
        void queryClient.invalidateQueries({ queryKey: trpc.rfp.getById.queryKey({ id: rfpId }) });
        onClose();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({ rfpOpportunityId: rfpId, ...data });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Create Proposal</DialogTitle>
          <p className="text-sm text-slate-400">{rfpTitle}</p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Proposal Title</FormLabel>
                  <FormControl>
                    <Input {...field} className="border-slate-700 bg-slate-800 text-white" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">
                    Proposal Content
                    <span className="ml-2 text-xs text-slate-500">Markdown supported</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-64 border-slate-700 bg-slate-800 font-mono text-sm text-white"
                      placeholder={`# Executive Summary\n\nWe are pleased to submit our proposal for...\n\n## Our Solution\n\n## Pricing\n\n## Timeline`}
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
                {isPending ? "Creating…" : "Create Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
