import { PageTitle } from "@/components/erp/shared";

export default function VendorsPage() {
  return (
    <div className="p-9">
      <PageTitle title="Data Vendor" subtitle="Kelola daftar vendor dan informasi pendukung pekerjaan lapangan." />
      <section className="card mt-7 p-6">
        <h2 className="text-lg font-bold">Database Vendor</h2>
        <p className="mt-2 text-sm text-ts">Modul ini siap digunakan untuk pengembangan data vendor.</p>
      </section>
    </div>
  );
}
