import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { validateConfirm, validateEmail, validatePassword } from '../validation'
import { IconUser, IconMail, IconLock, IconLogout } from '../components/ui/icons.jsx'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Администратор',
  worker: 'Упаковщик',
  user: 'Пользователь',
}

const STATUS_LABEL: Record<string, string> = {
  approved: 'Одобрен',
  pending: 'Ожидает подтверждения',
  rejected: 'Отклонён',
  blocked: 'Заблокирован',
}

export default function Profile(): ReactElement {
  const { user, changePassword, changeEmail, logout } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [passSubmitted, setPassSubmitted] = useState(false)
  const [mailSubmitted, setMailSubmitted] = useState(false)

  const oldErr = passSubmitted || oldPassword !== '' ? (oldPassword ? '' : 'Введите текущий пароль') : ''
  const newErr = passSubmitted || newPassword !== '' ? validatePassword(newPassword) : ''
  const confirmErr =
    passSubmitted || confirmPassword !== '' ? validateConfirm(confirmPassword, newPassword) : ''
  const mailErr = mailSubmitted || email !== '' ? validateEmail(email) : ''
  const mailPassErr =
    mailSubmitted || emailPassword !== '' ? (emailPassword ? '' : 'Введите пароль для подтверждения') : ''

  function flash(message: string): void {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  async function handlePassword(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError('')
    setPassSubmitted(true)
    const oE = oldPassword ? '' : 'Введите текущий пароль'
    const nE = validatePassword(newPassword)
    const cE = validateConfirm(confirmPassword, newPassword)
    if (oE || nE || cE) return
    setBusy(true)
    try {
      const message = await changePassword({ old_password: oldPassword, new_password: newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      flash(message || 'Пароль обновлён')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить пароль')
    } finally {
      setBusy(false)
    }
  }

  async function handleEmail(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError('')
    setMailSubmitted(true)
    const mE = validateEmail(email)
    const mPE = emailPassword ? '' : 'Введите пароль для подтверждения'
    if (mE || mPE) return
    setBusy(true)
    try {
      const message = await changeEmail({ email: email.trim(), password: emailPassword })
      setEmail('')
      setEmailPassword('')
      flash(message || 'Почта обновлена')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить почту')
    } finally {
      setBusy(false)
    }
  }

  async function handleLogout(): Promise<void> {
    await logout()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="content content-single">
      <div className="profile-stack">
        <section className="panel profile-panel">
          <div className="panel-head">
            <h2 className="panel-title profile-title">
              <IconUser />
              Информация о пользователе
            </h2>
            <button className="btn-secondary btn-sm" onClick={() => void handleLogout()}>
              <IconLogout />
              Выйти
            </button>
          </div>
          <div className="profile-info">
            <div className="profile-grid-3">
              <div>
                <span className="profile-field-label">Имя пользователя</span>
                <span className="profile-field-value">{user?.name ?? '—'}</span>
              </div>
              <div>
                <span className="profile-field-label">Роль</span>
                <span className="profile-field-value">{ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '—'}</span>
              </div>
              <div>
                <span className="profile-field-label">Статус</span>
                <span className="profile-field-value">{STATUS_LABEL[user?.status ?? ''] ?? user?.status ?? '—'}</span>
              </div>
            </div>
            <div className="profile-date">
              <span className="profile-field-label">Дата регистрации</span>
              <span className="profile-field-value">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
              </span>
            </div>
            <p className="profile-id" title={user?.id}>ID: {user?.id}</p>
          </div>
        </section>

        <section className="panel profile-panel">
          <div className="panel-head">
            <h2 className="panel-title profile-title">
              <IconMail />
              Изменить email
            </h2>
          </div>
          <form className="auth-form profile-form" onSubmit={(e) => void handleEmail(e)} noValidate>
            <div className="field">
              <div className="input-wrap">
                <IconMail className="input-icon" />
                <input id="current-email" type="email" value={user?.email_masked ?? ''} disabled />
                <label className="field-label" htmlFor="current-email">Текущий email</label>
              </div>
            </div>
            <div className="field">
              <div className={`input-wrap${mailErr ? ' has-error' : ''}`}>
                <IconMail className="input-icon" />
                <input
                  id="new-email"
                  type="email"
                  placeholder=" "
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label className="field-label" htmlFor="new-email">Новый email</label>
              </div>
              {mailErr && <p className="field-error">{mailErr}</p>}
            </div>
            <div className="field">
              <div className={`input-wrap${mailPassErr ? ' has-error' : ''}`}>
                <IconLock className="input-icon" />
                <input
                  id="email-password"
                  type="password"
                  placeholder=" "
                  autoComplete="current-password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
                <label className="field-label" htmlFor="email-password">Подтвердите паролем</label>
              </div>
              {mailPassErr && <p className="field-error">{mailPassErr}</p>}
            </div>
            {error && <p className="field-error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        </section>

        <section className="panel profile-panel">
          <div className="panel-head">
            <h2 className="panel-title profile-title">
              <IconLock />
              Изменить пароль
            </h2>
          </div>
          <form className="auth-form profile-form" onSubmit={(e) => void handlePassword(e)} noValidate>
            <div className="field">
              <div className={`input-wrap${oldErr ? ' has-error' : ''}`}>
                <IconLock className="input-icon" />
                <input
                  id="old-password"
                  type="password"
                  placeholder=" "
                  autoComplete="current-password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
                <label className="field-label" htmlFor="old-password">Текущий пароль</label>
              </div>
              {oldErr && <p className="field-error">{oldErr}</p>}
            </div>
            <div className="field">
              <div className={`input-wrap${newErr ? ' has-error' : ''}`}>
                <IconLock className="input-icon" />
                <input
                  id="new-password"
                  type="password"
                  placeholder=" "
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <label className="field-label" htmlFor="new-password">Новый пароль</label>
              </div>
              {newErr && <p className="field-error">{newErr}</p>}
            </div>
            <div className="field">
              <div className={`input-wrap${confirmErr ? ' has-error' : ''}`}>
                <IconLock className="input-icon" />
                <input
                  id="confirm-password"
                  type="password"
                  placeholder=" "
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <label className="field-label" htmlFor="confirm-password">Подтвердите пароль</label>
              </div>
              {confirmErr && <p className="field-error">{confirmErr}</p>}
            </div>
            {error && <p className="field-error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={busy}>
              {busy ? 'Сохранение…' : 'Изменить пароль'}
            </button>
          </form>
        </section>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}