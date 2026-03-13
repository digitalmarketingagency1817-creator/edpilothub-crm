"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/server/auth/client";
import { UserRole } from "@/generated/prisma";
import { Users, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "ADMIN") {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
        Admin
      </span>
    );
  }
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      Appointment Setter
    </span>
  );
}

// ─── Add User Dialog ──────────────────────────────────────────────────────────

function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.APPOINTMENT_SETTER);
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: createUser, isPending } = useMutation(
    trpc.user.create.mutationOptions({
      onSuccess: () => {
        toast.success("User created");
        void queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
        onClose();
        setName("");
        setEmail("");
        setPassword("");
        setRole(UserRole.APPOINTMENT_SETTER);
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) return;
    createUser({ name: name.trim(), email: email.trim(), password, role });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tm-name">Name</Label>
            <Input
              id="tm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-email">Email</Label>
            <Input
              id="tm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-password">Password</Label>
            <div className="relative">
              <Input
                id="tm-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[#9CA3AF] hover:text-[#374151]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="tm-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRole.APPOINTMENT_SETTER}>Appointment Setter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || password.length < 8}>
              {isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const currentUser = session?.user as { id: string; role?: string } | undefined;

  const { data: users, isLoading } = useQuery(trpc.user.list.queryOptions());
  // Read own role directly from DB — bypasses session cache entirely
  const { data: me } = useQuery(trpc.user.me.queryOptions());
  const isAdmin = me?.role === "ADMIN";

  const { mutate: deleteUser } = useMutation(
    trpc.user.delete.mutationOptions({
      onSuccess: () => {
        toast.success("User deleted");
        void queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const { mutate: updateRole } = useMutation(
    trpc.user.updateRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated");
        void queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
      },
      onError: (err) => toast.error(err.message),
    })
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F4F6]">
      {/* Header */}
      <div className="border-b border-[#E4E4E7] bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF2FF]">
              <Users className="h-5 w-5 text-[#435EBD]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#09090B]">Team</h1>
              <p className="text-sm text-[#6B7280]">Manage your appointment setters and admins</p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Team Member
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-[#E4E4E7] bg-white"
              />
            ))}
          </div>
        ) : !users?.length ? (
          <div className="py-16 text-center text-[#6B7280]">No team members found.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E4E7] bg-[#FAFAFA]">
                  <th className="px-4 py-3 text-left font-semibold text-[#09090B]">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#09090B]">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#09090B]">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#09090B]">Joined</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right font-semibold text-[#09090B]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={idx < users.length - 1 ? "border-b border-[#F4F4F5]" : ""}
                  >
                    <td className="px-4 py-3 font-medium text-[#09090B]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#435EBD] text-xs font-bold text-white">
                          {(u.name ?? "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="rounded bg-[#F4F4F5] px-1.5 py-0.5 text-[10px] text-[#6B7280]">
                            you
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#374151]">{u.email}</td>
                    <td className="px-4 py-3">
                      {isAdmin && u.id !== currentUser?.id ? (
                        <Select
                          value={u.role}
                          onValueChange={(v) => updateRole({ id: u.id, role: v as UserRole })}
                        >
                          <SelectTrigger className="h-7 w-44 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                            <SelectItem value={UserRole.APPOINTMENT_SETTER}>
                              Appointment Setter
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#9CA3AF] hover:text-red-500"
                            onClick={() => deleteUser({ id: u.id })}
                            title="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddUserDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
    </div>
  );
}
