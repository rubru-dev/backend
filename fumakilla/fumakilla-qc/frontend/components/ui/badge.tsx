import { cls } from "@/lib/utils";

const colors: Record<string, string> = {
  PASS: "bg-pass-bg text-pass",
  FAIL: "bg-fail-bg text-fail",
  ON_HOLD: "bg-hold-bg text-hold",
  PENDING: "bg-gray-100 text-ts",
  OPEN: "bg-fail-bg text-fail",
  IN_PROGRESS: "bg-hold-bg text-hold",
  CLOSED: "bg-pass-bg text-pass",
  CRITICAL: "bg-fail-bg text-fail",
  MAJOR: "bg-hold-bg text-hold",
  MINOR: "bg-info-bg text-info",
  ACTIVE: "bg-info-bg text-info",
  RELEASED: "bg-pass-bg text-pass",
  REJECTED: "bg-fail-bg text-fail",
  QUARANTINE: "bg-hold-bg text-hold",
};

export function Badge({ children, value }: { children?: React.ReactNode; value?: string }) {
  return <span className={cls("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", colors[value || String(children)] || "bg-gray-100 text-ts")}>{children ?? value}</span>;
}
