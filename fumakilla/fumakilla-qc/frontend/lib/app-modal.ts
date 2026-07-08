"use client";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type AlertOptions = {
  title?: string;
  message: string;
  buttonLabel?: string;
  tone?: "default" | "danger" | "success";
};

const palette = {
  default: { bg: "#2c3e5c", border: "#2c3e5c" },
  danger: { bg: "#dc2626", border: "#dc2626" },
  success: { bg: "#16713b", border: "#16713b" },
};

function ensureBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function makeModalShell() {
  const overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:9999",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "background:rgba(15,23,42,.42)",
    "padding:16px",
  ].join(";");

  const panel = document.createElement("div");
  panel.style.cssText = [
    "width:min(420px,100%)",
    "border-radius:12px",
    "background:#fff",
    "box-shadow:0 20px 50px rgba(15,23,42,.25)",
    "border:1px solid #e5e7eb",
    "padding:22px 24px",
    "font-family:Arial,sans-serif",
    "color:#111827",
  ].join(";");

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  return { overlay, panel };
}

function addText(panel: HTMLElement, title: string, message: string) {
  const heading = document.createElement("h2");
  heading.textContent = title;
  heading.style.cssText = "margin:0 0 8px;font-size:17px;font-weight:800;color:#111827";
  const body = document.createElement("p");
  body.textContent = message;
  body.style.cssText = "margin:0;font-size:13px;line-height:1.6;color:#4b5563;white-space:pre-line";
  panel.appendChild(heading);
  panel.appendChild(body);
}

function button(label: string, primary = false, tone: keyof typeof palette = "default") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  const p = palette[tone];
  btn.style.cssText = primary
    ? `min-height:36px;padding:6px 14px;border-radius:7px;border:1px solid ${p.border};background:${p.bg};color:#fff;font-size:13px;font-weight:800;cursor:pointer`
    : "min-height:36px;padding:6px 14px;border-radius:7px;border:1px solid #d1d5db;background:#fff;color:#374151;font-size:13px;font-weight:700;cursor:pointer";
  return btn;
}

export function showAlert(options: string | AlertOptions): Promise<void> {
  if (!ensureBrowser()) return Promise.resolve();
  const opts: AlertOptions = typeof options === "string" ? { message: options } : options;
  return new Promise(resolve => {
    const { overlay, panel } = makeModalShell();
    const close = () => { overlay.remove(); resolve(); };
    addText(panel, opts.title || "Informasi", opts.message);
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:20px";
    const ok = button(opts.buttonLabel || "OK", true, opts.tone || "default");
    ok.onclick = close;
    actions.appendChild(ok);
    panel.appendChild(actions);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    window.setTimeout(() => ok.focus(), 0);
  });
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  if (!ensureBrowser()) return Promise.resolve(false);
  return new Promise(resolve => {
    const { overlay, panel } = makeModalShell();
    const close = (value: boolean) => { overlay.remove(); resolve(value); };
    addText(panel, options.title || "Konfirmasi aksi", options.message);
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:20px";
    const cancel = button(options.cancelLabel || "Batal");
    const ok = button(options.confirmLabel || "Ya, lanjutkan", true, options.tone || "default");
    cancel.onclick = () => close(false);
    ok.onclick = () => close(true);
    actions.appendChild(cancel);
    actions.appendChild(ok);
    panel.appendChild(actions);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
    window.setTimeout(() => cancel.focus(), 0);
  });
}
