export type ThemeKey = 'ozon' | 'yandex' | 'wildberries'

export interface Theme {
  cls: string
  name: string
  icon: string
  gradient: string
}

export const THEMES: Record<ThemeKey, Theme> = {
  ozon: {
    cls: 'theme-ozon',
    name: 'Ozon',
    icon: '/assets/ozon.png',
    gradient: 'linear-gradient(120deg, #061b4b 0%, #0057e0 30%, #0095ff 55%, #7b3bff 75%, #ff2f6d 100%)'
  },
  yandex: {
    cls: 'theme-yandex',
    name: 'Yandex Market',
    icon: '/assets/yandex.png',
    gradient: 'linear-gradient(120deg, #141309 0%, #d4a800 28%, #ffcc00 48%, #ff9a1f 68%, #fc3f1d 88%, #b3121c 100%)'
  },
  wildberries: {
    cls: 'theme-wildberries',
    name: 'Wildberries',
    icon: '/assets/wb.png',
    gradient: 'linear-gradient(120deg, #150322 0%, #481173 30%, #8b25c4 55%, #cb11ab 78%, #ff4ecb 100%)'
  }
}

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[]

export const STORAGE_KEY = 'fsp-theme'

export function getInitialTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved in THEMES) return saved as ThemeKey
  } catch (e) {
    /* ignore */
  }
  return 'ozon'
}