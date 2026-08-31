import { describe, expect, it } from 'vitest';
import writeXlsxFile from 'write-excel-file/node';
import {
  REQUIRED_HEADERS,
  normalizeDate,
  normalizeStatus,
  parseSalary,
  parseWorkbook,
  recordToRow,
} from '../lib/import';

describe('parseSalary', () => {
  it('parses a "$xx,xxx - $xxx,xxx" range', () => {
    expect(parseSalary('$80,000 - $120,000')).toEqual({ salary_min: 80000, salary_max: 120000 });
  });
  it('treats N/A and blank as no salary', () => {
    expect(parseSalary('N/A')).toEqual({ salary_min: null, salary_max: null });
    expect(parseSalary('n/a')).toEqual({ salary_min: null, salary_max: null });
    expect(parseSalary('')).toEqual({ salary_min: null, salary_max: null });
    expect(parseSalary(null)).toEqual({ salary_min: null, salary_max: null });
  });
  it('parses a single number as min only', () => {
    expect(parseSalary('$95,000')).toEqual({ salary_min: 95000, salary_max: null });
  });
  it('accepts a numeric cell', () => {
    expect(parseSalary(90000)).toEqual({ salary_min: 90000, salary_max: null });
  });
});

describe('normalizeStatus', () => {
  it('matches case-insensitively', () => {
    expect(normalizeStatus('rejected')).toBe('Rejected');
    expect(normalizeStatus('  Online Assessment ')).toBe('Online Assessment');
    expect(normalizeStatus('N/A')).toBe('N/A');
  });
  it('maps blank to N/A', () => {
    expect(normalizeStatus('')).toBe('N/A');
    expect(normalizeStatus(null)).toBe('N/A');
  });
  it('returns null for an unrecognized value', () => {
    expect(normalizeStatus('Pending')).toBeNull();
  });
});

describe('normalizeDate', () => {
  it('passes through ISO', () => {
    expect(normalizeDate('2024-03-05')).toBe('2024-03-05');
  });
  it('converts M/D/YYYY', () => {
    expect(normalizeDate('3/5/2024')).toBe('2024-03-05');
    expect(normalizeDate('12/25/2023')).toBe('2023-12-25');
  });
  it('converts a Date object using its UTC calendar day', () => {
    expect(normalizeDate(new Date('2024-03-05T00:00:00Z'))).toBe('2024-03-05');
  });
  it('returns null for blank or garbage', () => {
    expect(normalizeDate('')).toBeNull();
    expect(normalizeDate('not a date')).toBeNull();
  });
});

describe('recordToRow', () => {
  const good = {
    Business: 'Acme',
    'Job Title': 'Engineer',
    Location: 'Remote',
    Salary: '$80,000 - $120,000',
    'Application Date': '2020-01-01',
    Status: 'Applied',
    Link: 'https://jobs.acme.com/1',
  };

  it('maps a valid record with no errors', () => {
    const row = recordToRow(good, 2);
    expect(row.errors).toEqual([]);
    expect(row.values).toEqual({
      company_name: 'Acme',
      job_title: 'Engineer',
      location: 'Remote',
      salary_min: 80000,
      salary_max: 120000,
      application_date: '2020-01-01',
      status: 'Applied',
      dashboard_url: 'https://jobs.acme.com/1',
      notes: null,
    });
  });

  it('treats N/A location, link and salary as null', () => {
    const row = recordToRow({ ...good, Location: 'N/A', Link: 'N/A', Salary: 'N/A' }, 2);
    expect(row.errors).toEqual([]);
    expect(row.values?.location).toBeNull();
    expect(row.values?.dashboard_url).toBeNull();
    expect(row.values?.salary_min).toBeNull();
    expect(row.values?.salary_max).toBeNull();
  });

  it('keeps a blank Status as the N/A status', () => {
    const row = recordToRow({ ...good, Status: '' }, 2);
    expect(row.errors).toEqual([]);
    expect(row.values?.status).toBe('N/A');
  });

  it('flags an unknown status', () => {
    const row = recordToRow({ ...good, Status: 'Pending' }, 4);
    expect(row.values).toBeUndefined();
    expect(row.errors.join(' ')).toMatch(/status/i);
    expect(row.index).toBe(4);
  });

  it('flags a missing business name', () => {
    const row = recordToRow({ ...good, Business: '' }, 3);
    expect(row.values).toBeUndefined();
    expect(row.errors.join(' ')).toMatch(/company/i);
  });

  it('flags a future application date', () => {
    const row = recordToRow({ ...good, 'Application Date': '2999-01-01' }, 3);
    expect(row.values).toBeUndefined();
    expect(row.errors.join(' ')).toMatch(/date/i);
  });

  it('flags an unparseable date', () => {
    const row = recordToRow({ ...good, 'Application Date': 'soon' }, 3);
    expect(row.values).toBeUndefined();
    expect(row.errors.join(' ')).toMatch(/date/i);
  });
});

async function xlsxBuffer(rows: (string | number | null)[][]): Promise<Buffer> {
  const data = rows.map((r) =>
    r.map((v) => (v === null ? {} : { value: v, type: typeof v === 'number' ? Number : String })),
  );
  return writeXlsxFile(data).toBuffer();
}

describe('parseWorkbook', () => {
  const headers = [...REQUIRED_HEADERS];

  it('parses data rows and skips fully empty rows', async () => {
    const buf = await xlsxBuffer([
      headers,
      ['Acme', 'Engineer', 'Remote', '$80,000 - $120,000', '2020-01-01', 'Applied', 'https://a.com/1'],
      [null, null, null, null, null, null, null],
      ['Beta', 'Analyst', 'N/A', 'N/A', '2020-02-01', '', 'N/A'],
    ]);
    const rows = await parseWorkbook(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0].values?.company_name).toBe('Acme');
    expect(rows[1].values?.status).toBe('N/A');
    expect(rows[1].index).toBe(4);
  });

  it('throws when a required column is missing', async () => {
    const buf = await xlsxBuffer([
      ['Business', 'Job Title', 'Location', 'Salary', 'Application Date', 'Status'],
      ['Acme', 'Engineer', 'Remote', 'N/A', '2020-01-01', 'Applied'],
    ]);
    await expect(parseWorkbook(buf)).rejects.toThrow(/Link/i);
  });
});
