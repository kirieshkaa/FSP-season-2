export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim())
}

export function validateEmail(v: string): string {
  if (!v.trim()) return 'Введите e-mail'
  return validEmail(v) ? '' : 'Введите корректный e-mail'
}

export function validateName(v: string): string {
  if (!v.trim()) return 'Введите имя'
  return v.trim().length >= 3 ? '' : 'Имя должно содержать минимум 3 символа'
}

export function validatePassword(v: string): string {
  if (!v) return 'Введите пароль'
  return v.length >= 8 ? '' : 'Пароль должен содержать минимум 8 символов'
}

export function validateConfirm(v: string, password: string): string {
  if (!v) return 'Подтвердите пароль'
  return v === password ? '' : 'Пароли не совпадают'
}