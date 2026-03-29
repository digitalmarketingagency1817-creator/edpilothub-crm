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

interface Contact {
  id: string;
  schoolId: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  linkedinUrl: string | null;
  notes: string | null;
}

interface EditContactDialogProps {
  contact: Contact;
  onClose: () => void;
}

export function EditContactDialog({ contact, onClose }: EditContactDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: contact.name,
      title: contact.title ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      linkedinUrl: contact.linkedinUrl ?? "",
      notes: contact.notes ?? "",
      isPrimary: contact.isPrimary,
    },
  });

  const { mutate, isPending } = useMutation(
    trpc.contact.update.mutationOptions({
      onSuccess: () => {
        toast.success("Contact updated");
        void queryClient.invalidateQueries({
          queryKey: trpc.school.getById.queryKey({ id: contact.schoolId }),
        });
        void queryClient.invalidateQueries({ queryKey: trpc.contact.list.queryKey() });
        onClose();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({ id: contact.id, ...data });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[#E4E4E7] bg-white text-[#09090B] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#09090B]">Edit Contact</DialogTitle>
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
                    <Input {...field} className="border-[#E4E4E7] bg-white text-[#09090B]" />
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
                      <Input {...field} className="border-[#E4E4E7] bg-white text-[#09090B]" />
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
                      rows={3}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={form.watch("isPrimary")}
                onChange={(e) => form.setValue("isPrimary", e.target.checked)}
                className="h-4 w-4 accent-[#435EBD]"
              />
              <label htmlFor="isPrimary" className="text-sm text-[#09090B]">
                Set as primary contact
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} className="text-[#09090B]">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#435EBD] text-white hover:bg-[#3B52A8]"
              >
                {isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
