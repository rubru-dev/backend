"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Loading, PageTitle, useGet } from "@/components/erp/shared";
import { showConfirm } from "@/lib/app-modal";

const NAVY = "#2c3e5c";

type AppRole = { id: string; name: string };
type AppUser = { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; assignedRoles: AppRole[] };
type Msg = { type: "success" | "error"; title: string; body: string };

function MsgModal({ msg, onClose }: { msg: Msg; onClose: () => void }) {
  const isOk = msg.type === "success";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

const PILL_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#64748b", "#dc2626", "#059669"];

function roleColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PILL_COLORS[Math.abs(hash) % PILL_COLORS.length];
}

const BLANK_FORM = { name: "", email: "", password: "", isActive: true, roleIds: [] as string[] };

export default function UsersPage() {
  const { data, loading, reload } = useGet<{ data: AppUser[] }>("/erp/admin/users");
  const { data: rolesData } = useGet<{ data: AppRole[] }>("/erp/admin/roles");
  const users = data?.data ?? [];
  const availRoles = rolesData?.data ?? [];

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);

  const filtered = search
    ? users.filter(u => [u.name, u.email, ...u.assignedRoles.map(r => r.name)].join(" ").toLowerCase().includes(search.toLowerCase()))
    : users;

  const openCreate = () => { setEditUser(null); setForm({ ...BLANK_FORM }); setFormError(""); setOpen(true); };
  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", isActive: u.isActive, roleIds: u.assignedRoles.map(r => r.id) });
    setFormError("");
    setOpen(true);
  };

  const toggleRole = (id: string) => {
    setForm(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(id) ? prev.roleIds.filter(r => r !== id) : [...prev.roleIds, id],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Nama wajib diisi."); return; }
    if (!form.email.trim()) { setFormError("Email wajib diisi."); return; }
    if (!editUser && !form.password) { setFormError("Password wajib diisi untuk user baru."); return; }
    setFormError("");
    setSaving(true);
    try {
      if (editUser) {
        const payload: any = { name: form.name, email: form.email, isActive: form.isActive, roleIds: form.roleIds };
        if (form.password) payload.password = form.password;
        await api.patch(`/erp/admin/users/${editUser.id}`, payload);
        setMsg({ type: "success", title: "User Diperbarui", body: `Data user ${form.name} berhasil diperbarui.` });
      } else {
        await api.post("/erp/admin/users", { name: form.name, email: form.email, password: form.password, roleIds: form.roleIds });
        setMsg({ type: "success", title: "User Dibuat", body: `Akun ${form.name} berhasil dibuat.` });
      }
      setOpen(false);
      reload();
    } catch (e: any) {
      setFormError(e?.response?.data?.error || "Terjadi kesalahan.");
    } finally { setSaving(false); }
  };

  const doDelete = async (target: AppUser) => {
    setDeleting(true);
    try {
      await api.delete(`/erp/admin/users/${target.id}`);
      setMsg({ type: "success", title: "User Dihapus", body: `Akun ${target.name} berhasil dihapus.` });
      reload();
    } catch (e: any) {
      setMsg({ type: "error", title: "Gagal Menghapus", body: e?.response?.data?.error || "Terjadi kesalahan." });
    } finally { setDeleting(false); }
  };

  const resetPassword = async (u: AppUser) => {
    setResetting(u.id);
    try {
      await api.post(`/erp/admin/users/${u.id}/reset-password`, {});
      setMsg({ type: "success", title: "Password Direset", body: `Password ${u.name} berhasil direset ke "password".` });
    } catch {
      setMsg({ type: "error", title: "Gagal Reset", body: "Terjadi kesalahan saat mereset password." });
    } finally { setResetting(null); }
  };

  return (
    <div className="p-6 md:p-8">
      <PageTitle
        title="Manajemen User"
        subtitle="Kelola akun login dan role pengguna sistem."
        actions={<button className="btn btn-primary" onClick={openCreate}>+ Tambah User</button>}
      />

      <div className="card mt-5" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#9ca3af" }}>🔍</span>
        <input
          placeholder="Cari nama, email, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: "none", outline: "none", flex: 1, fontSize: 13, fontFamily: "inherit" }}
        />
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} user</span>
      </div>

      {loading ? <Loading /> : (
        <div className="card mt-4 overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: NAVY, color: "#fff" }}>
                {["Nama", "Email", "Role", "Status", "Dibuat", "Aksi"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Belum ada user.</td></tr>
              )}
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7280" }}>{u.email}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {u.assignedRoles.length === 0 ? (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", color: "#9ca3af" }}>{u.role}</span>
                      ) : u.assignedRoles.map(r => {
                        const c = roleColor(r.name);
                        return (
                          <span key={r.id} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: c + "20", color: c, border: `1px solid ${c}50` }}>
                            {r.name}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: u.isActive ? "#d1fae5" : "#f3f4f6", color: u.isActive ? "#065f46" : "#6b7280" }}>
                      {u.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: 12 }}>
                    {new Date(u.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{ padding: "5px 10px", borderRadius: 6, background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✏ Edit</button>
                      <button
                        onClick={() => resetPassword(u)}
                        disabled={resetting === u.id}
                        style={{ padding: "5px 10px", borderRadius: 6, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: resetting === u.id ? 0.6 : 1 }}>
                        {resetting === u.id ? "..." : "↺ Reset PW"}
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await showConfirm({
                            title: "Hapus User?",
                            message: `Akun ${u.name} akan dihapus permanen dan tindakan ini tidak dapat dibatalkan.`,
                            confirmLabel: "Ya, hapus",
                            tone: "danger",
                          });
                          if (ok) doDelete(u);
                        }}
                        style={{ padding: "5px 10px", borderRadius: 6, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                        🗑 Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: 480, padding: 28, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontWeight: 800, fontSize: 16, color: NAVY, marginBottom: 20 }}>{editUser ? "Edit User" : "Tambah User Baru"}</h2>
            <form onSubmit={submit}>
              <div style={{ display: "grid", gap: 14 }}>
                <label style={{ display: "block" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Nama *</span>
                  <input style={{ marginTop: 4 }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Email *</span>
                  <input type="email" style={{ marginTop: 4 }} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@fumakilla.co.id" />
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{editUser ? "Password Baru (kosongkan jika tidak diubah)" : "Password *"}</span>
                  <input type="password" style={{ marginTop: 4 }} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editUser ? "Kosongkan untuk tetap sama" : "Min. 8 karakter"} />
                </label>

                {/* Multi-role selector */}
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Role (pilih satu atau lebih)</span>
                  {availRoles.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9ca3af" }}>Belum ada role. Buat terlebih dahulu di halaman Role & Permission.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {availRoles.map(r => {
                        const c = roleColor(r.name);
                        const sel = form.roleIds.includes(r.id);
                        return (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => toggleRole(r.id)}
                            style={{
                              padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                              background: sel ? c : "#f3f4f6",
                              color: sel ? "#fff" : "#374151",
                              border: `2px solid ${sel ? c : "#e5e7eb"}`,
                              transition: "all 0.12s",
                            }}>
                            {sel ? "✓ " : ""}{r.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {form.roleIds.length === 0 && (
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>Jika tidak dipilih, user tidak punya akses apapun.</p>
                  )}
                </div>

                {editUser && (
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Akun Aktif</span>
                  </label>
                )}
                {formError && (
                  <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 7, padding: "10px 14px", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{formError}</div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button type="button" className="btn" onClick={() => setOpen(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Menyimpan..." : editUser ? "Simpan Perubahan" : "Buat User"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {msg && <MsgModal msg={msg} onClose={() => setMsg(null)} />}
    </div>
  );
}
