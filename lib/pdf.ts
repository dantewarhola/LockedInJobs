export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
export const PDF_MAGIC = '%PDF-';

/**
 * Reduce an uploaded filename to a safe object name ending in `.pdf`:
 * strips any directory, drops odd characters, caps the length.
 */
export function sanitizeFileName(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? raw;
  const stem = base.replace(/\.pdf$/i, '');
  const cleaned = stem
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return `${cleaned || 'document'}.pdf`;
}

export interface PdfCandidate {
  name: string;
  type: string;
  size: number;
  /** First few bytes of the file, as text. */
  head: string;
}

/** Returns an error message, or null when the candidate is a valid PDF upload. */
export function validatePdf(file: PdfCandidate): string | null {
  if (!/\.pdf$/i.test(file.name)) return 'File must be a .pdf';
  if (file.type && file.type !== 'application/pdf') return 'File must be a PDF';
  if (file.size <= 0) return 'File is empty';
  if (file.size > MAX_FILE_BYTES) return 'File is larger than 15 MB';
  if (!file.head.startsWith(PDF_MAGIC)) return 'That file does not look like a PDF';
  return null;
}
