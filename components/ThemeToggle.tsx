'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { applyTheme, readStoredTheme, THEME_STORAGE_KEY, THEMES, type Theme } from '@/lib/theme';

const LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, readStoredTheme, () => 'system');

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const choose = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
    applyTheme(next);
    emit();
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex rounded-md border border-gray-300 p-0.5 text-xs dark:border-gray-700"
    >
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => choose(t)}
          className={
            theme === t
              ? 'rounded bg-blue-600 px-2 py-1 font-medium text-white'
              : 'rounded px-2 py-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }
        >
          {LABEL[t]}
        </button>
      ))}
    </div>
  );
}
