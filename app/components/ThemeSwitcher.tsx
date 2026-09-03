'use client';

import { useEffect, useState } from 'react';

const themes = [
  { name: 'Agriculture', class: 'theme-agriculture' },
  { name: 'Océan', class: 'theme-ocean' },
  { name: 'Savane', class: 'theme-savane' },
];

const applyTheme = (themeClass: string) => {
  // Remove all theme classes first
  themes.forEach(t => document.documentElement.classList.remove(t.class));
  // Apply the selected one (unless it's agriculture which is the default root)
  if (themeClass !== 'theme-agriculture') {
    document.documentElement.classList.add(themeClass);
  }
};

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState('theme-agriculture');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'theme-agriculture';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
    setMounted(true);
  }, []);

  const changeTheme = (themeClass: string) => {
    setCurrentTheme(themeClass);
    localStorage.setItem('app-theme', themeClass);
    applyTheme(themeClass);
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      {themes.map((theme) => (
        <button
          key={theme.name}
          onClick={() => changeTheme(theme.class)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
            currentTheme === theme.class
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-surface text-foreground-muted border-surface-border hover:text-foreground hover:bg-black/5'
          }`}
        >
          {theme.name}
        </button>
      ))}
    </div>
  );
}
