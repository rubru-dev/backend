"use client";

import { Fragment, useMemo, useState } from "react";
import api from "@/lib/api";
import { fileUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Loading, Modal, PageTitle, Status, useGet } from "@/components/erp/shared";

type WorkPlan = any;
type UserOption = { id: string; name: string; role: string; email?: string };

const statusOptions = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const dateInput = (value: Date) => value.toISOString().slice(0, 10);
const timeLabel = (value?: string | null) => value || "--:--";
const dateLabel = (value: string) => new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const dateTimeLabel = (value: string) => new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

function WorkPlanForm({ item, users, defaultDate, onClose, onSaved }: { item?: WorkPlan | null; users: UserOption[]; defaultDate?: Date | null; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const currentRole = String(user?.role || "");
  const canAssignOwner = currentRole === "ADMIN" || currentRole === "MANAGER";
  const [title, setTitle] = useState(item?.title || "");
  const [workDate, setWorkDate] = useState(item?.workDate ? String(item.workDate).slice(0, 10) : dateInput(defaultDate || new Date()));
  const [startTime, setStartTime] = useState(item?.startTime || "09:00");
  const [endTime, setEndTime] = useState(item?.endTime || "");
  const [ownerId, setOwnerId] = useState(item?.ownerId || user?.id || "");
  const [location, setLocation] = useState(item?.location || "");
  const [description, setDescription] = useState(item?.description || "");
  const [status, setStatus] = useState(item?.status || "PLANNED");
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>(() => item?.taggedUsers?.map((row: any) => row.userId) || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleTag = (id: string) => setTaggedUserIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { title, workDate, startTime, endTime, ownerId, location, description, status, taggedUserIds };
      if (item?.id) await api.patch(`/erp/work-plans/${item.id}`, payload);
      else await api.post("/erp/work-plans", payload);
      onSaved();
      onClose();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Work plan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Judul Aktivitas<input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Follow up client B2B" /></label>
        <label className="text-sm font-semibold">Tanggal<input className="mt-2" type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} /></label>
        <label className="text-sm font-semibold">Jam Mulai<input className="mt-2" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
        <label className="text-sm font-semibold">Jam Selesai<input className="mt-2" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
        {canAssignOwner && <label className="text-sm font-semibold">Owner<select className="mt-2" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{users.map((u) => <option key={u.id} value={u.id}>{u.name} - {u.role}</option>)}</select></label>}
        {item?.id && <label className="text-sm font-semibold">Status<select className="mt-2" value={status} onChange={(event) => setStatus(event.target.value)}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label>}
        <label className="text-sm font-semibold md:col-span-2">Lokasi / Link<input className="mt-2" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Kantor, lokasi client, atau link meeting" /></label>
        <label className="text-sm font-semibold md:col-span-2">Rencana Pekerjaan<textarea className="mt-2" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detail pekerjaan yang akan dilakukan" /></label>
      </div>
      <div>
        <p className="text-sm font-bold">Tag User yang Terlibat</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {users.filter((u) => u.id !== ownerId).map((u) => (
            <label key={u.id} className="flex items-center gap-2 rounded-lg border border-bdr p-3 text-sm">
              <input className="h-4 w-4" type="checkbox" checked={taggedUserIds.includes(u.id)} onChange={() => toggleTag(u.id)} />
              <span><b>{u.name}</b><span className="ml-1 text-xs text-ts">({u.role})</span></span>
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onClose} disabled={saving}>Batal</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Work Plan"}</button>
      </div>
    </div>
  );
}

function CheckpointForm({ item, type, onClose, onSaved }: { item: WorkPlan; type: "CHECK_IN" | "CHECK_OUT"; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("type", type);
      body.append("note", note);
      if (file) body.append("file", file);
      await api.post(`/erp/work-plans/${item.id}/checkpoints`, body);
      onSaved();
      onClose();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Checkpoint gagal dikirim.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-bdr bg-surface p-4">
        <p className="font-bold">{item.title}</p>
        <p className="mt-1 text-ts">{dateLabel(item.workDate)} pukul {timeLabel(item.startTime)}-{timeLabel(item.endTime)}</p>
      </div>
      <label className="font-semibold">Catatan<textarea className="mt-2" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tuliskan progres, hasil, atau kendala" /></label>
      <label className="font-semibold">Upload Foto/File Bukti<input className="mt-2" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
      {error && <p className="font-semibold text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onClose} disabled={saving}>Batal</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Mengirim..." : type === "CHECK_IN" ? "Kirim Check In" : "Kirim Check Out"}</button>
      </div>
    </div>
  );
}

function WorkPlanDetail({ item, onEdit, onCheckpoint }: { item: WorkPlan; onEdit: (item: WorkPlan) => void; onCheckpoint: (item: WorkPlan, type: "CHECK_IN" | "CHECK_OUT") => void }) {
  const tagged = item.taggedUsers?.map((row: any) => row.user?.name).filter(Boolean).join(", ") || "-";
  return (
    <div className="border-t border-[#d9ddeb] bg-[#f8fbff] p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Owner</p><p className="mt-1 font-semibold">{item.owner?.name || "-"}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Jadwal</p><p className="mt-1 font-semibold">{dateLabel(item.workDate)} {item.startTime}-{item.endTime || "selesai"}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Tag User</p><p className="mt-1 font-semibold">{tagged}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Status</p><div className="mt-1"><Status value={item.status} /></div></div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Lokasi</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.location || "-"}</p></div>
        <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Rencana Pekerjaan</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.description || "-"}</p></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn" onClick={() => onEdit(item)}>Edit</button>
        <button className="btn btn-primary" onClick={() => onCheckpoint(item, "CHECK_IN")}>Check In</button>
        <button className="btn" onClick={() => onCheckpoint(item, "CHECK_OUT")}>Check Out</button>
      </div>
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold">Checkpoint & Bukti</p>
        <div className="grid gap-3 md:grid-cols-2">
          {item.checkpoints?.map((checkpoint: any) => (
            <div key={checkpoint.id} className="rounded-lg border border-bdr bg-white p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <b>{checkpoint.type === "CHECK_IN" ? "Check In" : "Check Out"} - {checkpoint.user?.name}</b>
                <span className="text-xs text-ts">{dateTimeLabel(checkpoint.createdAt)}</span>
              </div>
              {checkpoint.note && <p className="mt-2 whitespace-pre-wrap text-ts">{checkpoint.note}</p>}
              {checkpoint.filePath && (
                checkpoint.mimeType?.startsWith("image/")
                  ? <img className="mt-3 max-h-40 w-full rounded object-cover" src={fileUrl(checkpoint.filePath)} alt={checkpoint.fileName || "Bukti checkpoint"} />
                  : <a className="mt-3 inline-block text-xs font-bold text-accent hover:underline" href={fileUrl(checkpoint.filePath)} target="_blank" rel="noreferrer">{checkpoint.fileName || "Buka file bukti"}</a>
              )}
            </div>
          ))}
          {!item.checkpoints?.length && <p className="text-sm text-ts">Belum ada checkpoint.</p>}
        </div>
      </div>
    </div>
  );
}

function AdminLogs() {
  const { data, loading } = useGet<any>("/erp/work-plans/logs");
  const logs = data?.data || [];
  return (
    <div className="card mt-6 overflow-x-auto">
      {loading ? <Loading /> : (
        <table>
          <thead><tr><th>Waktu</th><th>Actor</th><th>Aksi</th><th>Work Plan</th><th>Log</th></tr></thead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id}>
                <td>{dateTimeLabel(log.createdAt)}</td>
                <td>{log.actor?.name || "-"}</td>
                <td><Status value={log.action} /></td>
                <td>{log.workPlan?.title || "-"}</td>
                <td>{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && !logs.length && <p className="p-10 text-center text-sm text-ts">Belum ada log work plan.</p>}
    </div>
  );
}

export default function WorkPlanPage() {
  const { user } = useAuth();
  const { data: usersData } = useGet<any>("/erp/users");
  const [tab, setTab] = useState<"calendar" | "list" | "logs">("calendar");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [filters, setFilters] = useState({ date: "", month: "", year: String(new Date().getFullYear()), startTime: "", endTime: "", ownerId: "", status: "", search: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formItem, setFormItem] = useState<WorkPlan | null | undefined>(undefined);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [checkpoint, setCheckpoint] = useState<{ item: WorkPlan; type: "CHECK_IN" | "CHECK_OUT" } | null>(null);

  const calendarUrl = `/erp/work-plans?month=${month.getMonth() + 1}&year=${month.getFullYear()}`;
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  const listUrl = `/erp/work-plans${params.toString() ? `?${params}` : ""}`;
  const { data, loading, reload } = useGet<any>(tab === "calendar" ? calendarUrl : listUrl);
  const workPlans: WorkPlan[] = data?.data || [];
  const users: UserOption[] = usersData?.data || [];
  const isAdmin = String(user?.role || "") === "ADMIN";

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (start.getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= total ? new Date(month.getFullYear(), month.getMonth(), day) : null;
    });
  }, [month]);

  const monthTitle = month.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const openCreate = (date?: Date | null) => { setDefaultDate(date || null); setFormItem(null); };
  const closeForm = () => { setFormItem(undefined); setDefaultDate(null); };

  const renderRows = () => (
    <div className="card mt-6 overflow-x-auto">
      {loading ? <Loading /> : (
        <table>
          <thead><tr><th className="w-10"></th><th>Aktivitas</th><th>Tanggal</th><th>Jam</th><th>Owner</th><th>Tag</th><th>Status</th><th>Checkpoint</th></tr></thead>
          <tbody>
            {workPlans.map((item) => (
              <Fragment key={item.id}>
                <tr className="table-row" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  <td className="text-center text-lg font-bold text-accent">{expandedId === item.id ? "-" : "+"}</td>
                  <td><b>{item.title}</b>{item.location && <p className="mt-0.5 text-xs text-ts">{item.location}</p>}</td>
                  <td>{dateLabel(item.workDate)}</td>
                  <td>{item.startTime}-{item.endTime || "selesai"}</td>
                  <td>{item.owner?.name || "-"}</td>
                  <td>{item.taggedUsers?.map((row: any) => row.user?.name).filter(Boolean).join(", ") || "-"}</td>
                  <td><Status value={item.status} /></td>
                  <td><span className="text-xs font-semibold text-ts">{item.checkpoints?.length || 0} log</span></td>
                </tr>
                {expandedId === item.id && (
                  <tr><td colSpan={8} className="p-0"><WorkPlanDetail item={item} onEdit={setFormItem} onCheckpoint={(wp, type) => setCheckpoint({ item: wp, type })} /></td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      {!loading && !workPlans.length && <p className="p-10 text-center text-sm text-ts">Belum ada work plan.</p>}
    </div>
  );

  return (
    <div className="p-9">
      <PageTitle title="Work Plan" subtitle="Susun rencana kerja harian, tag user yang terlibat, dan rekam bukti check in/check out." actions={<button className="btn btn-primary" onClick={() => openCreate()}>+ Tambah Work Plan</button>} />

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {(["calendar", "list"] as const).map((value) => <button key={value} className={`px-4 py-2 text-sm font-semibold ${tab === value ? "rounded bg-white text-accent shadow" : "text-ts"}`} onClick={() => setTab(value)}>{value === "calendar" ? "Kalender" : "List Work Plan"}</button>)}
          {isAdmin && <button className={`px-4 py-2 text-sm font-semibold ${tab === "logs" ? "rounded bg-white text-accent shadow" : "text-ts"}`} onClick={() => setTab("logs")}>Log Admin</button>}
        </div>
        {tab === "calendar" && <div className="flex items-center gap-2"><button className="btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Prev</button><b className="min-w-40 text-center">{monthTitle}</b><button className="btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button></div>}
      </div>

      {tab === "calendar" && (
        loading ? <div className="card mt-6"><Loading /></div> : (
          <div className="card mt-6 overflow-hidden">
            <div className="grid grid-cols-7 bg-surface text-center text-xs font-bold tracking-wider text-ts">{["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"].map((d) => <div className="p-4" key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const items = day ? workPlans.filter((item) => {
                  const value = new Date(item.workDate);
                  return value.getFullYear() === day.getFullYear() && value.getMonth() === day.getMonth() && value.getDate() === day.getDate();
                }) : [];
                return (
                  <div className="min-h-32 border-b border-r border-bdr p-2" key={index}>
                    {day && (
                      <>
                        <button className="text-sm font-bold hover:text-accent" onClick={() => openCreate(day)}>{day.getDate()}</button>
                        <div className="mt-2 space-y-1">
                          {items.map((item) => <button key={item.id} className="block w-full rounded border-l-4 border-accent bg-surface p-2 text-left text-xs" onClick={() => { setTab("list"); setExpandedId(item.id); }}><b className="block truncate">{item.title}</b><span>{item.startTime} - {item.owner?.name}</span></button>)}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {tab === "list" && (
        <>
          <section className="card mt-6 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <input placeholder="Cari aktivitas/lokasi" value={filters.search} onChange={(event) => setFilters((f) => ({ ...f, search: event.target.value }))} />
              <input type="date" value={filters.date} onChange={(event) => setFilters((f) => ({ ...f, date: event.target.value }))} />
              <select value={filters.month} onChange={(event) => setFilters((f) => ({ ...f, month: event.target.value, date: "" }))}><option value="">Semua bulan</option>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2026, i, 1).toLocaleDateString("id-ID", { month: "long" })}</option>)}</select>
              <input type="number" placeholder="Tahun" value={filters.year} onChange={(event) => setFilters((f) => ({ ...f, year: event.target.value }))} />
              <input type="time" value={filters.startTime} onChange={(event) => setFilters((f) => ({ ...f, startTime: event.target.value }))} />
              <input type="time" value={filters.endTime} onChange={(event) => setFilters((f) => ({ ...f, endTime: event.target.value }))} />
              <select value={filters.status} onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value }))}><option value="">Semua status</option>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select>
              <select value={filters.ownerId} onChange={(event) => setFilters((f) => ({ ...f, ownerId: event.target.value }))}><option value="">Semua owner</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
            </div>
          </section>
          {renderRows()}
        </>
      )}

      {tab === "logs" && isAdmin && <AdminLogs />}

      <Modal open={formItem !== undefined} title={formItem?.id ? "Edit Work Plan" : "Tambah Work Plan"} onClose={closeForm}>
        <WorkPlanForm item={formItem} users={users} defaultDate={defaultDate} onClose={closeForm} onSaved={reload} />
      </Modal>
      <Modal open={Boolean(checkpoint)} title={checkpoint?.type === "CHECK_IN" ? "Check In Work Plan" : "Check Out Work Plan"} onClose={() => setCheckpoint(null)}>
        {checkpoint && <CheckpointForm item={checkpoint.item} type={checkpoint.type} onClose={() => setCheckpoint(null)} onSaved={reload} />}
      </Modal>
    </div>
  );
}
