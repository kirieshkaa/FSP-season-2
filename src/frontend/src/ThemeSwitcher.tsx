import type { ReactElement } from 'react'
import type { ThemeKey } from './themes.js'
import { THEMES, THEME_KEYS } from './themes.js'

interface Props {
  current: ThemeKey
  onChange: (key: ThemeKey) => void
}

export default function ThemeSwitcher({ current, onChange }: Props): ReactElement {
  return (
    <div className="theme-switcher" role="group" aria-label="Тема маркетплейса">
      {THEME_KEYS.map((key) => (
        <button
          key={key}
          className={`theme-btn${current === key ? ' active' : ''}`}
          data-theme={key}
          title={THEMES[key].name}
          onClick={() => onChange(key)}
        >
          <img src={THEMES[key].icon} alt={THEMES[key].name} />
        </button>
      ))}
    </div>
  )
}