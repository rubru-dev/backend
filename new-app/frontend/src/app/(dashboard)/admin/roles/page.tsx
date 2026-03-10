"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type Role, type PermissionItem, type RoleWithPermissions } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield, Plus, Pencil, Trash2, Save, Loader2, Users, Lock,
  ChevronDown, ChevronRight, LayoutDashboard, Layers, Menu, Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Module metadata ───────────────────────────────────────────────────────────
const MODULE_META: Record<string, { label: string; color: string }> = {
  bd:              { label: "BD (Business Development)", color: "#6366f1" },
  content:         { label: "Content Creator",           color: "#ec4899" },
  sales_admin:     { label: "Sales Admin",               color: "#f59e0b" },
  telemarketing:   { label: "Telemarketing",             color: "#10b981" },
  desain:          { label: "Desain",                    color: "#8b5cf6" },
  sales:           { label: "Sales",                     color: "#3b82f6" },
  projek_sipil:    { label: "Projek Sipil",              color: "#14b8a6" },
  projek_desain:   { label: "Projek Desain",             color: "#14b8a6" },
  projek_interior: { label: "Projek Interior",           color: "#14b8a6" },
  finance:         { label: "Finance",                   color: "#ef4444" },
  pic:             { label: "PIC Project",               color: "#f97316" },
  tukang:          { label: "Tukang",                    color: "#f97316" },
  tutorial:        { label: "Tutorial",                  color: "#0ea5e9" },
  admin:           { label: "Admin Panel",               color: "#64748b" },
};

const CRUD_ACTIONS = ["view", "create", "edit", "delete"];

// Categorize a single permission into a group
function categorize(perm: PermissionItem): "module" | "crud" | "submenu" | "tab" | "special" {
  const action = perm.name.split(".").slice(1).join(".");
  if (action === "view") return "module";
  if (["create", "edit", "delete"].includes(action)) return "crud";
  if (perm.label.startsWith("Sub-menu:")) return "submenu";
  if (perm.label.startsWith("Tab:")) return "tab";
  return "special";
}

// ── Permission Accordion per module ───────────────────────────────────────────
function ModuleAccordion({
  mod,
  perms,
  checkedIds,
  onChange,
  disabled,
  defaultOpen,
}: {
  mod: string;
  perms: PermissionItem[];
  checkedIds: Set<number>;
  onChange: (id: number, checked: boolean) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const meta = MODULE_META[mod] ?? { label: mod, color: "#64748b" };

  const checkedCount = perms.filter((p) => checkedIds.has(p.id)).length;
  const allChecked = checkedCount === perms.length;
  const someChecked = checkedCount > 0 && !allChecked;

  const handleSelectAll = (checked: boolean) => {
    perms.forEach((p) => onChange(p.id, checked));
  };

  // Group by category
  const modulePerms  = perms.filter((p) => categorize(p) === "module");
  const crudPerms    = perms.filter((p) => categorize(p) === "crud");
  const submenuPerms = perms.filter((p) => categorize(p) === "submenu");
  const tabPerms     = perms.filter((p) => categorize(p) === "tab");
  const specialPerms = perms.filter((p) => categorize(p) === "special");

  const PermGroup = ({
    icon: Icon,
    label,
    items,
    className,
  }: {
    icon: React.ElementType;
    label: string;
    items: PermissionItem[];
    className?: string;
  }) => {
    if (items.length === 0) return null;
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <div className="flex flex-wrap gap-3 pl-1">
          {items.map((p) => {
            const action = p.name.split(".").slice(1).join(".");
            // Clean label: strip prefix like "Sub-menu: " or "Tab: "
            const rawLabel = p.label
              .replace(/^Sub-menu:\s*/, "")
              .replace(/^Tab:\s*/, "");
            const shortLabel = rawLabel.replace(/^(Lihat|Buat|Edit|Hapus)\s+/, "");
            const displayLabel =
              action === "view"   ? "Lihat"  :
              action === "create" ? "Buat"   :
              action === "edit"   ? "Edit"   :
              action === "delete" ? "Hapus"  :
              shortLabel;

            return (
              <label key={p.id} className="flex items-center gap-1.5 cursor-pointer group">
                <Checkbox
                  checked={checkedIds.has(p.id)}
                  onCheckedChange={(v) => onChange(p.id, v === true)}
                  disabled={disabled}
                  className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                />
                <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors select-none">
                  {displayLabel}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        {/* Color dot */}
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />

        {/* Module name */}
        <span className="flex-1 text-sm font-semibold text-slate-700">{meta.label}</span>

        {/* Count badge */}
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 py-0",
            checkedCount > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
          )}
        >
          {checkedCount}/{perms.length}
        </Badge>

        {/* Select all checkbox — stop propagation so it doesn't toggle accordion */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1"
          title={allChecked ? "Batal pilih semua" : "Pilih semua"}
        >
          <Checkbox
            checked={allChecked ? true : someChecked ? "indeterminate" : false}
            onCheckedChange={(v) => handleSelectAll(v === true)}
            disabled={disabled}
            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500
                       data-[state=indeterminate]:bg-orange-200 data-[state=indeterminate]:border-orange-400"
          />
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Semua</span>
        </div>

        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="border-t px-4 py-3 space-y-4 bg-white">
          <PermGroup icon={Shield}          label="Akses Modul"   items={modulePerms} />
          <PermGroup icon={Layers}          label="CRUD"          items={crudPerms} />
          <PermGroup icon={Menu}            label="Sub-menu"      items={submenuPerms} />
          <PermGroup icon={LayoutDashboard} label="Tab Halaman"   items={tabPerms} />
          <PermGroup icon={Star}            label="Aksi Khusus"   items={specialPerms} />
        </div>
      )}
    </div>
  );
}

// ── Permission Accordion List ─────────────────────────────────────────────────
function PermissionAccordion({
  allPermissions,
  checkedIds,
  onChange,
  disabled,
}: {
  allPermissions: Record<string, PermissionItem[]>;
  checkedIds: Set<number>;
  onChange: (id: number, checked: boolean) => void;
  disabled?: boolean;
}) {
  const [expandAll, setExpandAll] = useState(false);

  // Sort modules: known ones first in sidebar order, then alphabetical
  const MODULE_ORDER = [
    "bd","content","sales_admin","telemarketing","desain","sales",
    "projek_sipil","projek_desain","projek_interior","finance","pic","tukang","tutorial","admin",
  ];
  const modules = Object.keys(allPermissions).sort((a, b) => {
    const ia = MODULE_ORDER.indexOf(a);
    const ib = MODULE_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  const totalPerms = Object.values(allPermissions).flat().length;
  const totalChecked = Object.values(allPermissions).flat().filter((p) => checkedIds.has(p.id)).length;

  const handleSelectAll = (checked: boolean) => {
    Object.values(allPermissions).flat().forEach((p) => onChange(p.id, checked));
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-orange-600">{totalChecked}</span> dari {totalPerms} permission aktif
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpandAll((v) => !v)}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            {expandAll ? "Tutup Semua" : "Buka Semua"}
          </button>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
            <Checkbox
              checked={totalChecked === totalPerms ? true : totalChecked > 0 ? "indeterminate" : false}
              onCheckedChange={(v) => handleSelectAll(v === true)}
              disabled={disabled}
              className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
            Pilih Semua
          </label>
        </div>
      </div>

      {/* Accordion list */}
      <div className="space-y-2">
        {modules.map((mod) => (
          <ModuleAccordion
            key={mod}
            mod={mod}
            perms={allPermissions[mod]}
            checkedIds={checkedIds}
            onChange={onChange}
            disabled={disabled}
            defaultOpen={expandAll}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const qc = useQueryClient();

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => adminApi.listRoles(),
  });

  const { data: allPermissions, isLoading: permsLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => adminApi.listPermissions(),
  });

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePerms, setRolePerms] = useState<RoleWithPermissions | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadRolePermissions = useCallback(async (id: number) => {
    setLoadingPerms(true);
    setIsDirty(false);
    try {
      const data = await adminApi.getRolePermissions(id);
      setRolePerms(data);
      setCheckedIds(new Set(data.permissions.map((p) => p.id)));
    } catch {
      toast.error("Gagal memuat permissions role");
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId !== null) loadRolePermissions(selectedRoleId);
  }, [selectedRoleId, loadRolePermissions]);

  useEffect(() => {
    if (roles && roles.length > 0 && selectedRoleId === null) setSelectedRoleId(roles[0].id);
  }, [roles, selectedRoleId]);

  const handleCheckChange = (id: number, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await adminApi.setRolePermissions(selectedRoleId, [...checkedIds]);
      toast.success("Permission berhasil disimpan");
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    } catch {
      toast.error("Gagal menyimpan permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      const role = await adminApi.createRole({ name: createName.trim() });
      toast.success(`Role "${role.name}" berhasil dibuat`);
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      setCreateOpen(false);
      setCreateName("");
      setSelectedRoleId(role.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Gagal membuat role");
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (role: Role) => { setEditRole(role); setEditName(role.name); setEditOpen(true); };
  const handleEdit = async () => {
    if (!editRole || !editName.trim()) return;
    setEditLoading(true);
    try {
      await adminApi.updateRole(editRole.id, { name: editName.trim() });
      toast.success("Nama role diperbarui");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      setEditOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Gagal mengubah role");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRole) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteRole(deleteRole.id);
      toast.success(`Role "${deleteRole.name}" dihapus`);
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      if (selectedRoleId === deleteRole.id) {
        setSelectedRoleId(null);
        setRolePerms(null);
        setCheckedIds(new Set());
      }
      setDeleteRole(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Gagal menghapus role");
    } finally {
      setDeleteLoading(false);
    }
  };

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.name === "Super Admin";

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Role & Permission</h1>
          <p className="text-muted-foreground text-sm">Atur hak akses menu, sub-menu, dan tab per role secara granular</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
          <Plus className="h-4 w-4" />
          Tambah Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
        {/* ── Left: Role List ── */}
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 px-4 py-2.5 border-b">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Daftar Role</p>
          </div>
          <div className="divide-y">
            {rolesLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 m-2 rounded-lg" />)
              : roles?.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-orange-50/60 transition-colors",
                      selectedRoleId === r.id && "bg-orange-50 border-l-[3px] border-l-orange-500"
                    )}
                    onClick={() => {
                      if (isDirty && !confirm("Ada perubahan yang belum disimpan. Lanjutkan?")) return;
                      setSelectedRoleId(r.id);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                        selectedRoleId === r.id ? "bg-orange-100" : "bg-slate-100"
                      )}>
                        <Shield className={cn("h-3.5 w-3.5", selectedRoleId === r.id ? "text-orange-500" : "text-slate-400")} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Lock className="h-2.5 w-2.5" />
                            {r.permission_count ?? 0} akses
                          </span>
                          {(r.user_count ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Users className="h-2.5 w-2.5" />
                              {r.user_count} user
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {r.name !== "Super Admin" && (
                      <div className="flex gap-0.5 shrink-0 ml-2">
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); setDeleteRole(r); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        </div>

        {/* ── Right: Permission Accordion ── */}
        <div className="border rounded-xl overflow-hidden shadow-sm">
          {!selectedRole ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <Shield className="h-10 w-10 text-slate-200" />
              <p className="text-sm">Pilih role di sebelah kiri untuk mengatur hak akses</p>
            </div>
          ) : (
            <>
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                    <Shield className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{selectedRole.name}</p>
                    {isSuperAdmin && (
                      <span className="text-[10px] text-red-600 font-medium">Akses Penuh (tidak perlu konfigurasi)</span>
                    )}
                  </div>
                </div>
                {!isSuperAdmin && (
                  <Button
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2 h-8 text-sm"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Simpan Perubahan
                  </Button>
                )}
              </div>

              {/* Permission body */}
              <div className="p-4">
                {isSuperAdmin ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                    <Lock className="h-10 w-10 text-slate-200" />
                    <p className="text-sm text-center">
                      Super Admin memiliki akses ke seluruh fitur secara otomatis.<br />
                      Tidak perlu konfigurasi permission.
                    </p>
                  </div>
                ) : loadingPerms || permsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : allPermissions ? (
                  <PermissionAccordion
                    allPermissions={allPermissions}
                    checkedIds={checkedIds}
                    onChange={handleCheckChange}
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
        {[
          { icon: Shield,          label: "Akses Modul — kontrol apakah group menu tampil di sidebar" },
          { icon: Layers,          label: "CRUD — buat, edit, hapus data dalam modul" },
          { icon: Menu,            label: "Sub-menu — kontrol item individual di sidebar" },
          { icon: LayoutDashboard, label: "Tab Halaman — kontrol tab dalam satu halaman" },
          { icon: Star,            label: "Aksi Khusus — approve, tanda tangan, dll" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-slate-400" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Create Role Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Role Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nama Role</Label>
              <Input
                placeholder="Contoh: Manager, HRD, Supervisor"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || createLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {createLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Buat Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Role Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Nama Role</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nama Role</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || editLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus role &quot;{deleteRole?.name}&quot;?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">
            Semua user yang memiliki role ini akan kehilangan hak akses terkait. Tindakan ini tidak bisa dibatalkan.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-red-500 hover:bg-red-600 text-white">
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
