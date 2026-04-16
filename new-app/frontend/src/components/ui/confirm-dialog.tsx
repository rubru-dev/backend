"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog";
import { Button } from "./button";

interface Props {
  open: boolean;
  onClose?: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  loading?: boolean;
  confirmLabel?: string;
  variant?: "destructive" | "default";
  // alias untuk onClose agar compatible dengan callers yang pakai onOpenChange
  onOpenChange?: (v: boolean) => void;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Konfirmasi Hapus",
  description = "Data yang dihapus tidak dapat dikembalikan. Lanjutkan?",
  loading,
  confirmLabel,
  variant = "destructive",
  onOpenChange,
}: Props) {
  const handleClose = () => { onClose?.(); onOpenChange?.(false); };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} />
            {title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-1">{description}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="animate-spin mr-2" size={14} />}
            Ya, Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
