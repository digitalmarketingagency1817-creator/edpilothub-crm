"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUploadProps {
  onUploadComplete?: (url: string) => void;
  accept?: string;
  handleUploadUrl?: string;
}

export function FileUpload({
  onUploadComplete,
  accept = "image/*",
  handleUploadUrl = "/api/upload",
}: FileUploadProps) {
  const t = useTranslations("Upload");
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: async (file: File) => {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl,
      });
      return blob.url;
    },
    onSuccess: (url) => {
      onUploadComplete?.(url);
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  const handleUpload = () => {
    const file = inputRef.current?.files?.[0];
    if (file) mutate(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input ref={inputRef} type="file" accept={accept} disabled={isPending} />
        <Button type="button" onClick={handleUpload} disabled={isPending} size="sm">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("uploading")}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {t("upload")}
            </>
          )}
        </Button>
      </div>
      {isError && (
        <p className="text-destructive flex items-center gap-1 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error instanceof Error ? error.message : t("uploadFailed")}
        </p>
      )}
    </div>
  );
}
