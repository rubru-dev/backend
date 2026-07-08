"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("fqc_token", data.token);
      localStorage.setItem("fqc_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || "Login gagal. Periksa kembali data Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f9f9ff] p-5 lg:grid lg:grid-cols-[1.1fr_.9fr] lg:p-0">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#285f90] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[#d0e4ff]/25" />
        <div className="absolute bottom-[-150px] left-[-80px] h-96 w-96 rounded-full border border-[#d0e4ff]/20" />
        <div className="relative">
          <img src="/refrence/QuotationLogo.jpg" alt="Fumakilla" className="h-14 object-contain" style={{ mixBlendMode: "multiply" }} />
          <div className="mt-24 max-w-lg">
            <p className="text-xs font-bold tracking-[.18em] text-[#d0e4ff]">OPERATIONS CONTROL CENTER</p>
            <h1 className="mt-5 text-5xl font-bold leading-tight">Satu tempat untuk operasional layanan yang lebih terukur.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/75">Kelola inquiry, pelanggan, penawaran, renewal, jadwal survey, dan laporan tim dari satu sistem.</p>
          </div>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-40px)] items-center justify-center lg:min-h-screen lg:p-12">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <img src="/refrence/QuotationLogo.jpg" alt="Fumakilla" className="h-12 object-contain" />
          </div>
          <p className="text-xs font-bold tracking-[.16em] text-accent">SELAMAT DATANG</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">Masuk ke akun Anda</h2>
          <p className="mt-3 text-sm leading-6 text-ts">Gunakan akun kerja Anda untuk mengakses sistem operasional Fumakilla.</p>

          <div className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-tp">Email kerja
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="nama@fumakilla.co.id" className="mt-2" required />
            </label>
            <label className="block text-sm font-semibold text-tp">Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Masukkan password" className="mt-2" required />
            </label>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div>}
            <button disabled={loading} className="btn btn-primary w-full" type="submit">{loading ? "Memverifikasi..." : "Masuk ke aplikasi →"}</button>
          </div>
          <p className="mt-8 border-t border-bdr pt-5 text-center text-xs text-ts">Fumakilla ERP · Internal Service Operations</p>
        </form>
      </section>
    </main>
  );
}
