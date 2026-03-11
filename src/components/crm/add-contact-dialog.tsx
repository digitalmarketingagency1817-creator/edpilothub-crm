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
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
  notes: z.string().optional(),
  isPrimary: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface AddContactDialogProps {
  schoolId: string;
  onClose: () => void;
}

export function AddContactDialog({ schoolId, onClose }: AddContactDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isPrimary: false },
  });

  const { mutate, isPending } = useMutation(
    trpc.contact.create.mutationOptions({
      onSuccess: () => {
        toast.success("Contact added");
        void queryClient.invalidateQueries({
          queryKey: trpc.school.getById.queryKey({ id: schoolId }),
        });
        onClose();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({ ...data, schoolId });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[#E4E4E7] bg-white text-[#09090B] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#09090B]">Add Contact</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-[#E4E4E7] bg-white text-[#09090B]"
                      placeholder="Jane Smith"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-[#E4E4E7] bg-white text-[#09090B]"
                      placeholder="Principal"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="border-[#E4E4E7] bg-white text-[#09090B]"
                        placeholder="jane@school.edu"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#09090B]">Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#E4E4E7] bg-white text-[#09090B]"
                        placeholder="(555) 000-0000"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#09090B]">LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-[#E4E4E7] bg-white text-[#09090B]"
                      placeholder="https://linkedin.com/in/..."
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
                  <FormLabel className="text-[#09090B]">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="border-[#E4E4E7] bg-white text-[#09090B]"
                      placeholder="Any notes about this contact..."
                      rows={3}
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
                {isPending ? "Adding…" : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
