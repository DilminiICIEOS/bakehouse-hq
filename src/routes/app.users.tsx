import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, KeyRound, MoreHorizontal, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProtectedRoute } from "@/components/protected-route";
import { type Role, type User } from "@/lib/mock-data";
import { api } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/auth";

export const Route = createFileRoute("/app/users")({
  component: () => (
    <ProtectedRoute roles={["admin"]}>
      <UsersPage />
    </ProtectedRoute>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, "Min 2 chars").max(80),
  email: z.string().trim().email().max(255),
  role: z.enum(["admin", "manager", "salesperson", "factory_distributor", "customer"]),
});
type FormVals = z.infer<typeof schema>;

function UsersPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.listUsers(),
  });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormVals>({ resolver: zodResolver(schema), defaultValues: { role: "salesperson" } });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", email: "", role: "salesperson" });
    setOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    reset({ name: u.name, email: u.email, role: u.role });
    setOpen(true);
  };

  const createUserMut = useMutation({
    mutationFn: (payload: FormVals) => api.createUser(payload),
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to create user");
    },
  });

  const updateUserMut = useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: FormVals }) =>
      api.updateUser(id, payload),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to update user");
    },
  });

  const toggleStatusMut = useMutation({
    mutationFn: (id: string | number) => api.toggleUserStatus(id),
    onSuccess: () => {
      toast.success("User status updated");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to toggle user status");
    },
  });

  const resetPasswordMut = useMutation({
    mutationFn: (id: string | number) => api.resetUserPassword(id),
    onSuccess: () => {
      toast.success("Password reset email sent");
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to reset password");
    },
  });

  const onSubmit = (v: FormVals) => {
    if (editing) {
      updateUserMut.mutate({ id: editing.id, payload: v });
    } else {
      createUserMut.mutate(v);
    }
  };

  const toggleStatus = (u: User) => {
    toggleStatusMut.mutate(u.id);
  };

  const resetPassword = (u: User) => {
    resetPasswordMut.mutate(u.id);
  };

  const filtered = (users as User[]).filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="User management"
        description="Create accounts, assign roles, and manage access for your outlet team."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New user
          </Button>
        }
      />

      <Card className="rounded-xl p-4">
        <div className="flex justify-between items-center mb-4 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users…"
              className="pl-9"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} of {users.length}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    {ROLE_LABEL[u.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      u.status === "active"
                        ? "bg-chart-4/15 text-chart-4 border-0"
                        : "bg-muted text-muted-foreground border-0"
                    }
                  >
                    {u.status === "active" ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.lastLogin}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(u)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => resetPassword(u)}>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Reset password
                      </DropdownMenuItem>
                      <DisableItem user={u} onConfirm={() => toggleStatus(u)} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                  <SelectItem value="factory_distributor">Factory Distributor</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMut.isPending || updateUserMut.isPending}>
                {editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DisableItem({ user, onConfirm }: { user: User; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className="text-destructive focus:text-destructive"
        >
          {user.status === "active" ? "Disable account" : "Enable account"}
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user.status === "active" ? "Disable" : "Enable"} {user.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user.status === "active"
              ? "They will lose access immediately. You can re-enable them anytime."
              : "They will regain access on next sign in."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
