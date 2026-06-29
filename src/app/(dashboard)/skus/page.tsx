'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SKUsList from '@/components/skus/SKUsList'
import Modal from '@/components/common/Modal'
import FormInput from '@/components/common/FormInput'
import FormSelect from '@/components/common/FormSelect'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { useSKUs, useCreateSKU, useUpdateSKU, useDeleteSKU, useUnits } from '@/hooks/useMasterData'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import type { SKU } from '@/types'
import { Button } from '@/components/common/Button'
import { Plus } from '@phosphor-icons/react'

export default function SKUsPage() {
  const router = useRouter()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [skuToDelete, setSkuToDelete] = useState<number | null>(null)
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unitId: '',
    standardCost: '',
    taxRate: '0',
    hasExpiry: false,
    isActive: true,
  })

  const { data, isLoading } = useSKUs()
  const { data: unitsData } = useUnits()
  const createSKU = useCreateSKU()
  const updateSKU = useUpdateSKU()
  const deleteSKU = useDeleteSKU()

  useEffect(() => {
    if (selectedSKU) {
      setFormData({
        code: selectedSKU.code || '',
        name: selectedSKU.name || '',
        description: selectedSKU.description || '',
        unitId: selectedSKU.unitId?.toString() || '',
        standardCost: selectedSKU.standardCost?.toString() || '',
        taxRate: selectedSKU.taxRate?.toString() || '0',
        hasExpiry: selectedSKU.hasExpiry || false,
        isActive: selectedSKU.isActive ?? true,
      })
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        unitId: '',
        standardCost: '',
        taxRate: '0',
        hasExpiry: false,
        isActive: true,
      })
    }
  }, [selectedSKU])

  const handleCreate = () => {
    setSelectedSKU(null)
    setShowForm(true)
  }

  const handleEdit = async (sku: SKU) => {
    try {
      const data = await apiClient.get<{ sku: SKU }>(`/api/skus/${sku.id}`)
      setSelectedSKU(data.sku)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error loading SKU:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load SKU details'
      toast.error(errorMessage)
    }
  }

  const handleDelete = (skuId: number) => {
    setSkuToDelete(skuId)
    setShowDeleteConfirm(true)
  }

  const handleToggleStatus = async (sku: SKU) => {
    try {
      await updateSKU.mutateAsync({
        id: sku.id,
        data: { ...sku, isActive: !sku.isActive },
      })
      toast.success(`SKU ${sku.isActive ? 'deactivated' : 'activated'} successfully!`)
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
        unitId: parseInt(formData.unitId),
        standardCost: parseFloat(formData.standardCost) || 0,
        taxRate: parseFloat(formData.taxRate) || 0,
        hasExpiry: formData.hasExpiry,
      }

      if (selectedSKU) {
        await updateSKU.mutateAsync({ id: selectedSKU.id, data: submitData })
        toast.success('SKU updated successfully!')
      } else {
        await createSKU.mutateAsync(submitData)
        toast.success('SKU created successfully!')
      }
      setShowForm(false)
      setSelectedSKU(null)
    } catch (error: any) {
      console.error('Error saving SKU:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error saving SKU. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleConfirmDelete = async () => {
    if (skuToDelete) {
      try {
        await deleteSKU.mutateAsync(skuToDelete)
        setShowDeleteConfirm(false)
        setSkuToDelete(null)
        toast.success('SKU deleted successfully!')
      } catch (error: any) {
        console.error('Error deleting SKU:', error)
        const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting SKU. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  const hasSKUs = data?.skus && data.skus.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">SKUs Management</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Manage finished goods SKUs</p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreate}
        >
          <Plus size={14} /> New SKU
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow p-6">
        {!isLoading && !hasSKUs ? (
          <EmptyState
            title="No SKUs found"
            description="Get started by creating your first SKU"
            action={{
              label: 'Create First SKU',
              onClick: handleCreate,
            }}
          />
        ) : (
          <SKUsList
            onSKUClick={(sku) => router.push(`/skus/${sku.id}`)}
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
          setSelectedSKU(null)
        }}
        title={selectedSKU ? 'Edit SKU' : 'Create New SKU'}
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
              disabled={!!selectedSKU}
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
            label="Description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          />

          <FormSelect
            label="Unit"
            name="unitId"
            value={formData.unitId}
            onChange={(e) => setFormData((prev) => ({ ...prev, unitId: e.target.value }))}
            options={unitsData?.units.map((u: any) => ({ value: u.id, label: `${u.code} - ${u.name}` })) || []}
            required
            placeholder="Select unit"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Standard Cost"
              name="standardCost"
              type="number"
              step="0.01"
              value={formData.standardCost}
              onChange={(e) => setFormData((prev) => ({ ...prev, standardCost: e.target.value }))}
              required
            />
            <FormInput
              label="Tax Rate (%)"
              name="taxRate"
              type="number"
              step="0.01"
              value={formData.taxRate}
              onChange={(e) => setFormData((prev) => ({ ...prev, taxRate: e.target.value }))}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasExpiry"
              checked={formData.hasExpiry}
              onChange={(e) => setFormData((prev) => ({ ...prev, hasExpiry: e.target.checked }))}
              className="h-4 w-4 accent-accent focus:ring-accent border-line rounded-xl"
            />
            <label htmlFor="hasExpiry" className="ml-2 block text-sm text-ink">
              Has Expiry Date
            </label>
          </div>

          {selectedSKU && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 accent-accent focus:ring-accent border-line rounded-xl"
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
                setSelectedSKU(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createSKU.isPending || updateSKU.isPending}
            >
              {createSKU.isPending || updateSKU.isPending
                ? (selectedSKU ? 'Updating...' : 'Creating...')
                : (selectedSKU ? 'Update SKU' : 'Create SKU')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setSkuToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete SKU"
        message="Are you sure you want to delete this SKU? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
