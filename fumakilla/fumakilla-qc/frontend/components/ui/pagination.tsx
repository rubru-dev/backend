export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 border-t border-bdr p-3 text-sm">
      <button className="btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</button>
      <span className="text-ts">{page} / {totalPages}</span>
      <button className="btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );
}
