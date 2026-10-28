const TARGET_IMAGE_BYTES = 900 * 1024;
const MAX_IMAGE_EDGE = 1920;
const MIN_IMAGE_EDGE = 640;
const OUTPUT_MIME_TYPE = "image/jpeg";
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Browser gagal mengompres gambar.")),
      OUTPUT_MIME_TYPE,
      quality,
    );
  });
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback untuk browser yang belum mendukung decoding format/orientasi ini.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;

  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error(`Foto ${file.name} tidak dapat dibaca oleh browser ini. Coba gunakan JPG, PNG, atau WEBP.`);
  }

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

function jpegFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "") || "foto";
  return `${base}.jpg`;
}

export async function compressUploadImage(file: File): Promise<File> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Format ${file.name} tidak didukung. Gunakan JPG, PNG, WEBP, GIF, HEIC, atau HEIF.`);
  }

  const decoded = await decodeImage(file);
  try {
    const longestEdge = Math.max(decoded.width, decoded.height);
    if (
      file.size <= TARGET_IMAGE_BYTES &&
      longestEdge <= MAX_IMAGE_EDGE &&
      (file.type === "image/jpeg" || file.type === "image/png")
    ) {
      return file;
    }

    const initialScale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
    let width = Math.max(1, Math.round(decoded.width * initialScale));
    let height = Math.max(1, Math.round(decoded.height * initialScale));
    let smallestBlob: Blob | null = null;

    while (Math.max(width, height) >= MIN_IMAGE_EDGE) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Browser tidak mendukung kompresi gambar.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      for (const quality of [0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36]) {
        const blob = await canvasToBlob(canvas, quality);
        if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
        if (blob.size <= TARGET_IMAGE_BYTES) {
          return new File([blob], jpegFilename(file.name), {
            type: OUTPUT_MIME_TYPE,
            lastModified: Date.now(),
          });
        }
      }

      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }

    if (!smallestBlob || smallestBlob.size > TARGET_IMAGE_BYTES) {
      throw new Error(`Foto ${file.name} tidak berhasil diperkecil di bawah 1 MB.`);
    }

    return new File([smallestBlob], jpegFilename(file.name), {
      type: OUTPUT_MIME_TYPE,
      lastModified: Date.now(),
    });
  } finally {
    decoded.cleanup();
  }
}

export function formatUploadSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
