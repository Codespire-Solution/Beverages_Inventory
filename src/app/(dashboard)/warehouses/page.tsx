'use client'

import { useState, useEffect } from 'react'
import WarehousesList from '@/components/warehouses/WarehousesList'
import Modal from '@/components/common/Modal'
import FormInput from '@/components/common/FormInput'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import type { Warehouse } from '@/types'
import { Button } from '@/components/common/Button'
import { Plus } from '@phosphor-icons/react'

export default function WarehousesPage() {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<number | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    isActive: true,
  })

  const { data, isLoading } = useWarehouses()
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()
  const deleteWarehouse = useDeleteWarehouse()

  useEffect(() => {
    if (selectedWarehouse) {
      setFormData({
        code: selectedWarehouse.code || '',
        name: selectedWarehouse.name || '',
        address: selectedWarehouse.address || '',
        isActive: selectedWarehouse.isActive ?? true,
      })
    } else {
      setFormData({
        code: '',
        name: '',
        address: '',
        isActive: true,
      })
    }
  }, [selectedWarehouse])

  const handleCreate = () => {
    setSelectedWarehouse(null)
    setShowForm(true)
  }

  const handleEdit = async (warehouse: Warehouse) => {
    try {
      const data = await apiClient.get<{ warehouse: Warehouse }>(`/api/warehouses/${warehouse.id}`)
      setSelectedWarehouse(data.warehouse)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error loading warehouse:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load warehouse details'
      toast.error(errorMessage)
    }
  }

  const handleDelete = (warehouseId: number) => {
    setWarehouseToDelete(warehouseId)
    setShowDeleteConfirm(true)
  }

  const handleToggleStatus = async (warehouse: Warehouse) => {
    try {
      await updateWarehouse.mutateAsync({
        id: warehouse.id,
        data: { ...warehouse, isActive: !warehouse.isActive },
      })
      toast.success(`Warehouse ${warehouse.isActive ? 'deactivated' : 'activated'} successfully!`)
    } catch (error: any) {
      console.error('Error toggling status:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating status. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (selectedWarehouse) {
        await updateWarehouse.mutateAsync({ id: selectedWarehouse.id, data: formData })
        toast.success('Warehouse updated successfully!')
      } else {
        await createWarehouse.mutateAsync(formData)
        toast.success('Warehouse created successfully!')
      }
      setShowForm(false)
      setSelectedWarehouse(null)
    } catch (error: any) {
      console.error('Error saving warehouse:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error saving warehouse. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleConfirmDelete = async () => {
    if (warehouseToDelete) {
      try {
        // Check if warehouse has inventory
        const warehouseData = await apiClient.get<{ warehouse: any }>(`/api/warehouses/${warehouseToDelete}`)
        if (warehouseData.warehouse.inventoryBatches && warehouseData.warehouse.inventoryBatches.length > 0) {
          toast.error('Cannot delete warehouse with existing inventory. Please transfer or adjust inventory first.')
          setShowDeleteConfirm(false)
          setWarehouseToDelete(null)
          return
        }

        await deleteWarehouse.mutateAsync(warehouseToDelete)
        setShowDeleteConfirm(false)
        setWarehouseToDelete(null)
        toast.success('Warehouse deleted successfully!')
      } catch (error: any) {
        console.error('Error deleting warehouse:', error)
        const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting warehouse. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  const hasWarehouses = data?.warehouses && data.warehouses.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Warehouses</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Manage warehouse locations</p>
        </div>
        <Button variant="primary" onClick={handleCreate}>
          <Plus size={14} /> New Warehouse
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        {!isLoading && !hasWarehouses ? (
          <EmptyState
            title="No warehouses found"
            description="Get started by creating your first warehouse"
            action={{
              label: 'Create First Warehouse',
              onClick: handleCreate,
            }}
          />
        ) : (
          <WarehousesList
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
          setSelectedWarehouse(null)
        }}
        title={selectedWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}
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
              disabled={!!selectedWarehouse}
            />
            <FormInput
              label="Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <FormInput
            label="Address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
          />

          {selectedWarehouse && (
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
                setSelectedWarehouse(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createWarehouse.isPending || updateWarehouse.isPending}
            >
              {createWarehouse.isPending || updateWarehouse.isPending
                ? (selectedWarehouse ? 'Updating...' : 'Creating...')
                : (selectedWarehouse ? 'Update Warehouse' : 'Create Warehouse')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setWarehouseToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? This action cannot be undone. Make sure there is no inventory in this warehouse."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
