import { z } from 'zod';

export const PASSWORD_MIN = 8;

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email'));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`);

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type Credentials = z.infer<typeof credentialsSchema>;

/**
 * Parse an email + password + confirmation from a form. Returns either the
 * validated pair or a field-keyed error map (never throws).
 */
export function parseNewCredentials(formData: FormData):
  | { ok: true; data: Credentials }
  | { ok: false; fieldErrors: Record<string, string> } {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const parsed = credentialsSchema.safeParse({ email, password });
  const fieldErrors: Record<string, string> = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
  }
  if (!fieldErrors.password && password !== confirm) {
    fieldErrors.confirm = 'Passwords do not match';
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, data: { email: email.trim(), password } };
}
