"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
import { ImageIcon, Loader2, PlusIcon, XIcon } from "lucide-react";
import { createPostSchema, type CreatePostInput } from "@/lib/validators";
import { useTRPC } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CreatePostForm() {
  const t = useTranslations("CreatePost");
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const imageUrl = form.watch("imageUrl");

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      return blob.url;
    },
    onSuccess: (url) => {
      form.setValue("imageUrl", url);
      setUploadError(undefined);
    },
    onError: (err) => {
      setUploadError(err instanceof Error ? err.message : t("uploadErrorFallback"));
    },
  });

  const createPost = useMutation(
    trpc.post.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.post.list.queryKey() });
        form.reset();
        setUploadError(undefined);
        setOpen(false);
      },
    })
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError(t("uploadTypeError"));
        return;
      }
      setUploadError(undefined);
      uploadImage.mutate(file);
    },
    [t, uploadImage]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onSubmit = (data: CreatePostInput) => {
    createPost.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          {t("newPost")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("titleLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("titlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contentLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("contentPlaceholder")}
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>{t("imageLabel")}</FormLabel>
              {imageUrl ? (
                <div className="relative overflow-hidden rounded-md border">
                  <Image
                    src={imageUrl}
                    alt={t("imagePreviewAlt")}
                    width={480}
                    height={270}
                    className="h-48 w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => form.setValue("imageUrl", undefined)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={onDrop}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50",
                    uploadImage.isPending && "pointer-events-none opacity-60"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.target.value = "";
                    }}
                  />
                  {uploadImage.isPending ? (
                    <>
                      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                      <p className="text-muted-foreground text-sm">{t("uploading")}</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="text-muted-foreground h-8 w-8" />
                      <p className="text-muted-foreground text-sm">{t("dropzonePrompt")}</p>
                      <p className="text-muted-foreground/60 text-xs">{t("dropzoneHint")}</p>
                    </>
                  )}
                </div>
              )}
              {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
            </FormItem>

            {createPost.error && (
              <p className="text-destructive text-sm">{createPost.error.message}</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createPost.isPending || uploadImage.isPending}>
                {createPost.isPending ? t("createSubmitting") : t("createSubmit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
