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
      <DialogContent className="border-[#2a2a2a] bg-[#0F0F0F] text-white sm:max-w-lg">
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
                  <FormLabel className="text-[#F2F2F2]">School Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-[#2a2a2a] bg-[#161617] text-white placeholder:text-[#6E6E73]"
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
                    <FormLabel className="text-[#F2F2F2]">City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#2a2a2a] bg-[#161617] text-white placeholder:text-[#6E6E73]"
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
                    <FormLabel className="text-[#F2F2F2]">County</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#2a2a2a] bg-[#161617] text-white placeholder:text-[#6E6E73]"
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
                    <FormLabel className="text-[#F2F2F2]">Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-[#2a2a2a] bg-[#161617] text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="border-[#2a2a2a] bg-[#161617]">
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
                    <FormLabel className="text-[#F2F2F2]">Zip Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#2a2a2a] bg-[#161617] text-white placeholder:text-[#6E6E73]"
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
                    <FormLabel className="text-[#F2F2F2]">Grade Range</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#2a2a2a] bg-[#161617] text-white placeholder:text-[#6E6E73]"
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
                    <FormLabel className="text-[#F2F2F2]">Student Count</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        className="border-[#2a2a2a] bg-[#161617] text-white placeholder:text-[#6E6E73]"
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
                className="text-[#F2F2F2] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#6247AA] text-white hover:bg-[#5239A1]"
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
