import { headers } from 'next/headers';

/**
 * Absolute origin of this deployment, used to build Supabase auth redirect URLs.
 * Prefers NEXT_PUBLIC_SITE_URL; otherwise derives it from the incoming request
 * headers (works across Vercel preview + production domains).
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
