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

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
