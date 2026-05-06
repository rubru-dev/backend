export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-ts">
      <div className="rounded-full bg-surface px-4 py-3 text-2xl">□</div>
      <p>{message}</p>
      {action}
    </div>
  );
}
