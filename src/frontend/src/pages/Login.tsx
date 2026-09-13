import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { validateEmail } from '../validation'
import { IconBox } from '../components/ui/icons.jsx'

interface LocationState {
  registered?: boolean
  message?: string
}

export default function Login(): ReactElement {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState

  const emailErr = submitted || email !== '' ? validateEmail(email) : ''
  const passErr = submitted || password !== '' ? (password ? '' : 'Введите пароль') : ''

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError('')
    setSubmitted(true)
    const emailE = validateEmail(email)
    const passE = password ? '' : 'Введите пароль'
    if (emailE || passE) return

    setBusy(true)
    try {
      const profile = await login({ email: email.trim(), password })
      navigate(profile.role === 'admin' ? '/admin' : '/products', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="brand-block"><IconBox />Упаковка заказов</div>

      <h1 className="auth-title">Вход</h1>
      <p className="auth-subtitle">Рабочее место упаковщика</p>

      {state.registered && (
        <p className="auth-hint">{state.message ?? 'Регистрация успешна. Дождитесь одобрения администратора.'}</p>
      )}

      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="field">
          <div className={`input-wrap${emailErr ? ' has-error' : ''}`}>
            <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12v8H2z" stroke="currentColor" strokeWidth="1.4" />
              <path d="m2 5 6 4.5L14 5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <input
              id="email"
              name="email"
              type="email"
              placeholder=" "
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="field-label" htmlFor="email">Почта</label>
          </div>
          {emailErr && <p className="field-error">{emailErr}</p>}
        </div>

        <div className="field">
          <div className={`input-wrap${passErr ? ' has-error' : ''}`}>
            <svg className="input-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <input
              id="password"
              name="password"
              type={showPass ? 'text' : 'password'}
              placeholder=" "
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="field-label" htmlFor="password">Пароль</label>
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
          {passErr && <p className="field-error">{passErr}</p>}
        </div>

        {error && <p className="field-error">{error}</p>}

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <p className="auth-hint">
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
    </>
  )
}