/**
 * Converts /images/logo.png to a base64 data URL.
 * Using base64 ensures @react-pdf/renderer Image always loads correctly
 * without depending on an HTTP fetch inside the PDF worker.
 */
export async function getLogoBase64(): Promise<string> {
  const response = await fetch("/images/logo.png");
  if (!response.ok) return "";
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}
