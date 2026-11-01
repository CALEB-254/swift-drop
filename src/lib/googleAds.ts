/**
 * Google Ads conversion tracking.
 *
 * To go live:
 * 1. In Google Ads create a Conversion action (Website) — e.g. "Sign up" and "Purchase".
 * 2. Copy the conversion ID (e.g. AW-123456789) into VITE_GADS_CONVERSION_ID
 *    (env var) or the fallback below, and each action's label into CONVERSION_LABELS.
 * Until a real ID and labels are set, every call is a harmless no-op.
 */

const ENV_CONVERSION_ID = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_GADS_CONVERSION_ID || '';

export const GADS_CONVERSION_ID = ENV_CONVERSION_ID;

/** Conversion action labels from Google Ads. Leave '' to disable that event. */
export const CONVERSION_LABELS = {
  sign_up: '', // e.g. 'abcDE12fGh3JKLMn4oP'
  create_delivery: '',
  purchase: '',
} as const;

export type AdConversionName = keyof typeof CONVERSION_LABELS;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initGoogleAdsTag(): void {
  if (initialized || !GADS_CONVERSION_ID) return;
  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GADS_CONVERSION_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GADS_CONVERSION_ID}`;
  document.head.appendChild(script);
}

/** Fire a Google Ads conversion. Safe to call even when tracking is not configured. */
export function trackAdConversion(
  name: AdConversionName,
  options?: { value?: number; currency?: string; transactionId?: string },
): void {
  const label = CONVERSION_LABELS[name];
  if (!GADS_CONVERSION_ID || !label || typeof window.gtag !== 'function') return;
  window.gtag('event', 'conversion', {
    send_to: `${GADS_CONVERSION_ID}/${label}`,
    ...(options?.value != null ? { value: options.value, currency: options.currency || 'KES' } : {}),
    ...(options?.transactionId ? { transaction_id: options.transactionId } : {}),
  });
}
