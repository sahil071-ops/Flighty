import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const THEME_KEY = 'ff_theme';

interface ThemeContextValue {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'light') ?? 'dark';
  });

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'dark') {
      el.classList.add('dark');
      el.classList.remove('light');
    } else {
      el.classList.add('light');
      el.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Apply initial class synchronously before first paint
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) ?? 'dark';
    document.documentElement.classList.add(saved);
  }, []);

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
