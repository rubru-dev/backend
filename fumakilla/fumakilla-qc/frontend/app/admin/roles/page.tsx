"use client";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Loading, PageTitle, useGet } from "@/components/erp/shared";
import { showConfirm } from "@/lib/app-modal";

const NAVY = "#2c3e5c";
const ACCENT = "#285f90";

type AppRole = { id: string; name: string; permissions: string[]; userCount: number; createdAt: string };
type Msg = { type: "success" | "error"; title: string; body: string };

function MsgModal({ msg, onClose }: { msg: Msg; onClose: () => void }) {
  const isOk = msg.type === "success";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 380, padding: 24, maxWidth: "90vw" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>{isOk ? "✅" : "❌"}</span>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: isOk ? "#065f46" : "#dc2626", marginBottom: 4 }}>{msg.title}</p>
            <p style={{ fontSize: 13, color: "#374151" }}>{msg.body}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 20px", borderRadius: 7, background: isOk ? "#065f46" : "#dc2626", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

// ─── Permission Definitions ───────────────────────────────────────────────────
type PermDef = { id: string; label: string };
type ModuleDef = { key: string; label: string; color: string; perms: PermDef[] };

const MODULES: ModuleDef[] = [
  {
    key: "dashboard", label: "Dashboard", color: "#3b82f6",
    perms: [
      { id: "dashboard.view", label: "Lihat Dashboard" },
    ],
  },
  {
    key: "customers", label: "Database Customer", color: "#8b5cf6",
    perms: [
      { id: "customers.view", label: "Lihat" },
      { id: "customers.create", label: "Tambah" },
      { id: "customers.edit", label: "Edit" },
      { id: "customers.delete", label: "Hapus" },
    ],
  },
  {
    key: "inquiries", label: "Inquiry", color: "#10b981",
    perms: [
      { id: "inquiries.view", label: "Lihat" },
      { id: "inquiries.create", label: "Tambah" },
      { id: "inquiries.edit", label: "Edit" },
      { id: "inquiries.delete", label: "Hapus" },
      { id: "inquiries.change_status", label: "Ubah Status" },
    ],
  },
  {
    key: "quotations", label: "Quotation", color: "#f59e0b",
    perms: [
      { id: "quotations.view", label: "Lihat" },
      { id: "quotations.create", label: "Tambah" },
      { id: "quotations.edit", label: "Edit" },
      { id: "quotations.delete", label: "Hapus" },
      { id: "quotations.change_status", label: "Ubah Status" },
    ],
  },
  {
    key: "surveys", label: "Survey", color: "#06b6d4",
    perms: [
      { id: "surveys.view", label: "Lihat" },
      { id: "surveys.create", label: "Tambah" },
      { id: "surveys.edit", label: "Edit" },
      { id: "surveys.delete", label: "Hapus" },
      { id: "surveys.change_status", label: "Ubah Status" },
      { id: "surveys.b2b_report", label: "Laporan B2B" },
      { id: "surveys.b2c_report", label: "Laporan B2C" },
    ],
  },
  {
    key: "after_surveys", label: "After Survey", color: "#ec4899",
    perms: [
      { id: "after_surveys.view", label: "Lihat" },
      { id: "after_surveys.submit", label: "Submit" },
      { id: "after_surveys.review", label: "Review" },
      { id: "after_surveys.approve", label: "Approve" },
    ],
  },
  {
    key: "agreements", label: "Agreement / Kontrak", color: "#f97316",
    perms: [
      { id: "agreements.view", label: "Lihat" },
      { id: "agreements.create", label: "Tambah" },
      { id: "agreements.edit", label: "Edit" },
      { id: "agreements.delete", label: "Hapus" },
      { id: "agreements.change_status", label: "Ubah Status" },
      { id: "agreements.activate", label: "Aktivasi (→ ACTIVE)" },
    ],
  },
  {
    key: "order_sheets", label: "Order Sheet", color: "#64748b",
    perms: [
      { id: "order_sheets.view", label: "Lihat" },
      { id: "order_sheets.create", label: "Tambah" },
      { id: "order_sheets.edit", label: "Edit" },
      { id: "order_sheets.delete", label: "Hapus" },
      { id: "order_sheets.change_status", label: "Ubah Status" },
    ],
  },
  {
    key: "service_contracts", label: "Service Contract", color: "#0891b2",
    perms: [
      { id: "service_contracts.view", label: "Lihat" },
    ],
  },
  {
    key: "renewals", label: "Renewal Kontrak", color: "#7c3aed",
    perms: [
      { id: "renewals.view", label: "Lihat" },
      { id: "renewals.create", label: "Buat Renewal" },
      { id: "renewals.approve", label: "Setujui" },
      { id: "renewals.reject", label: "Tolak" },
    ],
  },
  {
    key: "complaints", label: "Komplain", color: "#dc2626",
    perms: [
      { id: "complaints.view", label: "Lihat" },
      { id: "complaints.create", label: "Tambah" },
      { id: "complaints.edit", label: "Edit" },
      { id: "complaints.delete", label: "Hapus" },
      { id: "complaints.change_status", label: "Ubah Status" },
      { id: "complaints.resolve", label: "Selesaikan" },
      { id: "complaints.close", label: "Tutup" },
    ],
  },
  {
    key: "work_plans", label: "Work Plan", color: "#059669",
    perms: [
      { id: "work_plans.view", label: "Lihat Milik Sendiri" },
      { id: "work_plans.view_all", label: "Lihat Semua (All Users)" },
      { id: "work_plans.create", label: "Tambah" },
      { id: "work_plans.edit", label: "Edit" },
      { id: "work_plans.delete", label: "Hapus" },
      { id: "work_plans.change_status", label: "Ubah Status" },
    ],
  },
  {
    key: "monthly_reports", label: "Monthly Report", color: "#d97706",
    perms: [
      { id: "monthly_reports.view", label: "Lihat" },
      { id: "monthly_reports.create", label: "Tambah" },
      { id: "monthly_reports.edit", label: "Edit" },
      { id: "monthly_reports.select_type", label: "Pilih Jenis Report" },
    ],
  },
  {
    key: "vendors", label: "Vendor", color: "#0369a1",
    perms: [
      { id: "vendors.view", label: "Lihat" },
      { id: "vendors.create", label: "Tambah" },
      { id: "vendors.edit", label: "Edit" },
      { id: "vendors.delete", label: "Hapus" },
    ],
  },
  {
    key: "admin", label: "Admin Panel", color: "#374151",
    perms: [
      { id: "admin.users", label: "Kelola User" },
      { id: "admin.roles", label: "Kelola Role & Permission" },
      { id: "admin.settings", label: "Kelola Pengaturan" },
    ],
  },
];

const ALL_PERMISSIONS = MODULES.flatMap(m => m.perms.map(p => p.id));

// ─── Module Accordion ─────────────────────────────────────────────────────────
function ModuleAccordion({
  mod, checked, onChange, forceOpen,
}: {
  mod: ModuleDef;
  checked: Set<string>;
  onChange: (perm: string, val: boolean) => void;
  forceOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const total = mod.perms.length;
  const active = mod.perms.filter(p => checked.has(p.id)).length;
  const allChecked = active === total;
  const someChecked = active > 0 && !allChecked;
  const indRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (indRef.current) indRef.current.indeterminate = someChecked; }, [someChecked]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: isOpen ? "#f8faff" : "#fff", cursor: "pointer", border: "none", textAlign: "left" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: mod.color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#374151" }}>{mod.label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 999, background: active > 0 ? "#fef3c7" : "#f3f4f6", color: active > 0 ? "#92400e" : "#6b7280" }}>
          {active}/{total}
        </span>
        <div
          onClick={e => { e.stopPropagation(); mod.perms.forEach(p => onChange(p.id, !allChecked)); }}
          style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}
          title={allChecked ? "Hapus semua" : "Pilih semua"}>
          <input
            type="checkbox"
            readOnly
            checked={allChecked}
            ref={indRef}
            style={{ cursor: "pointer", width: 14, height: 14 }}
          />
          <span style={{ fontSize: 10, color: "#9ca3af" }}>Semua</span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "12px 16px 14px", background: "#fafafa", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {mod.perms.map(p => (
            <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, padding: "4px 10px", borderRadius: 8, background: checked.has(p.id) ? mod.color + "15" : "#fff", border: `1px solid ${checked.has(p.id) ? mod.color + "50" : "#e5e7eb"}` }}>
              <input
                type="checkbox"
                checked={checked.has(p.id)}
                onChange={e => onChange(p.id, e.target.checked)}
                style={{ width: 13, height: 13, cursor: "pointer", accentColor: mod.color }}
              />
              <span style={{ color: checked.has(p.id) ? mod.color : "#374151", fontWeight: checked.has(p.id) ? 700 : 400 }}>{p.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const { data, loading, reload } = useGet<{ data: AppRole[] }>("/erp/admin/roles");
  const roles = data?.data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [expandAll, setExpandAll] = useState(false);

  // Create role state
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Rename role state
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Delete role state
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  // Load drafts from server
  useEffect(() => {
    if (!roles.length) return;
    setDrafts(prev => {
      const next = { ...prev };
      roles.forEach(r => {
        if (!next[r.id]) next[r.id] = new Set(r.permissions);
      });
      return next;
    });
    if (!selectedId && roles.length > 0) setSelectedId(roles[0].id);
  }, [data]);

  const selected = roles.find(r => r.id === selectedId) ?? null;
  const checked = drafts[selectedId ?? ""] ?? new Set<string>();
  const totalChecked = checked.size;

  const onChange = (perm: string, val: boolean) => {
    if (!selectedId) return;
    setDrafts(prev => {
      const next = new Set(prev[selectedId] ?? new Set());
      val ? next.add(perm) : next.delete(perm);
      return { ...prev, [selectedId]: next };
    });
    setDirty(prev => ({ ...prev, [selectedId]: true }));
  };

  const selectAll = (val: boolean) => {
    if (!selectedId) return;
    setDrafts(prev => ({ ...prev, [selectedId]: val ? new Set(ALL_PERMISSIONS) : new Set() }));
    setDirty(prev => ({ ...prev, [selectedId]: true }));
  };

  const savePermissions = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await api.put(`/erp/admin/roles/${selectedId}/permissions`, { permissions: [...checked] });
      setDirty(prev => ({ ...prev, [selectedId]: false }));
      setMsg({ type: "success", title: "Tersimpan", body: `Permission untuk role "${selected?.name}" berhasil disimpan.` });
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Menyimpan", body: e?.response?.data?.error || "Terjadi kesalahan." });
    } finally { setSaving(false); }
  };

  const createRole = async () => {
    if (!createName.trim()) { setCreateError("Nama role wajib diisi"); return; }
    setCreating(true);
    setCreateError("");
    try {
      const res = await api.post("/erp/admin/roles", { name: createName.trim() });
      const newRole = res.data.data ?? res.data;
      setCreateName("");
      setSelectedId(newRole.id);
      await reload();
    } catch (e: any) {
      setCreateError(e?.response?.data?.error || "Terjadi kesalahan.");
    } finally { setCreating(false); }
  };

  const startRename = (r: AppRole) => { setRenameId(r.id); setRenameName(r.name); };
  const saveRename = async () => {
    if (!renameId || !renameName.trim()) return;
    setRenaming(true);
    try {
      await api.patch(`/erp/admin/roles/${renameId}`, { name: renameName.trim() });
      setRenameId(null);
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Rename", body: e?.response?.data?.error || "Terjadi kesalahan." });
    } finally { setRenaming(false); }
  };

  const doDeleteRole = async (role: AppRole) => {
    setDeleting(true);
    try {
      await api.delete(`/erp/admin/roles/${role.id}`);
      if (selectedId === role.id) setSelectedId(null);
      setMsg({ type: "success", title: "Role Dihapus", body: `Role "${role.name}" berhasil dihapus.` });
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Menghapus", body: e?.response?.data?.error || "Terjadi kesalahan." });
    } finally { setDeleting(false); }
  };

  return (
    <div className="p-6 md:p-8">
      <PageTitle
        title="Role & Permission"
        subtitle="Kelola role secara dinamis dan atur hak akses setiap fitur secara granular."
      />

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, marginTop: 20, alignItems: "start" }}>
        {/* ── Left: Role List ── */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ background: "#f8fafc", padding: "10px 14px", borderBottom: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Daftar Role</p>
          </div>

          {/* Add new role */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={createName}
                onChange={e => { setCreateName(e.target.value); setCreateError(""); }}
                onKeyDown={e => e.key === "Enter" && createRole()}
                placeholder="Nama role baru..."
                style={{ flex: 1, fontSize: 12, padding: "5px 10px", border: "1px solid #d1d5db", borderRadius: 7 }}
              />
              <button
                onClick={createRole}
                disabled={creating}
                style={{ padding: "5px 12px", borderRadius: 7, background: ACCENT, color: "#fff", fontWeight: 700, border: "none", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>
                {creating ? "..." : "+ Buat"}
              </button>
            </div>
            {createError && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{createError}</p>}
          </div>

          {/* Role items */}
          {loading ? <div style={{ padding: 20 }}><Loading /></div> : roles.length === 0 ? (
            <p style={{ padding: 16, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>Belum ada role. Buat role baru di atas.</p>
          ) : roles.map(r => {
            const isSelected = selectedId === r.id;
            const isDirty = dirty[r.id];
            const isRenaming = renameId === r.id;

            return (
              <div
                key={r.id}
                onClick={() => { if (!isRenaming) setSelectedId(r.id); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                  cursor: "pointer", borderLeft: isSelected ? `3px solid ${ACCENT}` : "3px solid transparent",
                  background: isSelected ? "#eff6ff" : "#fff", borderBottom: "1px solid #f3f4f6",
                }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: isSelected ? "#dbeafe" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13 }}>🛡</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isRenaming ? (
                    <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameName}
                        onChange={e => setRenameName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenameId(null); }}
                        style={{ flex: 1, fontSize: 12, padding: "2px 6px", border: "1px solid #6366f1", borderRadius: 5, outline: "none" }}
                      />
                      <button onClick={saveRename} disabled={renaming} style={{ fontSize: 11, background: "#6366f1", color: "#fff", border: "none", borderRadius: 5, padding: "2px 7px", cursor: "pointer" }}>✓</button>
                      <button onClick={() => setRenameId(null)} style={{ fontSize: 11, background: "#f3f4f6", border: "none", borderRadius: 5, padding: "2px 7px", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, fontWeight: 600, color: isSelected ? ACCENT : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                      {r.name}
                      {isDirty && <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "0 4px", borderRadius: 4, fontWeight: 700 }}>*</span>}
                    </p>
                  )}
                  {!isRenaming && <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{r.userCount} user · {r.permissions.length} perm</p>}
                </div>
                {!isRenaming && (
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => startRename(r)}
                      title="Rename"
                      style={{ fontSize: 11, padding: "2px 6px", borderRadius: 5, background: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer", color: "#1e40af" }}>✏</button>
                    <button
                      onClick={async () => {
                        const ok = await showConfirm({
                          title: `Hapus Role "${r.name}"?`,
                          message: `Role ini digunakan oleh ${r.userCount} user. User tersebut akan kehilangan semua permission dari role ini. Tindakan ini tidak dapat dibatalkan.`,
                          confirmLabel: "Ya, hapus",
                          tone: "danger",
                        });
                        if (ok) doDeleteRole(r);
                      }}
                      title="Hapus role"
                      style={{ fontSize: 11, padding: "2px 6px", borderRadius: 5, background: "#fee2e2", border: "1px solid #fca5a5", cursor: "pointer", color: "#dc2626" }}>🗑</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right: Permission Panel ── */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {!selected ? (
            <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🛡</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Pilih role dari panel kiri</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>atau buat role baru untuk memulai</p>
            </div>
          ) : (
            <>
              {/* Panel Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🛡</div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 14, color: NAVY }}>{selected.name}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>{totalChecked} dari {ALL_PERMISSIONS.length} permission aktif · {selected.userCount} user</p>
                  </div>
                </div>
                <button
                  onClick={savePermissions}
                  disabled={!dirty[selectedId!] || saving}
                  style={{
                    padding: "8px 20px", borderRadius: 8,
                    background: dirty[selectedId!] ? ACCENT : "#e5e7eb",
                    color: dirty[selectedId!] ? "#fff" : "#9ca3af",
                    fontWeight: 700, border: "none", cursor: dirty[selectedId!] ? "pointer" : "default",
                    fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                  }}>
                  {saving ? "Menyimpan..." : "💾 Simpan"}
                </button>
              </div>

              {/* Toolbar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px", borderBottom: "1px solid #f3f4f6", background: "#fff" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={totalChecked === ALL_PERMISSIONS.length}
                    ref={el => { if (el) el.indeterminate = totalChecked > 0 && totalChecked < ALL_PERMISSIONS.length; }}
                    onChange={e => selectAll(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  Pilih Semua ({ALL_PERMISSIONS.length} permission)
                </label>
                <button
                  type="button"
                  onClick={() => setExpandAll(v => !v)}
                  style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {expandAll ? "▲ Tutup Semua" : "▼ Buka Semua"}
                </button>
              </div>

              {/* Permission Accordion */}
              <div style={{ padding: 14, display: "grid", gap: 8, maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
                {MODULES.map(mod => (
                  <ModuleAccordion
                    key={`${mod.key}-${selectedId}-${expandAll}`}
                    mod={mod}
                    checked={checked}
                    onChange={onChange}
                    forceOpen={expandAll}
                  />
                ))}
              </div>

              {/* Legend */}
              <div style={{ padding: "10px 18px", borderTop: "1px solid #f3f4f6", background: "#f8fafc", display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11, color: "#6b7280" }}>
                <span>🔵 Lihat — buka halaman & lihat data</span>
                <span>✏ Create/Edit — buat & ubah data</span>
                <span>🔄 Change Status — ubah status/tahap</span>
                <span>⚙ Aksi Khusus — approve, activate, resolve, dll</span>
              </div>
            </>
          )}
        </div>
      </div>

      {msg && <MsgModal msg={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}
