'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import type { PublicRfpUser } from '@/lib/rfpUsers'

interface ResetPasswordState {
  username: string
  newPassword: string
  loading: boolean
  error: string
  success: boolean
}

export default function RFPAdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<PublicRfpUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [error, setError] = useState('')

  // New user form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Delete state
  const [deletingUser, setDeletingUser] = useState<string | null>(null)

  // Inline reset-password state keyed by username (null = collapsed)
  const [resetStates, setResetStates] = useState<Record<string, ResetPasswordState>>({})

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    setError('')
    try {
      const res = await fetch('/api/admin/rfp/users')
      if (res.status === 403) {
        router.push('/rfp/login?next=/rfp/admin')
        return
      }
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      setError('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }, [router])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      const res = await fetch('/api/admin/rfp/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setNewUsername('')
        setNewPassword('')
        setNewRole('user')
        fetchUsers()
      } else {
        setFormError(data.error ?? 'Failed to create user')
      }
    } catch {
      setFormError('An unexpected error occurred')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    setDeletingUser(username)
    try {
      const res = await fetch('/api/admin/rfp/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      if (res.ok) {
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to delete user')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setDeletingUser(null)
    }
  }

  const toggleResetRow = (username: string) => {
    setResetStates((prev) => {
      if (prev[username]) {
        const next = { ...prev }
        delete next[username]
        return next
      }
      return {
        ...prev,
        [username]: { username, newPassword: '', loading: false, error: '', success: false },
      }
    })
  }

  const handleResetPassword = async (username: string) => {
    const state = resetStates[username]
    if (!state) return
    setResetStates((prev) => ({ ...prev, [username]: { ...prev[username], loading: true, error: '', success: false } }))
    try {
      const res = await fetch('/api/admin/rfp/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword: state.newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setResetStates((prev) => ({
          ...prev,
          [username]: { ...prev[username], loading: false, success: true, newPassword: '' },
        }))
        setTimeout(() => toggleResetRow(username), 1500)
      } else {
        setResetStates((prev) => ({
          ...prev,
          [username]: { ...prev[username], loading: false, error: data.error ?? 'Failed to reset password' },
        }))
      }
    } catch {
      setResetStates((prev) => ({
        ...prev,
        [username]: { ...prev[username], loading: false, error: 'An unexpected error occurred' },
      }))
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/rfp/logout', { method: 'POST' })
    router.push('/rfp/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              RFP Assistant — User Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Admin panel</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/rfp')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Back to RFP
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-8">

        {/* Add user */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add user</h2>
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                disabled={formLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={formLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                disabled={formLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={formLoading || !newUsername.trim() || !newPassword.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {formLoading ? 'Adding…' : 'Add user'}
            </button>
          </form>
          {formError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {formError}
            </p>
          )}
        </section>

        {/* User list */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Users</h2>

          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {loadingUsers ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Username</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Role</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Created</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const reset = resetStates[u.username]
                    return (
                      <Fragment key={u.username}>
                        <tr
                          className="border-b border-gray-100 dark:border-gray-700/50"
                        >
                          <td className="py-3 pr-4 text-gray-900 dark:text-white font-medium">
                            {u.username}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                u.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                u.active
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                              }`}
                            >
                              {u.active ? 'active' : 'inactive'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => toggleResetRow(u.username)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm mr-3"
                            >
                              {reset ? 'Cancel' : 'Reset password'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              disabled={deletingUser === u.username}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm disabled:opacity-50"
                            >
                              {deletingUser === u.username ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </tr>

                        {reset && (
                          <tr key={`${u.username}-reset`} className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-700/30">
                            <td colSpan={5} className="px-2 py-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                  New password for <strong>{u.username}</strong>:
                                </span>
                                <input
                                  type="password"
                                  value={reset.newPassword}
                                  onChange={(e) =>
                                    setResetStates((prev) => ({
                                      ...prev,
                                      [u.username]: { ...prev[u.username], newPassword: e.target.value, error: '', success: false },
                                    }))
                                  }
                                  placeholder="New password"
                                  disabled={reset.loading}
                                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm w-48 disabled:opacity-50"
                                />
                                <button
                                  onClick={() => handleResetPassword(u.username)}
                                  disabled={reset.loading || !reset.newPassword.trim()}
                                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {reset.loading ? 'Saving…' : reset.success ? 'Saved!' : 'Save'}
                                </button>
                                {reset.error && (
                                  <span className="text-sm text-red-600 dark:text-red-400">{reset.error}</span>
                                )}
                                {reset.success && (
                                  <span className="text-sm text-emerald-600 dark:text-emerald-400">Password updated.</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
