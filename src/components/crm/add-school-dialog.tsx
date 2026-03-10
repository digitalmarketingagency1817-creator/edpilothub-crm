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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  schoolType: z.enum(["PUBLIC", "PRIVATE", "CHARTER"]),
  gradeRange: z.string().optional(),
  studentCount: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddSchoolDialogProps {
  onClose: () => void;
}

export function AddSchoolDialog({ onClose }: AddSchoolDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { state: "FL", schoolType: "PUBLIC" },
  });

  const { mutate, isPending } = useMutation(
    trpc.school.create.mutationOptions({
      onSuccess: () => {
        toast.success("School added");
        void queryClient.invalidateQueries({ queryKey: trpc.school.list.queryKey() });
        onClose();
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const onSubmit = (data: FormData) => {
    mutate({
      ...data,
      schoolType: data.schoolType as "PUBLIC" | "PRIVATE" | "CHARTER",
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-slate-700 bg-slate-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Add School</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">School Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                      placeholder="Lincoln Elementary School"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                        placeholder="Miami"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">County</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                        placeholder="Miami-Dade"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schoolType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-slate-700 bg-slate-800">
                        <SelectItem value="PUBLIC" className="text-white">
                          Public
                        </SelectItem>
                        <SelectItem value="PRIVATE" className="text-white">
                          Private
                        </SelectItem>
                        <SelectItem value="CHARTER" className="text-white">
                          Charter
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Zip Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                        placeholder="33101"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gradeRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Grade Range</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                        placeholder="K-5"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Student Count</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                        placeholder="500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
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
                {isPending ? "Adding…" : "Add School"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
