import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme !== 'light';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-24 right-4 z-40 h-11 w-11 rounded-full border-border bg-card shadow-lg md:bottom-6 md:right-6"
          aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
          onClick={() => setTheme(dark ? 'light' : 'dark')}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
    </Tooltip>
  );
}