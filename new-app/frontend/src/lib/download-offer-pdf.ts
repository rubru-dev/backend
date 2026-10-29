function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function waitForImages(element: ParentNode) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        });
      }

      if (typeof img.decode === "function") {
        await img.decode().catch(() => undefined);
      }
    })
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

async function waitForPrintDocument(printWindow: Window) {
  if (printWindow.document.readyState !== "complete") {
    await new Promise<void>((resolve) => {
      printWindow.addEventListener("load", () => resolve(), { once: true });
      printWindow.setTimeout(resolve, 3000);
    });
  }

  await printWindow.document.fonts?.ready;
  await waitForImages(printWindow.document);
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

  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    throw new Error("Popup print diblokir browser.");
  }

  const title = escapeHtml(safeFileName(filename));
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
      .pdf-export-root { margin: 0; padding: 0; }
      .pdf-export-root .offer-page,
      .pdf-export-root .discount-page {
        margin: 0 !important;
        box-shadow: none !important;
      }
      .pdf-export-root .offer-page > header { display: flex !important; }
      .pdf-export-root .offer-page > footer { display: block !important; }
      .pdf-export-root .offer-page > header.grid,
      .pdf-export-root .offer-page > footer.grid { display: grid !important; }
      .pdf-export-root .offer-page > footer.flex { display: flex !important; }
      @media print {
        .pdf-export-root { display: block !important; }
      }
      @media screen {
        body { background: #e5e7eb; }
        .offer-page { margin: 24px auto !important; }
      }
    </style>
  </head>
  <body>
    <main class="pdf-export-root">${element.outerHTML}</main>
  </body>
</html>`);
  printWindow.document.close();
  try {
    printWindow.opener = null;
  } catch {
    // Browser may block writing opener; printing can continue.
  }

  await waitForImages(element);
  await waitForPrintDocument(printWindow);
  printWindow.focus();
  printWindow.print();
}
