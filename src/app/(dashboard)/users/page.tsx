'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import FormInput from '@/components/common/FormInput'
import FormSelect from '@/components/common/FormSelect'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import StatusBadge from '@/components/common/StatusBadge'
import { useUsers, useCreateUser, useUpdateUser, type User } from '@/hooks/useUsers'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/common/Button'
import { Plus, Pencil, Key } from '@phosphor-icons/react'

export default function UsersPage() {
  const toast = useToast()
  const [activeFilter, setActiveFilter] = useState<string>('true')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [showForm, setShowForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'user',
  })

  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [userToToggle, setUserToToggle] = useState<User | null>(null)

  const { data, isLoading } = useUsers({
    search: searchQuery || undefined,
    isActive: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
  })
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  useEffect(() => {
    if (selectedUser) {
      setFormData({
        fullName: selectedUser.fullName || '',
        email: selectedUser.email || '',
        password: '',
        role: selectedUser.role || 'user',
      })
    } else {
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'user',
      })
    }
  }, [selectedUser])

  const handleCreate = () => {
    setSelectedUser(null)
    setShowForm(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setShowForm(true)
  }

  const handleToggleStatus = (user: User) => {
    if (user.isActive) {
      setUserToToggle(user)
      setShowDeactivateConfirm(true)
    } else {
      activateUser(user)
    }
  }

  const activateUser = async (user: User) => {
    try {
      await updateUser.mutateAsync({ id: user.id, data: { isActive: true } })
      toast.success('User activated successfully!')
    } catch (error: any) {
      const errorMessage = error?.message || 'Error updating status. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!userToToggle) return
    try {
      await updateUser.mutateAsync({ id: userToToggle.id, data: { isActive: false } })
      toast.success('User deactivated successfully!')
    } catch (error: any) {
      const errorMessage = error?.message || 'Error updating status. Please try again.'
      toast.error(errorMessage)
    } finally {
      setShowDeactivateConfirm(false)
      setUserToToggle(null)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (selectedUser) {
        const updateData: any = {
          fullName: formData.fullName,
          role: formData.role,
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        await updateUser.mutateAsync({ id: selectedUser.id, data: updateData })
        toast.success('User updated successfully!')
      } else {
        await createUser.mutateAsync({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        })
        toast.success('User created successfully!')
      }
      setShowForm(false)
      setSelectedUser(null)
    } catch (error: any) {
      const errorMessage = error?.message || 'Error saving user. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleResetPassword = (user: User) => {
    setResetUser(user)
    setNewPassword('')
    setShowResetPassword(true)
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUser) return
    try {
      await updateUser.mutateAsync({ id: resetUser.id, data: { password: newPassword } })
      toast.success('Password reset successfully!')
      setShowResetPassword(false)
      setResetUser(null)
      setNewPassword('')
    } catch (error: any) {
      const errorMessage = error?.message || 'Error resetting password. Please try again.'
      toast.error(errorMessage)
    }
  }

  const users = data?.users || []

  const columns = [
    {
      key: 'fullName',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => <StatusBadge status={user.role} size="sm" />,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (user: User) => (
        <StatusBadge status={user.isActive ? 'active' : 'inactive'} size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(user)}
            className="px-2 py-1 text-xs bg-wash text-accent-ink rounded-xl hover:opacity-80"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => handleToggleStatus(user)}
            className={`px-2 py-1 text-xs rounded-xl hover:opacity-80 ${
              user.isActive
                ? 'bg-warn-bg text-warn-ink'
                : 'bg-ok-bg text-ok-ink'
            }`}
            title={user.isActive ? 'Deactivate' : 'Activate'}
          >
            {user.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => handleResetPassword(user)}
            className="px-2 py-1 text-xs bg-wash text-ink-60 rounded-xl hover:opacity-80"
            title="Reset password"
          >
            <Key size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Users</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Manage user accounts and access</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={14} /> Add User
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        <div className="mb-4 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
          />
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-4 py-2 border border-line rounded-xl"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <DataTable
          data={users}
          columns={columns}
          loading={isLoading}
          emptyMessage="No users found"
        />
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setSelectedUser(null)
        }}
        title={selectedUser ? 'Edit User' : 'Add User'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <FormInput
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
            required
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            required
            disabled={!!selectedUser}
          />
          <FormInput
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            required={!selectedUser}
            helperText={selectedUser ? 'Leave blank to keep the current password' : 'At least 6 characters'}
          />
          <FormSelect
            label="Role"
            name="role"
            value={formData.role}
            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                setSelectedUser(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createUser.isPending || updateUser.isPending}
            >
              {createUser.isPending || updateUser.isPending
                ? (selectedUser ? 'Updating...' : 'Creating...')
                : (selectedUser ? 'Update User' : 'Create User')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showResetPassword}
        onClose={() => {
          setShowResetPassword(false)
          setResetUser(null)
          setNewPassword('')
        }}
        title="Reset Password"
        size="sm"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <p className="text-sm text-ink-60">
            Set a new password for {resetUser?.fullName}.
          </p>
          <FormInput
            label="New Password"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="At least 6 characters"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowResetPassword(false)
                setResetUser(null)
                setNewPassword('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? 'Saving...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeactivateConfirm}
        onClose={() => {
          setShowDeactivateConfirm(false)
          setUserToToggle(null)
        }}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate User"
        message="Are you sure you want to deactivate this user? They will no longer be able to sign in."
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
