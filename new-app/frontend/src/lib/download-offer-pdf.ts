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

  const renderScale = Math.min(4, Math.max(3, (window.devicePixelRatio || 1) * 2));
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: renderScale,
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 0;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const pageSliceHeight = Math.floor(canvas.width * (contentHeight / contentWidth));
  const pageCanvas = document.createElement("canvas");
  const pageContext = pageCanvas.getContext("2d");

  if (!pageContext) {
    throw new Error("Gagal membuat canvas PDF.");
  }

  pageCanvas.width = canvas.width;

  for (let sourceY = 0, pageIndex = 0; sourceY < canvas.height; sourceY += pageSliceHeight, pageIndex += 1) {
    const sliceHeight = Math.min(pageSliceHeight, canvas.height - sourceY);
    pageCanvas.height = sliceHeight;
    pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, pageCanvas.width, sliceHeight);

    if (pageIndex > 0) pdf.addPage();

    const imageHeight = contentWidth * (sliceHeight / canvas.width);
    pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", margin, margin, contentWidth, imageHeight, undefined, "SLOW");
  }

  pdf.save(`${safeFileName(filename)}.pdf`);
}
