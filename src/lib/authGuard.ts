import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side attempt guard for authentication actions.
 * The auth-guard edge function records the attempt and enforces cooldowns;
 * a "Too many attempts" error is thrown when the caller is rate limited.
 * Infrastructure errors fail open so the app never locks everyone out.
 */
export async function authGuard(
  action: 'login' | 'signup' | 'reset',
  identifier: string,
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-guard', {
      body: { action, identifier },
    });
    if (!error && data && data.allowed === false) {
      const mins = Math.max(1, Math.ceil(((data.retry_after ?? 60) as number) / 60));
      throw new Error(
        `Too many attempts. Please try again in about ${mins} minute${mins === 1 ? '' : 's'}.`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Too many attempts')) throw e;
    // Fail open: the guard must not lock users out when unreachable.
  }
}
