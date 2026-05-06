export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-tp">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ts">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
