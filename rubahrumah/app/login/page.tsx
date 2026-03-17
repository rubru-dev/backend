"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { portalApi, setAuth, isLoggedIn } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await portalApi.login(username, password);
      setAuth(data.access_token, username);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative">
      {/* ── Mobile: LoginArt as background with opacity ── */}
      <div className="absolute inset-0 lg:hidden overflow-hidden">
        <Image
          src="/images/LoginArt.png"
          alt=""
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      {/* ── Left: Form ── */}
      <div className="relative w-full lg:w-1/2 flex flex-col bg-white/90 lg:bg-white">
        {/* Logo only – no navbar links */}
        <div className="px-5 sm:px-8 lg:px-10 py-5 border-b border-slate-100">
          <Image
            src="/images/logo.png"
            alt="RubahRumah"
            width={140}
            height={40}
            className="object-contain h-10 w-auto"
            priority
          />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-10 py-10 sm:py-16">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1">
              Selamat Datang 👋
            </h1>
            <p className="text-sm text-slate-400 mb-7">Masuk ke akun klien Anda</p>

            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username akun klien"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 placeholder:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Kata Sandi</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 placeholder:text-slate-300"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition mt-2 disabled:opacity-60"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Right: Logo decorative panel (large screen only) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0F4C75] to-[#1a6fa6] items-center justify-center relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="2" fill="white"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
        </div>

        {/* Centered logo + tagline */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="bg-white rounded-3xl p-8 shadow-2xl mb-8">
            <Image
              src="/images/logo.png"
              alt="RubahRumah"
              width={220}
              height={80}
              className="object-contain h-20 w-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Portal Klien</h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-xs">
            Pantau progres renovasi rumah Anda secara real-time, kapan saja dan di mana saja.
          </p>
          <div className="flex items-center gap-3 mt-8">
            {["Transparan", "Real-time", "Terpercaya"].map((tag) => (
              <span key={tag} className="bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-orange-400/20" />
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
