"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@fumakilla.co.id");
  const [password, setPassword] = useState("fumakilla2026");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("fqc_token", res.data.token);
      localStorage.setItem("fqc_user", JSON.stringify(res.data.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="text-4xl font-bold text-accent">FQC</div>
          <p className="mt-1 text-sm text-ts">Quality Control System - PT. Fumakilla Indonesia</p>
        </div>
        {error && <div className="mb-3 rounded bg-fail-bg p-3 text-sm text-fail">{error}</div>}
        <div className="mb-3"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="mb-5"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn btn-primary w-full" disabled={loading}>{loading ? "Masuk..." : "Login"}</button>
      </form>
    </main>
  );
}
