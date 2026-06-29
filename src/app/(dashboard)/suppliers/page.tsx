'use client'

import { useState, useEffect } from 'react'
import SuppliersList from '@/components/suppliers/SuppliersList'
import Modal from '@/components/common/Modal'
import FormInput from '@/components/common/FormInput'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import type { Supplier } from '@/types'
import { Button } from '@/components/common/Button'
import { Plus } from '@phosphor-icons/react'

export default function SuppliersPage() {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
  })

  const { data, isLoading } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  useEffect(() => {
    if (selectedSupplier) {
      setFormData({
        code: selectedSupplier.code || '',
        name: selectedSupplier.name || '',
        contactPerson: selectedSupplier.contactPerson || '',
        email: selectedSupplier.email || '',
        phone: selectedSupplier.phone || '',
        address: selectedSupplier.address || '',
        isActive: selectedSupplier.isActive ?? true,
      })
    } else {
      setFormData({
        code: '',
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        isActive: true,
      })
    }
  }, [selectedSupplier])

  const handleCreate = () => {
    setSelectedSupplier(null)
    setShowForm(true)
  }

  const handleEdit = async (supplier: Supplier) => {
    try {
      const data = await apiClient.get<{ supplier: Supplier }>(`/api/suppliers/${supplier.id}`)
      setSelectedSupplier(data.supplier)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error loading supplier:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load supplier details'
      toast.error(errorMessage)
    }
  }

  const handleDelete = (supplierId: number) => {
    setSupplierToDelete(supplierId)
    setShowDeleteConfirm(true)
  }

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      await updateSupplier.mutateAsync({
        id: supplier.id,
        data: { ...supplier, isActive: !supplier.isActive },
      })
      toast.success(`Supplier ${supplier.isActive ? 'deactivated' : 'activated'} successfully!`)
    } catch (error: any) {
      console.error('Error toggling status:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating status. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (selectedSupplier) {
        await updateSupplier.mutateAsync({ id: selectedSupplier.id, data: formData })
        toast.success('Supplier updated successfully!')
      } else {
        await createSupplier.mutateAsync(formData)
        toast.success('Supplier created successfully!')
      }
      setShowForm(false)
      setSelectedSupplier(null)
    } catch (error: any) {
      console.error('Error saving supplier:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error saving supplier. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleConfirmDelete = async () => {
    if (supplierToDelete) {
      try {
        await deleteSupplier.mutateAsync(supplierToDelete)
        setShowDeleteConfirm(false)
        setSupplierToDelete(null)
        toast.success('Supplier deleted successfully!')
      } catch (error: any) {
        console.error('Error deleting supplier:', error)
        const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting supplier. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  const hasSuppliers = data?.suppliers && data.suppliers.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Suppliers</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Manage supplier information</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={14} /> New Supplier
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        {!isLoading && !hasSuppliers ? (
          <EmptyState
            title="No suppliers found"
            description="Get started by creating your first supplier"
            action={{
              label: 'Create First Supplier',
              onClick: handleCreate,
            }}
          />
        ) : (
          <SuppliersList
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
          setSelectedSupplier(null)
        }}
        title={selectedSupplier ? 'Edit Supplier' : 'Create New Supplier'}
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
              disabled={!!selectedSupplier}
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
          </div>

          <FormInput
            label="Address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
          />

          {selectedSupplier && (
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
                setSelectedSupplier(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createSupplier.isPending || updateSupplier.isPending}
            >
              {createSupplier.isPending || updateSupplier.isPending
                ? (selectedSupplier ? 'Updating...' : 'Creating...')
                : (selectedSupplier ? 'Update Supplier' : 'Create Supplier')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setSupplierToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
