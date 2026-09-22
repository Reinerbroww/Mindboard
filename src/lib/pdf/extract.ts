import { extractText, getDocumentProxy } from "unpdf";

export const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_PAGES = 50;
export const MAX_EXTRACTED_CHARS = 200_000;

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfValidationError";
  }
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch {
    throw new PdfValidationError("Could not read this PDF file.");
  }

  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  if (totalPages > MAX_PDF_PAGES) {
    throw new PdfValidationError(
      `PDF has more than ${MAX_PDF_PAGES} pages. Please use a shorter document.`
    );
  }

  const joined = text.trim();

  if (!joined) {
    throw new PdfValidationError(
      "No selectable text found in this PDF. Scanned PDFs are not supported yet."
    );
  }

  return normalizeText(joined.slice(0, MAX_EXTRACTED_CHARS));
}

export function validatePdfFile(file: {
  name?: string;
  size?: number;
  type?: string;
}): void {
  if (!file.name?.toLowerCase().endsWith(".pdf")) {
    throw new PdfValidationError("Only PDF files are supported.");
  }
  if (typeof file.size === "number" && file.size > MAX_PDF_SIZE) {
    throw new PdfValidationError("PDF file is too large (max 10 MB).");
  }
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}