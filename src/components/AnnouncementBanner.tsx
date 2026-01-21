import { useState } from 'react';
import { X, Megaphone } from 'lucide-react';

interface AnnouncementBannerProps {
  title: string;
  message: string;
}

export function AnnouncementBanner({ title, message }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-primary text-primary-foreground p-4 relative">
      <div className="flex items-start gap-3 pr-8">
        <Megaphone className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-sm opacity-90">{message}</p>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 p-1 hover:bg-primary-foreground/10 rounded"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
