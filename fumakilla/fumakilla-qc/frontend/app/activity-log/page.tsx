"use client";

import { useEffect, useMemo, useState } from "react";
import { Loading, PageTitle, ServerPagination, Status, useGet } from "@/components/erp/shared";

const dateTimeLabel = (value: string) => new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function ActivityLogPage() {
  const { data: usersData } = useGet<any>("/erp/users");
  const users = usersData?.data || [];

  const now = new Date();
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState<"month" | "range">("month");
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(""); // "" = semua bulan
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i)), [now]);

  // Bangun query filter (bulan/tahun → rentang tanggal, atau rentang manual).
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (mode === "month") {
      const y = Number(year);
      if (month) {
        const m = Number(month) - 1;
        p.set("from", new Date(y, m, 1).toISOString().slice(0, 10));
        p.set("to", new Date(y, m + 1, 0).toISOString().slice(0, 10));
      } else if (year) {
        p.set("from", `${y}-01-01`);
        p.set("to", `${y}-12-31`);
      }
    } else {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    }
    return p.toString();
  }, [userId, mode, year, month, from, to]);

  useEffect(() => { setPage(1); }, [query]);
  const { data, loading } = useGet<any>(`/erp/activity-logs?limit=25&page=${page}${query ? `&${query}` : ""}`);
  const rows = data?.data || [];

  const reset = () => { setUserId(""); setMode("month"); setYear(String(now.getFullYear())); setMonth(""); setFrom(""); setTo(""); };

  return (
    <div className="p-9">
      <PageTitle title="Log Aktivitas User" subtitle="Rekam jejak seluruh aktivitas user di sistem — siapa, melakukan apa, kapan. Filter berdasarkan user dan waktu." />

      <section className="card mt-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-semibold">User
            <select className="mt-1" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Semua user</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">Mode Waktu
            <select className="mt-1" value={mode} onChange={(e) => setMode(e.target.value as "month" | "range")}>
              <option value="month">Bulan / Tahun</option>
              <option value="range">Rentang Tanggal</option>
            </select>
          </label>
          {mode === "month" ? (
            <>
              <label className="text-xs font-semibold">Tahun
                <select className="mt-1" value={year} onChange={(e) => setYear(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select>
              </label>
              <label className="text-xs font-semibold">Bulan
                <select className="mt-1" value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="">Semua bulan</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="text-xs font-semibold">Dari<input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label className="text-xs font-semibold">Sampai<input className="mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-ts">{data?.total != null ? <>Ditemukan <b>{data.total}</b> aktivitas</> : ""}</p>
          <button className="btn !min-h-0 px-3 py-1.5 text-xs" onClick={reset}>Reset Filter</button>
        </div>
      </section>

      <div className="card mt-5 overflow-x-auto">
        {loading ? <Loading /> : (
          <table>
            <thead><tr><th style={{ width: 190 }}>Waktu</th><th>User</th><th>Tipe</th><th>Aktivitas</th></tr></thead>
            <tbody>
              {rows.map((log: any) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-ts">{dateTimeLabel(log.createdAt)}</td>
                  <td className="whitespace-nowrap"><b>{log.user?.name || "Sistem"}</b>{log.user?.role && <p className="text-xs text-ts">{log.user.role}</p>}</td>
                  <td><Status value={log.type || "INFO"} /></td>
                  <td className="whitespace-pre-wrap break-words">{log.message}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="p-10 text-center text-sm text-ts">Tidak ada aktivitas untuk filter ini.</td></tr>}
            </tbody>
          </table>
        )}
        {!loading && <ServerPagination page={page} total={data?.total || 0} onPage={setPage} loading={loading} />}
      </div>
    </div>
  );
}
