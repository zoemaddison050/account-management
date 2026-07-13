/**
 * Loads a static signature image from a URL, converts it to a PNG data URL
 * (required by jsPDF's addImage), and returns the image's natural aspect ratio.
 *
 * The images live in `public/signatures/` and are served at the same origin.
 */

export interface SignatureImage {
  dataUrl: string;
  aspectRatio: number;
}

/** Default signature image URLs served from the public folder. */
export const COMPANY_SIGNATURE_URL = '/signatures/company-signature.png';
export const MANAGER_SIGNATURE_URL = '/signatures/manager-signature.png';

/**
 * Loads an image from the given URL and returns it as a PNG data URL
 * with its natural width/height aspect ratio.
 *
 * The image is drawn onto a canvas so that:
 *   1. We get a data URL suitable for `doc.addImage()` in jsPDF.
 *   2. The natural pixel dimensions are available for aspect-ratio-preserving
 *      scaling in the PDF.
 *
 * @param url The image URL (e.g. "/signatures/company-signature.png")
 * @returns The image as a PNG data URL and its aspect ratio, or null on failure
 */
export async function loadSignatureImage(url: string): Promise<SignatureImage | null> {
  if (typeof document === 'undefined') return null;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });

    const aspectRatio = img.naturalWidth / img.naturalHeight;

    // Convert to a data URL via canvas so jsPDF can embed it
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    return { dataUrl, aspectRatio };
  } catch {
    return null;
  }
}
