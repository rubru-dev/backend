"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenLine, Upload, RotateCcw, Check } from "lucide-react";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSave: (base64: string) => void;
  loading?: boolean;
}

export function SignatureDialog({ open, onOpenChange, title, onSave, loading }: SignatureDialogProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [tab, setTab] = useState<"draw" | "upload">("draw");

  function clearCanvas() {
    sigCanvasRef.current?.clear();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (tab === "draw") {
      if (sigCanvasRef.current?.isEmpty()) return;
      const data = sigCanvasRef.current!.toDataURL("image/png");
      onSave(data);
    } else {
      if (!uploadPreview) return;
      onSave(uploadPreview);
    }
  }

  function handleClose(v: boolean) {
    if (!v) {
      setUploadPreview(null);
      sigCanvasRef.current?.clear();
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" /> {title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "draw" | "upload")}>
          <TabsList className="w-full">
            <TabsTrigger value="draw" className="flex-1"><PenLine className="h-3.5 w-3.5 mr-1" /> Gambar</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1"><Upload className="h-3.5 w-3.5 mr-1" /> Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-3">
            <div className="border rounded-md bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#1a1a1a"
                canvasProps={{ width: 440, height: 200, className: "w-full" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gambar tanda tangan Anda di area di atas</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={clearCanvas}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Ulangi
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="mt-3">
            <label className="block border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Klik untuk upload gambar tanda tangan (PNG/JPG)</p>
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileUpload} />
            </label>
            {uploadPreview && (
              <div className="mt-3 border rounded-md p-3 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadPreview} alt="preview" className="max-h-32 mx-auto object-contain" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Batal</Button>
          <Button onClick={handleSave} disabled={loading}>
            <Check className="h-4 w-4 mr-1" />
            {loading ? "Menyimpan..." : "Simpan Tanda Tangan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
