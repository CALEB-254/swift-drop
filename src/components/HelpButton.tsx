import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HelpButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="fixed bottom-20 left-4 z-50 rounded-full shadow-lg bg-primary/10 hover:bg-primary/20 text-foreground gap-2"
    >
      <HelpCircle className="w-4 h-4" />
      Help
    </Button>
  );
}
