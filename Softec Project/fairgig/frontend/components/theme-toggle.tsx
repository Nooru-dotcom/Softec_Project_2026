'use client';

import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem('fairgig-theme');
  return value === 'dark' || value === 'light' ? value : null;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = getStoredTheme();
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
      return;
    }

    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  function switchTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('fairgig-theme', next);
  }

  return (
    <button
      type="button"
      onClick={switchTheme}
      className="theme-toggle fixed right-4 top-4 z-50 rounded-xl px-3 py-2 text-xs font-semibold tracking-wide"
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
    </button>
  );
}
