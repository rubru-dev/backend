import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a23f00]">Ruangkeruang</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
      <Link href="/ruangkeruang/site" className="mt-8 inline-flex min-h-11 w-fit items-center rounded-xl bg-[#f36b21] px-5 font-medium text-white hover:bg-[#d9531e]">
        Kembali ke beranda
      </Link>
    </main>
  );
}
