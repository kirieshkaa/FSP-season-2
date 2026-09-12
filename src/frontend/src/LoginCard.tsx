import type { FormEvent, ReactElement } from 'react'
import { useState } from 'react'

interface Props {
  onSuccess: (email: string) => void
}

export default function LoginCard({ onSuccess }: Props): ReactElement {
  const [email, setEmail] = useState('ivan@ozon.ru')
  const [password, setPassword] = useState('123456')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    setError('')
    const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!mailOk) {
      setError('Введите корректный e-mail')
      return
    }
    if (!password) {
      setError('Введите пароль')
      return
    }
    onSuccess(email.trim())
  }

  return (
    <>
      <div className="brand-block">Упаковка заказов</div>

      <h1 className="auth-title">Вход</h1>
      <p className="auth-subtitle">Рабочее место упаковщика</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="email">Почта</label>
          <div className="input-wrap">
            <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12v8H2z" stroke="currentColor" strokeWidth="1.4" />
              <path d="m2 5 6 4.5L14 5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@gmail.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="password">Пароль</label>
          <div className="input-wrap">
            <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <input
              id="password"
              name="password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={`input-toggle${showPass ? ' shown' : ''}`}
              aria-label="Показать пароль"
              onClick={() => setShowPass((v) => !v)}
            >
              <svg className="eye eye-on" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <svg className="eye eye-off" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4S1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="m3.5 3 9 10" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
        </div>

        <p className="field-error">{error}</p>

        <button className="btn-primary" type="submit">Войти</button>
      </form>

      <p className="auth-hint">
        Демо: <b>ivan@ozon.ru</b> / <b>123456</b> — упаковщик, <b>admin@ozon.ru</b> / <b>123456</b> — админ
      </p>
    </>
  )
}