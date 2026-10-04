import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { themeKeyForUser } from '@/components/ThemePreferenceSync';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthContext();
  const choose = async (nextTheme: 'light' | 'dark' | 'system') => {
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
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-card text-primary" aria-label={`Appearance: ${theme || 'dark'}`}>
              {theme === 'system' ? <Monitor /> : theme === 'light' ? <Sun /> : <Moon />}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="left">Appearance</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => choose('light')}><Sun className="mr-2 h-4 w-4" /> Light {theme === 'light' ? '✓' : ''}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => choose('dark')}><Moon className="mr-2 h-4 w-4" /> Dark {theme === 'dark' ? '✓' : ''}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => choose('system')}><Monitor className="mr-2 h-4 w-4" /> Device {theme === 'system' ? '✓' : ''}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}