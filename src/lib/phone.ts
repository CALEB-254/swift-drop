export const PHONE_ERROR = 'Incorrect phone number. Use 10 digits starting with 07 or 01.';

/** Strict local Kenyan format: exactly 10 digits starting with 07 or 01. */
export function isValidLocalPhone(raw: string): boolean {
  return /^0[17]\d{8}$/.test((raw || '').trim());
}

/** Keeps only digits, max 10 — for controlled phone inputs. */
export function sanitizePhoneInput(raw: string): string {
  return (raw || '').replace(/\D/g, '').slice(0, 10);
}

/** +2547XXXXXXXX → 07XXXXXXXX for display/editing. */
export function toLocalPhone(raw: string | null | undefined): string {
  const d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('254') && d.length === 12) return '0' + d.slice(3);
  return d.slice(0, 10);
}

/** 07XXXXXXXX → +2547XXXXXXXX */
export function toIntlPhone(local: string): string {
  return '+254' + local.trim().slice(1);
}
