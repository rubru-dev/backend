function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function waitForImages(element: ParentNode) {
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

function collectDocumentStyles() {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
    .map((link) => `<link rel="stylesheet" href="${link.href}">`)
    .join("\n");
  const styles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
    .map((style) => `<style>${style.textContent ?? ""}</style>`)
    .join("\n");

  return `${links}\n${styles}`;
}

export async function downloadOfferPdf(selector: string, filename: string) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error("Preview penawaran tidak ditemukan.");
  }

  await waitForImages(element);

  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    throw new Error("Popup print diblokir browser.");
  }

  const title = safeFileName(filename);
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base href="${window.location.origin}">
    <title>${title}</title>
    ${collectDocumentStyles()}
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
      body { font-family: Arial, Helvetica, sans-serif; }
      .offer-page {
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 0.5cm 1.5cm !important;
        border: 0 !important;
        box-shadow: none !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 12px !important;
      }
      .offer-page table, .offer-page tr, .offer-page p, .offer-page ul, .offer-page ol {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .page-break {
        break-before: page;
        page-break-before: always;
      }
      @media screen {
        body { background: #e5e7eb; }
        .offer-page { margin: 24px auto !important; }
      }
    </style>
  </head>
  <body>
    ${element.outerHTML}
  </body>
</html>`);
  printWindow.document.close();
  try {
    printWindow.opener = null;
  } catch {
    // Browser may block writing opener; printing can continue.
  }

  const printWhenReady = async () => {
    await waitForImages(printWindow.document);
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 300);
  };

  if (printWindow.document.readyState === "complete") {
    await printWhenReady();
  } else {
    printWindow.addEventListener("load", () => void printWhenReady(), { once: true });
    window.setTimeout(() => void printWhenReady(), 1000);
  }
}
