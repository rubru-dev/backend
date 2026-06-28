import { PageTitle } from "@/components/erp/shared";

export default function ComplaintsPage() {
  return (
    <div className="p-9">
      <PageTitle title="Complaint Handling" subtitle="Pantau dan tindak lanjuti keluhan pelanggan." />
      <section className="card mt-7 p-6">
        <h2 className="text-lg font-bold">Daftar Complaint</h2>
        <p className="mt-2 text-sm text-ts">Modul ini siap digunakan untuk pengembangan complaint handling.</p>
      </section>
    </div>
  );
}
