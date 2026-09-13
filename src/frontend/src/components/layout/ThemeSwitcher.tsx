import type { ReactElement } from 'react'
import { THEMES, THEME_KEYS } from '../../constants/themes'
import { useTheme } from '../../context/ThemeContext'

export default function ThemeSwitcher(): ReactElement {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-switcher" role="group" aria-label="Тема маркетплейса">
      {THEME_KEYS.map((key) => (
        <button
          key={key}
          className={`theme-btn${theme === key ? ' active' : ''}`}
          data-theme={key}
          title={THEMES[key].name}
          onClick={() => setTheme(key)}
        >
          <img src={THEMES[key].icon} alt={THEMES[key].name} />
        </button>
      ))}
    </div>
  )
}
