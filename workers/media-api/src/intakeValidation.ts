/** Public intake is contact-only. Never collect health history through this unauthenticated endpoint. */
export function validatePublicIntake(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('invalid_intake');
  const o = input as Record<string, unknown>;
  if (Object.keys(o).some(k => !['tenantSlug','token','name','phone','email'].includes(k))) throw new Error('invalid_intake');
  const tenantSlug = typeof o.tenantSlug === 'string' ? o.tenantSlug : '';
  const token = typeof o.token === 'string' ? o.token : '';
  const name = typeof o.name === 'string' ? o.name.trim().replace(/\s+/g, ' ') : '';
  const phone = typeof o.phone === 'string' ? o.phone.trim() : '';
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(tenantSlug)
    || !/^[a-zA-Z0-9_-]{43}$/.test(token)
    || name.length < 2 || name.length > 160
    || phone.length < 8 || phone.length > 24 || !/^[+() 0-9-]+$/.test(phone)
    || (email.length > 0 && (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))) {
      throw new Error('invalid_intake');
  }
  return { tenantSlug, token, name, phone, email };
}
export function createIntakeSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function intakeTokenHash(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map(n => n.toString(16).padStart(2,'0')).join('');
}
