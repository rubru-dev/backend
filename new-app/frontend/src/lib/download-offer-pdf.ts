function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
}

export async function downloadOfferPdf(selector: string, filename: string) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error("Preview penawaran tidak ditemukan.");
  }

  await waitForImages(element);

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const imageRatio = canvas.height / canvas.width;
  let imageWidth = pageWidth;
  let imageHeight = pageWidth * imageRatio;

  if (imageHeight > pageHeight) {
    imageHeight = pageHeight;
    imageWidth = pageHeight / imageRatio;
  }

  const x = (pageWidth - imageWidth) / 2;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, 0, imageWidth, imageHeight, undefined, "FAST");
  pdf.save(`${safeFileName(filename)}.pdf`);
}
