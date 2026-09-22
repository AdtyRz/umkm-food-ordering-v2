'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
export type Accent = 'orange' | 'pink' | 'green' | 'blue' | 'purple' | 'teal';

const ACCENTS: Accent[] = ['orange', 'pink', 'green', 'blue', 'purple', 'teal'];

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
  accent: Accent;
  setAccent: (a: Accent) => void;
}>({ theme: 'system', setTheme: () => {}, resolved: 'light', accent: 'orange', setAccent: () => {} });

function applyTheme(theme: Theme): 'light' | 'dark' {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', dark);
  return dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const [accent, setAccentState] = useState<Accent>('orange');

  useEffect(() => {
    const saved = (localStorage.getItem('umkm-theme') as Theme | null) ?? 'system';
    setThemeState(saved);
    setResolved(applyTheme(saved));

    // Aksen warna — script inline di layout sudah pasang atributnya
    // sebelum paint; di sini cukup sinkronkan state-nya.
    const savedAccent = localStorage.getItem('umkm-accent') as Accent | null;
    if (savedAccent && ACCENTS.includes(savedAccent)) setAccentState(savedAccent);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if ((localStorage.getItem('umkm-theme') as Theme | null) === 'system') {
        setResolved(applyTheme('system'));
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('umkm-theme', t);
    setResolved(applyTheme(t));
  };

  const setAccent = (a: Accent) => {
    setAccentState(a);
    localStorage.setItem('umkm-accent', a);
    document.documentElement.dataset.accent = a;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
