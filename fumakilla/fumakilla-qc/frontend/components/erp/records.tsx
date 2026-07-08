"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loading, PageTitle, Status, useGet } from "./shared";
import { showAlert } from "@/lib/app-modal";

const formatDate=(v:string)=>new Date(v).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
const todayISO=()=>new Date().toISOString().slice(0,10);

function Summary({label,value}:{label:string;value:number}){return <div className="card p-6"><p className="text-xs font-bold tracking-wider text-ts">{label}</p><p className="mt-5 text-4xl font-bold">{value}</p></div>}

// Dropdown Export (PDF/PPT) — terkunci sampai quotation di-approve (tanda tangan).
function ExportMenu({disabled,onExport}:{disabled:boolean;onExport:(f:"pdf"|"ppt")=>void}){
  const [open,setOpen]=useState(false);
  const btnRef=useRef<HTMLButtonElement>(null);
  const [coords,setCoords]=useState({top:0,left:0});
  useEffect(()=>{
    if(!open)return;
    const close=()=>setOpen(false);
    window.addEventListener("click",close);
    window.addEventListener("scroll",close,true);
    return ()=>{window.removeEventListener("click",close);window.removeEventListener("scroll",close,true);};
  },[open]);
  const toggle=(e:React.MouseEvent)=>{
    e.stopPropagation();
    if(disabled)return;
    const r=btnRef.current!.getBoundingClientRect();
    setCoords({top:r.bottom+4,left:Math.max(8,r.right-160)});
    setOpen(o=>!o);
  };
  return <span className="inline-block">
    <button ref={btnRef} disabled={disabled} onClick={toggle}
      title={disabled?"Quotation harus di-approve (tanda tangan) dulu":"Download report"}
      className="rounded border border-[#6b7280] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50">
      ⇩ Download ▾
    </button>
    {open&&<div style={{position:"fixed",top:coords.top,left:coords.left,width:160}} className="z-50 overflow-hidden rounded-lg border border-bdr bg-white shadow-lg" onClick={e=>e.stopPropagation()}>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-[#f2f3fd]" onClick={()=>{setOpen(false);onExport("pdf");}}><span className="rounded bg-[#e5252a] px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white">PDF</span>Download PDF</button>
      <button className="flex w-full items-center gap-2 border-t border-bdr px-3 py-2 text-left text-xs font-medium hover:bg-[#f2f3fd]" onClick={()=>{setOpen(false);onExport("ppt");}}><span className="rounded bg-[#d24726] px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white">PPT</span>Download PPT</button>
    </div>}
  </span>;
}

// Modal buat quotation baru (pilih inquiry) — menggantikan halaman /quotations/new.
function CreateQuotationModal({seg,onClose,onCreated}:{seg:"B2B"|"B2C";onClose:()=>void;onCreated:(id:string)=>void}){
  const {data:inqData,loading:loadingInq}=useGet<any>(`/erp/inquiries?segmentType=${seg}&limit=200`);
  const inquiries:any[]=inqData?.data||[];
  const [inquiryId,setInquiryId]=useState("");
  const [title,setTitle]=useState(`Proposal Pest Control ${seg}`);
  const [quotationDate,setQuotationDate]=useState(todayISO());
  const [proposalType,setProposalType]=useState("TERMITE");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const selected=inquiries.find(x=>x.id===inquiryId)||null;

  useEffect(()=>{
    if(!selected)return;
    const name=seg==="B2B"?(selected.companyName||selected.customerName):selected.customerName;
    setTitle(`Proposal Pest Control — ${name}`);
  },[inquiryId]);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!inquiryId){setError("Pilih inquiry terlebih dahulu.");return;}
    setSaving(true);setError("");
    try{
      const inq=inquiries.find(x=>x.id===inquiryId)!;
      const res=await api.post("/erp/quotations",{
        customerId:inq.customerId||inq.customer?.id||inq.id,
        inquiryId,title,amount:0,quotationDate,segmentType:seg,
        priceData:{ proposalType },
      });
      onCreated(res.data.id);
    }catch(err:any){
      setError(err?.response?.data?.error||"Gagal membuat quotation.");
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e=>e.stopPropagation()}>
      <h3 className="text-base font-bold text-tp">Buat Quotation {seg}</h3>
      <p className="mt-1 text-sm text-ts">Pilih inquiry {seg==="B2B"?"perusahaan":"individu/residensial"} untuk dibuatkan proposal.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold">Inquiry {seg}{loadingInq&&<span className="ml-2 text-xs font-normal text-ts">Memuat...</span>}
          <select className="mt-2" required value={inquiryId} onChange={e=>setInquiryId(e.target.value)}>
            <option value="">— Pilih inquiry —</option>
            {inquiries.map(inq=><option key={inq.id} value={inq.id}>{inq.number} — {seg==="B2B"?(inq.companyName||inq.customerName):inq.customerName}</option>)}
          </select>
        </label>
        {selected&&<div className="rounded-lg border border-[#d9ddeb] bg-[#f9f9ff] p-3 text-sm space-y-1">
          <p className="font-bold text-tp">{seg==="B2B"?(selected.companyName||selected.customerName):selected.customerName}</p>
          {seg==="B2B"&&selected.companyName&&<p className="text-ts text-xs">Contact: {selected.customerName}</p>}
          <p className="text-ts text-xs">{selected.address||"—"}</p>
        </div>}
        <div>
          <p className="text-sm font-semibold">Jenis Proposal</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[{v:"TERMITE",l:"Termite",d:"Proposal khusus rayap"},{v:"GENERAL",l:"Pest Umum",d:"Proposal pest control umum"}].map(t=>(
              <button type="button" key={t.v} onClick={()=>setProposalType(t.v)}
                className={`rounded-lg border p-3 text-left transition ${proposalType===t.v?"border-accent bg-[#f0f5ff] ring-1 ring-accent":"border-[#d9ddeb] hover:border-accent"}`}>
                <p className={`text-sm font-bold ${proposalType===t.v?"text-accent":"text-tp"}`}>{proposalType===t.v?"● ":"○ "}{t.l}</p>
                <p className="mt-0.5 text-xs text-ts">{t.d}</p>
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm font-semibold">Tanggal Quotation
          <input className="mt-2" type="date" required value={quotationDate} onChange={e=>setQuotationDate(e.target.value)} />
        </label>
        <label className="block text-sm font-semibold">Judul Quotation
          <input className="mt-2" required value={title} onChange={e=>setTitle(e.target.value)} />
        </label>
        {error&&<p className="text-sm font-semibold text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Membuat...":"Buat & Buka"}</button>
        </div>
      </form>
    </div>
  </div>;
}

function QuotationTab({seg}:{seg:"B2B"|"B2C"}){
  const router=useRouter();
  const {data,loading,reload}=useGet<any>(`/erp/quotations?segmentType=${seg}&limit=100`);
  const rows=data?.data||[];
  const [deleteTarget,setDeleteTarget]=useState<any>(null);
  const [deleting,setDeleting]=useState(false);
  const [changingStatus,setChangingStatus]=useState<Record<string,boolean>>({});
  const [pushMsg,setPushMsg]=useState<string|null>(null);
  const [expandedId,setExpandedId]=useState<string|null>(null);
  const [showCreate,setShowCreate]=useState(false);

  const exportQuotation=(id:string,format:"pdf"|"ppt")=>router.push(`/quotations/${id}?export=${format}`);

  const handleDelete=async()=>{
    if(!deleteTarget)return;
    setDeleting(true);
    try{
      await api.delete(`/erp/quotations/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    }catch(e:any){
      showAlert({ title: "Gagal menghapus", message: e?.response?.data?.error || "Gagal menghapus quotation.", tone: "danger" });
    }finally{setDeleting(false);}
  };

  const handleStatusChange=async(row:any,newStatus:string)=>{
    setChangingStatus(p=>({...p,[row.id]:true}));
    try{
      await api.patch(`/erp/quotations/${row.id}`,{status:newStatus});
      if(newStatus==="APPROVED"){
        try{
          const res=await api.post(`/erp/quotations/${row.id}/push-to-order-sheet`,{});
          const osNum=res.data?.orderSheet?.number||"";
          const agrNum=res.data?.agreement?.number||"";
          setPushMsg(`✓ Quotation ${row.number} disetujui.\n• Order Sheet ${osNum} dibuat di Modul D.\n• Agreement ${agrNum} dibuat di Modul B — lengkapi tanggal & nilai kontrak.`);
        }catch(e:any){
          setPushMsg(`Status berubah ke APPROVED, namun gagal membuat Order Sheet/Agreement otomatis: ${e?.response?.data?.error||"Coba lagi."}`);
        }
      }
      reload();
    }catch(e:any){
      showAlert({ title: "Gagal mengubah status", message: e?.response?.data?.error || "Gagal mengubah status.", tone: "danger" });
    }finally{setChangingStatus(p=>({...p,[row.id]:false}));}
  };

  return <>
    <div className="mb-6 flex justify-end"><button onClick={()=>setShowCreate(true)} className="btn btn-primary">+ Buat Quotation {seg}</button></div>
    <section className="mb-6 grid gap-5 md:grid-cols-4">
      <Summary label="TOTAL" value={data?.total||0}/>
      <Summary label="APPROVED" value={rows.filter((x:any)=>x.status==="APPROVED").length}/>
      <Summary label="SENT" value={rows.filter((x:any)=>x.status==="SENT").length}/>
      <Summary label="DRAFT" value={rows.filter((x:any)=>x.status==="DRAFT").length}/>
    </section>

    {pushMsg&&<div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><span style={{whiteSpace:"pre-line"}}>{pushMsg}</span><button onClick={()=>setPushMsg(null)} className="shrink-0 font-bold">✕</button></div>}

    <div className="card overflow-hidden">
      {loading?<Loading/>:
      <table>
        <thead><tr>
          <th className="w-10"></th>
          <th>No. Quotation</th>
          <th>{seg==="B2B"?"Perusahaan / Klien":"Nama Klien"}</th>
          <th>Nilai Penawaran</th>
          <th>Status</th>
          <th>Tanggal</th>
        </tr></thead>
        <tbody>
          {rows.map((x:any)=>{
            const clientName=seg==="B2B"?(x.inquiry?.companyName||x.customer?.company||"-"):(x.inquiry?.customerName||x.customer?.name||"-");
            const approved=Boolean(x.approvedAt);
            return <Fragment key={x.id}>
              <tr className="table-row cursor-pointer" onClick={()=>setExpandedId(expandedId===x.id?null:x.id)}>
                <td className="text-center text-lg font-bold text-accent select-none">{expandedId===x.id?"−":"+"}</td>
                <td className="font-semibold text-accent">{x.number}</td>
                <td><p className="font-semibold">{clientName}</p><p className="text-xs text-ts mt-0.5">{x.title}</p></td>
                <td className="font-semibold">Rp {Number(x.amount).toLocaleString("id-ID")}</td>
                <td onClick={e=>e.stopPropagation()}>
                  <select value={x.status} disabled={changingStatus[x.id]} onChange={e=>handleStatusChange(x,e.target.value)}
                    className="text-xs rounded border border-[#d9ddeb] bg-white px-2 py-1 font-semibold">
                    {["DRAFT","SENT","APPROVED"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>{formatDate(x.quotationDate||x.createdAt)}</td>
              </tr>
              {expandedId===x.id&&<tr>
                <td colSpan={6} className="p-0">
                  <div className="border-t border-[#d9ddeb] bg-[#f8fbff] p-5">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Klien</p><p className="mt-1 text-sm font-semibold">{clientName}</p></div>
                      <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Judul</p><p className="mt-1 text-sm">{x.title}</p></div>
                      <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Nilai Penawaran</p><p className="mt-1 text-sm font-semibold">Rp {Number(x.amount).toLocaleString("id-ID")}</p></div>
                      <div><p className="text-[11px] font-bold uppercase tracking-wide text-ts">Approval</p><p className="mt-1 text-sm font-semibold">{approved?<span className="text-green-700">✓ Approved{x.approvedByName?` — ${x.approvedByName}`:""}</span>:<span className="text-amber-700">Belum di-approve</span>}</p></div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#d9ddeb] pt-4">
                      <Link href={`/quotations/${x.id}`} className="btn btn-primary text-xs px-4 py-1.5 min-h-0">✎ Edit Dokumen</Link>
                      <ExportMenu disabled={!approved} onExport={f=>exportQuotation(x.id,f)}/>
                      {!approved&&<span className="text-xs text-amber-700">Download PDF/PPT terkunci sampai dokumen di-approve (tanda tangan) di dalam editor.</span>}
                      <div className="flex-1"/>
                      <button onClick={()=>setDeleteTarget(x)} className="btn text-xs px-3 py-1.5 min-h-0 text-red-600 hover:bg-red-50">Hapus</button>
                    </div>
                  </div>
                </td>
              </tr>}
            </Fragment>;
          })}
          {!rows.length&&!loading&&<tr><td colSpan={6} className="py-10 text-center text-ts">Belum ada quotation {seg}.</td></tr>}
        </tbody>
      </table>}
    </div>

    {showCreate&&<CreateQuotationModal seg={seg} onClose={()=>setShowCreate(false)} onCreated={id=>router.push(`/quotations/${id}`)}/>}

    {deleteTarget&&(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
          <h3 className="text-base font-bold text-tp">Hapus Quotation?</h3>
          <p className="mt-2 text-sm text-ts">Quotation <span className="font-semibold text-tp">{deleteTarget.number}</span> akan dihapus permanen dan tidak bisa dikembalikan.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn" onClick={()=>setDeleteTarget(null)} disabled={deleting}>Batal</button>
            <button className="btn bg-red-600 text-white hover:bg-red-700 border-red-600" onClick={handleDelete} disabled={deleting}>{deleting?"Menghapus...":"Ya, Hapus"}</button>
          </div>
        </div>
      </div>
    )}
  </>;
}

export function Quotations(){
  const [tab,setTab]=useState<"B2B"|"B2C">("B2C");
  return <div className="p-9">
    <PageTitle title="Quotation" subtitle="Kelola dan pantau seluruh penawaran harga pelanggan B2B dan B2C."/>
    <div className="mt-7 flex gap-1 border-b border-[#d9ddeb]">
      {(["B2C","B2B"] as const).map(s=><button key={s} onClick={()=>setTab(s)} className={`px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${tab===s?"border-accent text-accent":"border-transparent text-ts hover:text-tp"}`}>Quotation {s}</button>)}
    </div>
    <div className="mt-7"><QuotationTab seg={tab}/></div>
  </div>;
}

export function Renewals(){const {data,loading}=useGet<any>("/erp/renewals");return <div className="p-9"><PageTitle title="Renewal Management" subtitle="Monitor dan kelola masa berlaku kontrak pelanggan."/><div className="mt-7 flex gap-8 border-b border-bdr pb-4 font-medium"><span className="text-accent">Agreements</span></div><section className="mt-7 grid gap-5 md:grid-cols-3"><Summary label="CRITICAL RENEWALS" value={data?.data?.filter((x:any)=>x.progress<30).length||0}/><Summary label="AWAITING ACTION" value={data?.data?.filter((x:any)=>x.status==="UPCOMING").length||0}/><Summary label="COMPLETED MTD" value={data?.data?.filter((x:any)=>x.status==="RENEWED").length||0}/></section><div className="card mt-6 overflow-hidden">{loading?<Loading/>:<table><thead><tr><th>Contract ID</th><th>Customer Name</th><th>Expiry Date</th><th>Status / Progress</th><th>Action</th></tr></thead><tbody>{data?.data?.map((x:any)=><tr key={x.id}><td className="font-semibold text-accent">#{x.number}</td><td>{x.customer.name}</td><td>{formatDate(x.expiryDate)}</td><td><div className="h-2 w-36 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{width:`${x.progress}%`}}/></div><p className="mt-2 text-xs">{x.progress}% complete</p></td><td><Status value={x.status}/></td></tr>)}</tbody></table>}</div></div>}
