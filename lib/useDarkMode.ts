'use client';

import { useEffect, useState } from 'react';

/** Tracks whether the `dark` class is present on <html>, so client components (e.g. chart libraries that don't accept Tailwind classes) can pick theme-aware colors. */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
