import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { animate } from 'animejs';

import {
  getInitialTheme,
  STORAGE_KEY,
  THEMES,
  THEME_KEYS,
  type ThemeKey,
} from '../constants/themes';

interface ThemeContextValue {
  theme: ThemeKey;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(getInitialTheme);
  const firstRunRef = useRef(true);

  useEffect(() => {
    const config = THEMES[theme];
    const oldGradient = getComputedStyle(document.body).backgroundImage;
    document.body.classList.remove(...THEME_KEYS.map((k) => THEMES[k].cls));
    document.body.classList.add(config.cls);
    document.body.style.setProperty("--gradient-bg", config.gradient);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    document.querySelectorAll(".theme-bg-old").forEach((el) => el.remove());
    const veil = document.createElement("div");
    veil.className = "theme-bg-old";
    veil.style.cssText = `position: fixed; inset: 0; z-index: -1; pointer-events: none; background: ${oldGradient};`;
    document.body.appendChild(veil);
    animate(veil, { opacity: [1, 0], duration: 600, ease: "outCubic" }).then(() => veil.remove());
  }, [theme]);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeState(key);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
