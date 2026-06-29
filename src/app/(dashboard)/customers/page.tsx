'use client'

import { useState, useEffect } from 'react'
import CustomersList from '@/components/customers/CustomersList'
import Modal from '@/components/common/Modal'
import FormInput from '@/components/common/FormInput'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import type { Customer } from '@/types'
import { Button } from '@/components/common/Button'
import { Plus } from '@phosphor-icons/react'

export default function CustomersPage() {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    taxRate: '0',
    isActive: true,
  })

  const { data, isLoading } = useCustomers()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

  useEffect(() => {
    if (selectedCustomer) {
      setFormData({
        code: selectedCustomer.code || '',
        name: selectedCustomer.name || '',
        contactPerson: selectedCustomer.contactPerson || '',
        email: selectedCustomer.email || '',
        phone: selectedCustomer.phone || '',
        address: selectedCustomer.address || '',
        taxRate: selectedCustomer.taxRate?.toString() || '0',
        isActive: selectedCustomer.isActive ?? true,
      })
    } else {
      setFormData({
        code: '',
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        taxRate: '0',
        isActive: true,
      })
    }
  }, [selectedCustomer])

  const handleCreate = () => {
    setSelectedCustomer(null)
    setShowForm(true)
  }

  const handleEdit = async (customer: Customer) => {
    try {
      const data = await apiClient.get<{ customer: Customer }>(`/api/customers/${customer.id}`)
      setSelectedCustomer(data.customer)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error loading customer:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load customer details'
      toast.error(errorMessage)
    }
  }

  const handleDelete = (customerId: number) => {
    setCustomerToDelete(customerId)
    setShowDeleteConfirm(true)
  }

  const handleToggleStatus = async (customer: Customer) => {
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: { ...customer, isActive: !customer.isActive },
      })
      toast.success(`Customer ${customer.isActive ? 'deactivated' : 'activated'} successfully!`)
    } catch (error: any) {
      console.error('Error toggling status:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating status. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        taxRate: parseFloat(formData.taxRate) || 0,
      }

      if (selectedCustomer) {
        await updateCustomer.mutateAsync({ id: selectedCustomer.id, data: submitData })
        toast.success('Customer updated successfully!')
      } else {
        await createCustomer.mutateAsync(submitData)
        toast.success('Customer created successfully!')
      }
      setShowForm(false)
      setSelectedCustomer(null)
    } catch (error: any) {
      console.error('Error saving customer:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error saving customer. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      try {
        await deleteCustomer.mutateAsync(customerToDelete)
        setShowDeleteConfirm(false)
        setCustomerToDelete(null)
        toast.success('Customer deleted successfully!')
      } catch (error: any) {
        console.error('Error deleting customer:', error)
        const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting customer. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  const hasCustomers = data?.customers && data.customers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Customers</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Manage customer information</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={14} /> New Customer
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        {!isLoading && !hasCustomers ? (
          <EmptyState
            title="No customers found"
            description="Get started by creating your first customer"
            action={{
              label: 'Create First Customer',
              onClick: handleCreate,
            }}
          />
        ) : (
          <CustomersList
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setSelectedCustomer(null)
        }}
        title={selectedCustomer ? 'Edit Customer' : 'Create New Customer'}
        size="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Code"
              name="code"
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
              required
              disabled={!!selectedCustomer}
            />
            <FormInput
              label="Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <FormInput
              label="Tax Rate (%)"
              name="taxRate"
              type="number"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: e.target.value }))}
              required
            />
          </div>

          <FormInput
            label="Address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
          />

          {selectedCustomer && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 accent-accent focus:ring-accent border-line rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-ink">
                Active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false)
                setSelectedCustomer(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createCustomer.isPending || updateCustomer.isPending}
            >
              {createCustomer.isPending || updateCustomer.isPending
                ? (selectedCustomer ? 'Updating...' : 'Creating...')
                : (selectedCustomer ? 'Update Customer' : 'Create Customer')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setCustomerToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
