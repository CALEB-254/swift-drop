import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

/** A compact top bar on screens without their own shared navigation. */
export function ThemeNav() {
  const { pathname } = useLocation();
  if (pathname === '/admin' || pathname === '/sender' || pathname === '/sender/dashboard') return null;

  return (
    <nav aria-label="Appearance" className="flex h-14 items-center justify-between border-b border-border bg-card px-4 text-foreground">
      <Link to="/" className="font-display text-base font-bold">Swift<span className="text-primary">Drop</span></Link>
      <ThemeToggle />
    </nav>
  );
}