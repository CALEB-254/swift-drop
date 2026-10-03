import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { themeKeyForUser } from '@/components/ThemePreferenceSync';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuthContext();
  const dark = resolvedTheme !== 'light';
  const toggle = async () => {
    const nextTheme = dark ? 'light' : 'dark';
    setTheme(nextTheme);
    if (!user) return;
    localStorage.setItem(themeKeyForUser(user.id), nextTheme);
    const { error } = await supabase.from('user_preferences').upsert(
      { user_id: user.id, theme: nextTheme, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
    if (error) console.warn('Could not sync appearance preference across devices');
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-border bg-card text-primary hover:bg-primary/10"
          aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
          onClick={toggle}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
    </Tooltip>
  );
}