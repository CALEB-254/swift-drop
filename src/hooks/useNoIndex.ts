import { useEffect } from 'react';

/**
 * Marks a public-but-sensitive page (e.g. package tracking) as excluded from
 * search engines. Call at the top of the page component.
 */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}
