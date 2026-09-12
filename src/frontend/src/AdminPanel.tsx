import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { NavId } from './data.js'
import { ADMIN_USERS, USER_STATUS_LABEL } from './data.js'
import type { AdminUser, UserStatus } from './data.js'
import {
  IconSearch, IconMore, IconCheck, IconX, IconBan, IconTrash,
  IconArrowUpDown, IconArrowUp, IconArrowDown, IconShield, IconUsers
} from './icons.jsx'
import DashboardShell from './DashboardShell.jsx'

interface Props {
  onLogout: () => void
  onNav: (id: NavId) => void
}

type SortField = 'username' | 'email' | 'role' | 'status' | 'created_at'
type SortOrder = 'asc' | 'desc'

const CURRENT_USER_ID = 'u001'

function StatusBadge({ status }: { status: UserStatus }): ReactElement {
  return <span className={`status-badge st-${status}`}>{USER_STATUS_LABEL[status]}</span>
}

export default function AdminPanel({ onLogout, onNav }: Props): ReactElement {
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [sortField, setSortField] = useState<SortField>('role')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!openMenu) return
    function onDocClick(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openMenu])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  function showToast(message: string): void {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  function runAction(userId: string, kind: 'approve' | 'reject' | 'block' | 'unblock' | 'delete'): void {
    setOpenMenu(null)
    setActionLoading(userId)
    window.setTimeout(() => {
      setUsers((prev) => {
        if (kind === 'delete') return prev.filter((u) => u.id !== userId)
        return prev.map((u) => {
          if (u.id !== userId) return u
          const status: UserStatus = kind === 'approve' || kind === 'unblock' ? 'approved'
            : kind === 'reject' ? 'rejected'
            : 'blocked'
          return { ...u, status }
        })
      })
      setActionLoading(null)
      const messages: Record<string, string> = {
        approve: 'Пользователь одобрен',
        reject: 'Пользователь отклонён',
        block: 'Пользователь заблокирован',
        unblock: 'Пользователь разблокирован',
        delete: 'Пользователь удалён'
      }
      showToast(messages[kind])
    }, 250)
  }

  function handleSort(field: SortField): void {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filteredUsers = useMemo<AdminUser[]>(() => {
    let result = [...users]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((u) =>
        u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter)
    }

    result.sort((a, b) => {
      let aVal: string | number = a[sortField]
      let bVal: string | number = b[sortField]
      if (sortField === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = String(bVal).toLowerCase()
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [users, searchQuery, statusFilter, sortField, sortOrder])

  function sortIcon(field: SortField): ReactElement {
    if (sortField !== field) return <IconArrowUpDown />
    return sortOrder === 'asc' ? <IconArrowUp /> : <IconArrowDown />
  }

  const stats = useMemo(() => ({
    total: users.length,
    approved: users.filter((u) => u.status === 'approved').length,
    pending: users.filter((u) => u.status === 'pending').length,
    blocked: users.filter((u) => u.status === 'blocked').length
  }), [users])

  return (
    <DashboardShell activeNav="admin" onNav={onNav} onLogout={onLogout} render={() => (
      <>
      <div className="content content-single">
        <section className="panel admin-panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Управление пользователями</h2>
              <p className="panel-sub">Одобрение, блокировка и доступ сотрудников склада</p>
            </div>
          </div>

          <div className="admin-stats">
            <div className="stat-chip">
              <span className="stat-num">{stats.total}</span>
              <span className="stat-label"><IconUsers /> Всего</span>
            </div>
            <div className="stat-chip ok">
              <span className="stat-num">{stats.approved}</span>
              <span className="stat-label">Одобрены</span>
            </div>
            <div className="stat-chip warn">
              <span className="stat-num">{stats.pending}</span>
              <span className="stat-label">Ожидают</span>
            </div>
            <div className="stat-chip danger">
              <span className="stat-num">{stats.blocked}</span>
              <span className="stat-label">Заблокированы</span>
            </div>
          </div>

          <div className="table-toolbar">
            <div className="search-box">
              <IconSearch />
              <input
                type="text"
                placeholder="Поиск по имени или email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | UserStatus)}
            >
              <option value="all">Все статусы</option>
              {(Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((s) => (
                <option key={s} value={s}>{USER_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          <div className="table-scroll">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th className="sortable" onClick={() => handleSort('username')}>
                    <span>Имя</span> {sortIcon('username')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('email')}>
                    <span>Email</span> {sortIcon('email')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('role')}>
                    <span>Роль</span> {sortIcon('role')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    <span>Статус</span> {sortIcon('status')}
                  </th>
                  <th className="sortable" onClick={() => handleSort('created_at')}>
                    <span>Дата регистрации</span> {sortIcon('created_at')}
                  </th>
                  <th className="ta-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const isProtected = user.role === 'admin' || user.id === CURRENT_USER_ID
                  const isBusy = actionLoading === user.id
                  return (
                    <tr key={user.id} className="admin-tr" style={{ animationDelay: `${index * 40}ms` }}>
                      <td className="cell-id">{user.id}</td>
                      <td className="cell-name">{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        {user.role === 'admin' ? (
                          <span className="role-admin"><IconShield /> Админ</span>
                        ) : (
                          <span className="role-user">Пользователь</span>
                        )}
                      </td>
                      <td><StatusBadge status={user.status} /></td>
                      <td className="cell-date">
                        {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="ta-right">
                        <div className="row-menu" ref={openMenu === user.id ? menuRef : null}>
                          <button
                            className="table-action"
                            title="Действия"
                            disabled={isProtected || isBusy}
                            onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                          >
                            <IconMore />
                          </button>
                          {openMenu === user.id && (
                            <div className="dropdown">
                              <button
                                className="dd-item"
                                disabled={user.status === 'approved' || isProtected}
                                onClick={() => runAction(user.id, 'approve')}
                              >
                                <IconCheck /> Одобрить
                              </button>
                              <button
                                className="dd-item"
                                disabled={user.status === 'rejected' || isProtected}
                                onClick={() => runAction(user.id, 'reject')}
                              >
                                <IconX /> Отклонить
                              </button>
                              <button
                                className="dd-item"
                                disabled={user.status === 'blocked' || isProtected}
                                onClick={() => runAction(user.id, 'block')}
                              >
                                <IconBan /> Заблокировать
                              </button>
                              <button
                                className="dd-item"
                                disabled={user.status !== 'blocked' || isProtected}
                                onClick={() => runAction(user.id, 'unblock')}
                              >
                                <IconCheck /> Разблокировать
                              </button>
                              <div className="dd-sep" />
                              <button
                                className="dd-item danger"
                                disabled={isProtected}
                                onClick={() => runAction(user.id, 'delete')}
                              >
                                <IconTrash /> Удалить
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="cell-empty">
                      {searchQuery || statusFilter !== 'all'
                        ? 'Нет пользователей, соответствующих критериям поиска'
                        : 'Нет пользователей'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

<div className="pagination">
            <span className="pg-info">
              Показано {filteredUsers.length} из {users.length} пользователей
            </span>
          </div>
        </section>
      </div>
      {toast && <div className="toast">{toast}</div>}
      </>
      )}
    />
  )
}