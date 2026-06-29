"use client";
import { useState } from "react";
import Link from "next/link";
import { Loading, PageTitle, Status, useGet } from "./shared";

const formatDate=(v:string)=>new Date(v).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});

function Summary({label,value}:{label:string;value:number}){return <div className="card p-6"><p className="text-xs font-bold tracking-wider text-ts">{label}</p><p className="mt-5 text-4xl font-bold">{value}</p></div>}

function QuotationTab({seg}:{seg:"B2B"|"B2C"}){
  const {data,loading}=useGet<any>(`/erp/quotations?segmentType=${seg}&limit=100`);
  const rows=data?.data||[];
  return <>
    <div className="mb-6 flex justify-end"><Link href={`/quotations/new?type=${seg.toLowerCase()}`} className="btn btn-primary">+ Buat Quotation {seg}</Link></div>
    <section className="mb-6 grid gap-5 md:grid-cols-4">
      <Summary label="TOTAL" value={data?.total||0}/>
      <Summary label="APPROVED" value={rows.filter((x:any)=>x.status==="APPROVED").length}/>
      <Summary label="PENDING" value={rows.filter((x:any)=>x.status==="SENT").length}/>
      <Summary label="REJECTED" value={rows.filter((x:any)=>x.status==="REJECTED").length}/>
    </section>
    <div className="card overflow-hidden">{loading?<Loading/>:<table><thead><tr><th>No. Quotation</th><th>{seg==="B2B"?"Perusahaan / Klien":"Nama Klien"}</th><th>Nilai Penawaran</th><th>Status</th><th>Tanggal</th><th></th></tr></thead><tbody>{rows.map((x:any)=><tr key={x.id} className="table-row"><td className="font-semibold text-accent">{x.number}</td><td><p className="font-semibold">{seg==="B2B"?(x.inquiry?.companyName||x.customer?.company||"-"):(x.inquiry?.customerName||x.customer?.name||"-")}</p><p className="text-xs text-ts mt-0.5">{x.title}</p></td><td className="font-semibold">Rp {Number(x.amount).toLocaleString("id-ID")}</td><td><Status value={x.status}/></td><td>{formatDate(x.quotationDate||x.createdAt)}</td><td><Link href={`/quotations/${x.id}`} className="btn text-xs px-3 py-1.5 min-h-0">Buka</Link></td></tr>)}{!rows.length&&!loading&&<tr><td colSpan={6} className="py-10 text-center text-ts">Belum ada quotation {seg}.</td></tr>}</tbody></table>}</div>
  </>;
}

export function Quotations(){
  const [tab,setTab]=useState<"B2B"|"B2C">("B2B");
  return <div className="p-9">
    <PageTitle title="Quotation" subtitle="Kelola dan pantau seluruh penawaran harga pelanggan B2B dan B2C."/>
    <div className="mt-7 flex gap-1 border-b border-[#d9ddeb]">
      {(["B2B","B2C"] as const).map(s=><button key={s} onClick={()=>setTab(s)} className={`px-5 py-3 text-sm font-semibold transition border-b-2 -mb-px ${tab===s?"border-accent text-accent":"border-transparent text-ts hover:text-tp"}`}>Quotation {s}</button>)}
    </div>
    <div className="mt-7"><QuotationTab seg={tab}/></div>
  </div>;
}

export function Renewals(){const {data,loading}=useGet<any>("/erp/renewals");return <div className="p-9"><PageTitle title="Renewal Management" subtitle="Monitor dan kelola masa berlaku kontrak pelanggan."/><div className="mt-7 flex gap-8 border-b border-bdr pb-4 font-medium"><span className="text-accent">Agreements</span><span>Outstanding (OS)</span><span>Notifications</span></div><section className="mt-7 grid gap-5 md:grid-cols-3"><Summary label="CRITICAL RENEWALS" value={data?.data?.filter((x:any)=>x.progress<30).length||0}/><Summary label="AWAITING ACTION" value={data?.data?.filter((x:any)=>x.status==="UPCOMING").length||0}/><Summary label="COMPLETED MTD" value={data?.data?.filter((x:any)=>x.status==="RENEWED").length||0}/></section><div className="card mt-6 overflow-hidden">{loading?<Loading/>:<table><thead><tr><th>Contract ID</th><th>Customer Name</th><th>Expiry Date</th><th>Status / Progress</th><th>Action</th></tr></thead><tbody>{data?.data?.map((x:any)=><tr key={x.id}><td className="font-semibold text-accent">#{x.number}</td><td>{x.customer.name}</td><td>{formatDate(x.expiryDate)}</td><td><div className="h-2 w-36 rounded bg-surface"><div className="h-2 rounded bg-accent" style={{width:`${x.progress}%`}}/></div><p className="mt-2 text-xs">{x.progress}% complete</p></td><td><Status value={x.status}/></td></tr>)}</tbody></table>}</div></div>}
