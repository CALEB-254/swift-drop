import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const themeKeyForUser = (userId: string) => `swiftdrop-theme-${userId}`;

/** Restore the signed-in person's setting, including on a different device. */
export function ThemePreferenceSync() {
  const { user, loading } = useAuthContext();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setTheme('dark');
      return;
    }

    let active = true;
    const userId = user.id;
    const cached = localStorage.getItem(themeKeyForUser(userId));
    if (cached === 'light' || cached === 'dark') setTheme(cached);
    else setTheme('dark');

    supabase.from('user_preferences').select('theme').eq('user_id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (!active || error) return;
        // Do not overwrite a choice made while the account preference was loading.
        if (localStorage.getItem(themeKeyForUser(userId)) !== cached) return;
        const preference = data?.theme;
        if (preference === 'light' || preference === 'dark') {
          localStorage.setItem(themeKeyForUser(userId), preference);
          setTheme(preference);
        }
      });

    return () => { active = false; };
  }, [user?.id, loading, setTheme]);

  return null;
}