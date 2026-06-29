"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { PageTitle, useGet } from "@/components/erp/shared";

const today = () => new Date().toISOString().slice(0, 10);

type Inquiry = {
  id: string;
  number: string;
  customerName: string;
  companyName: string;
  address: string;
  segmentType: string;
  customerId: string;
  customer: { id: string };
};

function NewQuotationForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawType = params.get("type") || "b2b";
  const segmentType = rawType.toUpperCase() === "B2C" ? "B2C" : "B2B";

  const { data: inquiryData, loading: loadingInquiries } = useGet<any>(
    `/erp/inquiries?segmentType=${segmentType}&limit=200`
  );
  const inquiries: Inquiry[] = inquiryData?.data || [];

  const [form, setForm] = useState({
    inquiryId: "",
    title: `Proposal Pest Control ${segmentType}`,
    amount: "0",
    quotationDate: today(),
  });
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const inq = inquiries.find((x) => x.id === form.inquiryId) || null;
    setSelectedInquiry(inq);
    if (inq) {
      const clientName =
        segmentType === "B2B"
          ? inq.companyName || inq.customerName
          : inq.customerName;
      set("title", `Proposal Pest Control — ${clientName}`);
    }
  }, [form.inquiryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inquiryId) { setError("Pilih inquiry terlebih dahulu."); return; }
    setSaving(true);
    setError("");
    try {
      const inq = inquiries.find((x) => x.id === form.inquiryId)!;
      const res = await api.post("/erp/quotations", {
        customerId: inq.customerId || inq.customer?.id || inq.id,
        inquiryId: form.inquiryId,
        title: form.title,
        amount: Number(form.amount),
        quotationDate: form.quotationDate,
        segmentType,
      });
      router.push(`/quotations/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal membuat quotation.");
      setSaving(false);
    }
  };

  return (
    <div className="p-9">
      <PageTitle
        title={`Buat Quotation ${segmentType}`}
        subtitle={`Buat proposal penawaran baru untuk klien ${segmentType === "B2B" ? "perusahaan" : "individu / residensial"}.`}
        actions={<Link href="/quotations" className="btn">← Kembali</Link>}
      />

      <form onSubmit={handleSubmit} className="mt-8 max-w-2xl space-y-6">
        {/* Select Inquiry */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-tp">1. Pilih Data Inquiry {segmentType}</h2>
          <label className="block text-sm font-semibold">
            Inquiry {segmentType}
            {loadingInquiries && <span className="ml-2 text-ts font-normal">Memuat...</span>}
            <select
              className="mt-2"
              required
              value={form.inquiryId}
              onChange={(e) => set("inquiryId", e.target.value)}
            >
              <option value="">— Pilih inquiry —</option>
              {inquiries.map((inq) => (
                <option key={inq.id} value={inq.id}>
                  {inq.number} — {segmentType === "B2B" ? (inq.companyName || inq.customerName) : inq.customerName}
                </option>
              ))}
            </select>
          </label>

          {selectedInquiry && (
            <div className="rounded-lg border border-[#d9ddeb] bg-[#f9f9ff] p-4 text-sm space-y-1">
              <p className="font-bold text-tp">
                {segmentType === "B2B"
                  ? selectedInquiry.companyName || selectedInquiry.customerName
                  : selectedInquiry.customerName}
              </p>
              {segmentType === "B2B" && selectedInquiry.companyName && (
                <p className="text-ts">Contact: {selectedInquiry.customerName}</p>
              )}
              <p className="text-ts">{selectedInquiry.address || "—"}</p>
            </div>
          )}
        </div>

        {/* Quotation meta */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-tp">2. Detail Quotation</h2>

          <label className="block text-sm font-semibold">
            Judul Quotation
            <input
              className="mt-2"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold">
            Tanggal Quotation
            <input
              className="mt-2"
              type="date"
              required
              value={form.quotationDate}
              onChange={(e) => set("quotationDate", e.target.value)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-700 font-semibold">{error}</p>}

        <div className="flex gap-3">
          <Link href="/quotations" className="btn">Batal</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Membuat..." : "Buat Quotation & Buka Dokumen"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div className="p-9">Memuat...</div>}>
      <NewQuotationForm />
    </Suspense>
  );
}
