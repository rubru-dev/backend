"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Loading, PageTitle, useGet } from "@/components/erp/shared";

const NAVY = "#2c3e5c";

type ProviderConfig = {
  enabled: boolean;
  sender: string;
  secret: string;
  hasSecret: boolean;
};

const BLANK: ProviderConfig = { enabled: false, sender: "", secret: "", hasSecret: false };

function ProviderCard({
  title, icon, description,
  providerKey, fields,
}: {
  title: string; icon: string; description: string;
  providerKey: string;
  fields: { label: string; placeholder: string; isSecret?: boolean; hint?: string }[];
}) {
  const { data, loading, reload } = useGet<{ data: any[] }>("/erp/admin/reminders");
  const [form, setForm] = useState<ProviderConfig>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNum, setTestNum] = useState("");
  const [testMsg, setTestMsg] = useState("Halo! Ini pesan test dari sistem Fumakilla QC.");
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const row = data?.data?.find((x: any) => x.key === providerKey);
    if (row) {
      setForm({
        enabled: row.enabled || false,
        sender: row.config?.sender || "",
        secret: "",
        hasSecret: row.hasSecret || false,
      });
    }
  }, [data, providerKey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.put(`/erp/admin/reminders/${providerKey}`, {
        enabled: form.enabled,
        config: { sender: form.sender },
        ...(form.secret ? { secret: form.secret } : {}),
      });
      setSaved(true);
      setForm(f => ({ ...f, secret: "", hasSecret: true }));
      reload();
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.post(`/erp/admin/reminders/${providerKey}/test`, { target: testNum, message: testMsg });
      setTestResult({ ok: true, msg: "Pesan test berhasil dikirim!" });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.response?.data?.error || "Gagal mengirim test." });
    } finally { setTesting(false); }
  };

  if (loading) return <div className="card p-6"><Loading /></div>;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{title}</p>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{description}</p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div
            onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
            style={{
              width: 44, height: 24, borderRadius: 999, cursor: "pointer", transition: "background 0.2s",
              background: form.enabled ? "#285f90" : "#d1d5db", position: "relative",
            }}>
            <div style={{
              position: "absolute", top: 2, left: form.enabled ? 22 : 2, width: 20, height: 20,
              borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: form.enabled ? "#065f46" : "#6b7280" }}>
            {form.enabled ? "Aktif" : "Nonaktif"}
          </span>
        </label>
      </div>

      {/* Form */}
      <form onSubmit={submit} style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "grid", gap: 14 }}>
          {fields.map(f => (
            <label key={f.label} style={{ display: "block" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{f.label}</span>
              {f.hint && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{f.hint}</p>}
              <input
                type={f.isSecret ? "password" : "text"}
                style={{ marginTop: 4 }}
                value={f.isSecret ? form.secret : form.sender}
                onChange={e => setForm(ff => f.isSecret ? { ...ff, secret: e.target.value } : { ...ff, sender: e.target.value })}
                placeholder={f.placeholder}
              />
              {f.isSecret && form.hasSecret && (
                <p style={{ fontSize: 11, color: "#065f46", marginTop: 4 }}>✓ Kredensial tersimpan (kosongkan untuk mempertahankan)</p>
              )}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
          </button>
          {saved && <span style={{ fontSize: 12, color: "#065f46", fontWeight: 600 }}>✓ Tersimpan</span>}
        </div>
      </form>

      {/* Test kirim (hanya Fontee) */}
      {providerKey === "fontee" && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px 20px", background: "#f9fafb" }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 12 }}>📤 Test Kirim Pesan</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Nomor Tujuan</span>
              <input style={{ marginTop: 4 }} value={testNum} onChange={e => setTestNum(e.target.value)} placeholder="628xxxxxxxxxx" />
              <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Format internasional tanpa +</p>
            </label>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Pesan</span>
              <input style={{ marginTop: 4 }} value={testMsg} onChange={e => setTestMsg(e.target.value)} />
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={sendTest}
              disabled={testing || !testNum || !testMsg}
              className="btn"
              style={{ background: "#285f90", color: "#fff", borderColor: "#285f90" }}>
              {testing ? "Mengirim..." : "📨 Kirim Test"}
            </button>
            {testResult && (
              <span style={{ fontSize: 12, fontWeight: 600, color: testResult.ok ? "#065f46" : "#dc2626" }}>
                {testResult.ok ? "✓" : "✗"} {testResult.msg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemindersPage() {
  const [tab, setTab] = useState<"fontee" | "gmail">("fontee");

  const TABS = [
    { key: "fontee", label: "💬 WhatsApp (Fontee)" },
    { key: "gmail",  label: "✉ Gmail Reminder" },
  ] as const;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageTitle
        title="Pengaturan Reminder"
        subtitle="Konfigurasi saluran pengiriman notifikasi dan reminder otomatis."
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e5e7eb", marginTop: 20, marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 18px", fontWeight: 600, fontSize: 13, border: "none", background: "none", cursor: "pointer",
              color: tab === t.key ? "#285f90" : "#6b7280",
              borderBottom: `2px solid ${tab === t.key ? "#285f90" : "transparent"}`,
              marginBottom: "-2px",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "fontee" && (
        <ProviderCard
          key="fontee"
          providerKey="fontee"
          title="Fonnte WhatsApp API"
          icon="💬"
          description="Konfigurasi kredensial Fonnte untuk pengiriman reminder via WhatsApp."
          fields={[
            {
              label: "Nomor Pengirim / Tujuan Default",
              placeholder: "628xxxxxxxxxx",
              hint: "Nomor WhatsApp yang terdaftar di Fonnte (format internasional tanpa +)",
            },
            {
              label: "Fonnte API Token",
              placeholder: "Masukkan token dari dashboard Fonnte",
              isSecret: true,
              hint: "Token dari app.fonnte.com → Perangkat → Token",
            },
          ]}
        />
      )}

      {tab === "gmail" && (
        <ProviderCard
          key="gmail"
          providerKey="gmail"
          title="Gmail Reminder"
          icon="✉"
          description="Konfigurasi akun Gmail untuk pengiriman reminder via email."
          fields={[
            {
              label: "Email Pengirim",
              placeholder: "noreply@fumakilla.co.id",
              hint: "Alamat email yang digunakan sebagai pengirim reminder",
            },
            {
              label: "Gmail App Password",
              placeholder: "App password dari Google Account",
              isSecret: true,
              hint: "Generate di Google Account → Security → App Passwords",
            },
          ]}
        />
      )}
    </div>
  );
}
