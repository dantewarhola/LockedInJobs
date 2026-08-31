import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, sanitizeFileName, validatePdf } from '../lib/pdf';

const ok = {
  name: 'Resume.pdf',
  type: 'application/pdf',
  size: 200_000,
  head: '%PDF-1.7',
};

describe('validatePdf', () => {
  it('accepts a well-formed PDF', () => {
    expect(validatePdf(ok)).toBeNull();
  });

  it('rejects a non-.pdf extension', () => {
    expect(validatePdf({ ...ok, name: 'resume.docx' })).toMatch(/\.pdf/i);
  });

  it('rejects a wrong MIME type', () => {
    expect(validatePdf({ ...ok, type: 'image/png' })).toMatch(/pdf/i);
  });

  it('accepts an empty MIME type as long as bytes and extension are right', () => {
    expect(validatePdf({ ...ok, type: '' })).toBeNull();
  });

  it('rejects an empty file', () => {
    expect(validatePdf({ ...ok, size: 0 })).toMatch(/empty/i);
  });

  it('rejects a file over the size limit', () => {
    expect(validatePdf({ ...ok, size: MAX_FILE_BYTES + 1 })).toMatch(/15 MB/);
  });

  it('rejects content that is not really a PDF', () => {
    expect(validatePdf({ ...ok, head: '<htm' })).toMatch(/does not look like/i);
  });
});

describe('sanitizeFileName', () => {
  it('keeps a clean name and normalizes the extension', () => {
    expect(sanitizeFileName('Dante_Warhola_Resume.pdf')).toBe('Dante_Warhola_Resume.pdf');
    expect(sanitizeFileName('cover letter.PDF')).toBe('cover letter.pdf');
  });

  it('strips directory components', () => {
    expect(sanitizeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf');
    expect(sanitizeFileName('C:\\Users\\me\\LOR.pdf')).toBe('LOR.pdf');
  });

  it('drops disallowed characters', () => {
    expect(sanitizeFileName('resume*(final)!.pdf')).toBe('resumefinal.pdf');
  });

  it('falls back to "document" when nothing usable remains', () => {
    expect(sanitizeFileName('***.pdf')).toBe('document.pdf');
  });

  it('caps the length', () => {
    const long = `${'a'.repeat(200)}.pdf`;
    const out = sanitizeFileName(long);
    expect(out.endsWith('.pdf')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(104);
  });
});
