const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatUSD(n: number | null): string {
  return n === null ? 'N/A' : usd.format(n);
}

export function formatSalaryRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'N/A';
  if (min !== null && max === null) return `${usd.format(min)}+`;
  if (min === null && max !== null) return `Up to ${usd.format(max)}`;
  return `${usd.format(min as number)} – ${usd.format(max as number)}`;
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Month/day only, zero-padded, e.g. "01/05". Year is intentionally dropped. */
export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[2]}/${m[3]}`;
}
