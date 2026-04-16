"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi, type UserListItem, type Role } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, RotateCcw, Search } from "lucide-react";

const SUB_ROLES = ["Karyawan", "Tukang", "Mitra"] as const;
const SUB_ROLE_COLORS: Record<string, string> = {
  Karyawan: "bg-blue-100 text-blue-700",
  Tukang: "bg-orange-100 text-orange-700",
  Mitra: "bg-purple-100 text-purple-700",
};

interface UserFormData {
  name: string;
  email: string;
  password: string;
  whatsapp_number: string | undefined;
  sub_role: string;
  role_ids: number[];
}

const EMPTY_FORM: UserFormData = { name: "", email: "", password: "", whatsapp_number: "", sub_role: "Karyawan", role_ids: [] };

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page] = useState(1);
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search, page],
    queryFn: () => adminApi.listUsers({ page, per_page: 20, search: search || undefined }),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => adminApi.listRoles(),
  });

  const createMutation = useMutation({
    mutationFn: (d: UserFormData) => adminApi.createUser({ ...d, whatsapp_number: d.whatsapp_number || undefined }),
    onSuccess: () => { toast.success("User berhasil dibuat"); qc.invalidateQueries({ queryKey: ["users"] }); setOpen(false); setForm(EMPTY_FORM); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal membuat user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserFormData> }) => adminApi.updateUser(id, data),
    onSuccess: () => { toast.success("User berhasil diupdate"); qc.invalidateQueries({ queryKey: ["users"] }); setOpen(false); setEditUser(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => { toast.success("User dihapus"); qc.invalidateQueries({ queryKey: ["users"] }); setConfirmDelete(null); },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Gagal hapus user"),
  });

  const resetMutation = useMutation({
    mutationFn: (id: number) => adminApi.resetPassword(id),
    onSuccess: () => toast.success("Password direset ke 'password'"),
    onError: () => toast.error("Gagal reset password"),
  });

  const handleOpenCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setOpen(true); };
  const handleOpenEdit = (u: UserListItem) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", whatsapp_number: u.whatsapp_number || "", sub_role: u.sub_role || "Karyawan", role_ids: u.roles.map((r) => r.id) });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editUser) {
      const payload: any = { name: form.name, email: form.email, whatsapp_number: form.whatsapp_number || undefined, sub_role: form.sub_role, role_ids: form.role_ids };
      updateMutation.mutate({ id: editUser.id, data: payload });
    } else {
      createMutation.mutate({ ...form, whatsapp_number: form.whatsapp_number || undefined });
    }
  };

  const toggleRole = (rid: number) => {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(rid) ? prev.role_ids.filter((r) => r !== rid) : [...prev.role_ids, rid],
    }));
  };

  const ROLE_COLORS: Record<string, string> = {
    "Super Admin": "bg-red-100 text-red-700",
    BD: "bg-blue-100 text-blue-700",
    Finance: "bg-green-100 text-green-700",
    Desain: "bg-purple-100 text-purple-700",
    Sales: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-muted-foreground">Kelola akses dan role pengguna</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}><Plus className="h-4 w-4 mr-2" />Tambah User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editUser ? "Edit User" : "Tambah User Baru"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Nama</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              {!editUser && (
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </div>
              )}
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="08xx..." />
              </div>
              <div className="space-y-1">
                <Label>Sub Role</Label>
                <Select value={form.sub_role} onValueChange={(v) => setForm({ ...form, sub_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUB_ROLES.map((sr) => (
                      <SelectItem key={sr} value={sr}>{sr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex flex-wrap gap-2">
                  {(roles as Role[] | undefined)?.map((r) => (
                    <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${form.role_ids.includes(r.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editUser ? "Simpan" : "Buat User"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama atau email..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <span className="text-sm text-muted-foreground ml-auto">{data?.total ?? 0} user</span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Sub Role</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : data?.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground">{u.whatsapp_number || "-"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SUB_ROLE_COLORS[u.sub_role] || "bg-gray-100 text-gray-700"}`}>
                      {u.sub_role || "Karyawan"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r.id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[r.name] || "bg-gray-100 text-gray-700"}`}>
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(u)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => resetMutation.mutate(u.id)} title="Reset Password" disabled={resetMutation.isPending}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      {!u.roles.some((r) => r.name === "Super Admin") && (
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setConfirmDelete(u.id)} title="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirm Dialog */}
      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus User?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini tidak bisa dibatalkan.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)} disabled={deleteMutation.isPending}>Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
