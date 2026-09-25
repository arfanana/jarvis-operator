import QRCode from "qrcode";

// Local QR generation (no external API). Produces a scannable PNG data URL.
export async function qrDataUrl(text: string, opts?: { width?: number }): Promise<string> {
  if (!text || text.length > 2048) throw new Error("QR text invalid.");
  return QRCode.toDataURL(text, {
    width: opts?.width ?? 256,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
