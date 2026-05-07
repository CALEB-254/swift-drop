import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SupportTicketForm } from './SupportTicketForm';

export function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-20 left-4 z-50 rounded-full shadow-lg bg-primary/10 hover:bg-primary/20 text-foreground gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Help
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Help & Support</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Need help? Submit a new support ticket or view your existing tickets below.
          </p>
          <SupportTicketForm />
        </div>
      </SheetContent>
    </Sheet>
  );
}
