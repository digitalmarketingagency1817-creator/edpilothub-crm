"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/server/auth/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";

export function SchoolNotes({ schoolId }: { schoolId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [content, setContent] = useState("");

  const { data: notes = [], isLoading } = useQuery(trpc.note.list.queryOptions({ schoolId }));

  const { mutate: createNote, isPending: isCreating } = useMutation(
    trpc.note.create.mutationOptions({
      onSuccess: () => {
        setContent("");
        void queryClient.invalidateQueries(trpc.note.list.queryOptions({ schoolId }));
        toast.success("Note added");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const { mutate: deleteNote } = useMutation(
    trpc.note.delete.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.note.list.queryOptions({ schoolId }));
        toast.success("Note deleted");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const userRole = (session?.user as { role?: string } | undefined)?.role;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Add note */}
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Add an internal note… (visible to all team members)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] resize-none border-[#2a2a2a] bg-[#161617] text-white placeholder:text-[#6E6E73]"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => createNote({ schoolId, content })}
            disabled={!content.trim() || isCreating}
            className="bg-[#6247AA] text-white hover:bg-[#5239A1]"
            size="sm"
          >
            {isCreating ? "Saving…" : "Add Note"}
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="text-sm text-[#6E6E73]">Loading notes…</div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-[#6E6E73]">
          <StickyNote className="h-8 w-8" />
          <p className="text-sm">No internal notes yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-[#2a2a2a] bg-[#0F0F0F] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="flex-1 text-sm whitespace-pre-wrap text-[#F2F2F2]">{note.content}</p>
                {(note.userId === session?.user?.id || userRole === "ADMIN") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNote({ id: note.id })}
                    className="h-7 w-7 shrink-0 p-0 text-[#6E6E73] hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#6E6E73]">
                <span>{note.user.name ?? note.user.email}</span>
                <span>·</span>
                <span>{new Date(note.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
