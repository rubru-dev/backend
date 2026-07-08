"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { showConfirm } from "@/lib/app-modal";

export function AdminDeleteRecord() {
  const pathname = usePathname(); const router = useRouter(); const { user } = useAuth(); const [deleting, setDeleting] = useState(false); const [error, setError] = useState("");
  const match = pathname.match(/^\/(customers|inquiries)\/([^/]+)$/);
  if (user?.role !== "ADMIN" || !match) return null;
  const [, resource, id] = match; const label = resource === "customers" ? "Customer" : "Inquiry";
  const remove = async () => { const warning = resource === "customers" ? "Inquiry, quotation, survey, file, dan data terkait customer ini juga akan terhapus." : "Tindakan ini tidak dapat dibatalkan."; const ok = await showConfirm({ title: `Hapus ${label}?`, message: warning, confirmLabel: `Ya, hapus ${label}`, tone: "danger" }); if (!ok) return; setDeleting(true); setError(""); try { await api.delete(`/erp/${resource}/${id}`); router.push(`/${resource}`); } catch (requestError: any) { setError(requestError.response?.data?.error || `${label} gagal dihapus.`); setDeleting(false); } };
  return <div className="fixed bottom-6 right-6 z-40 text-right"><button className="btn border-red-300 bg-white text-red-700 shadow-lg" disabled={deleting} onClick={remove}>{deleting ? "Menghapus..." : `Hapus ${label}`}</button>{error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 shadow">{error}</p>}</div>;
}
