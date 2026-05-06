export function Loading() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-bdr border-t-accent" />;
}

export function PageLoading() {
  return <div className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-ts"><Loading /> Memuat data...</div>;
}
