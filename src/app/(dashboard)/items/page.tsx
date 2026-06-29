'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ItemsList from '@/components/items/ItemsList'
import ItemForm from '@/components/items/ItemForm'
import BulkUpload from '@/components/items/BulkUpload'
import Modal from '@/components/common/Modal'
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/useItems'
import { useToast } from '@/contexts/ToastContext'
import { apiClient } from '@/lib/api-client'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import type { Item } from '@/types'
import { Button } from '@/components/common/Button'
import { Plus, Upload } from '@phosphor-icons/react'

export default function ItemsPage() {
  const router = useRouter()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<number | null>(null)

  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()

  const handleCreate = () => {
    setSelectedItem(null)
    setShowForm(true)
  }

  const handleEdit = async (item: Item) => {
    try {
      const data = await apiClient.get<{ item: Item }>(`/api/items/${item.id}`)
      setSelectedItem(data.item)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error loading item:', error)
      const errorMessage = error?.message || 'Failed to load item details'
      toast.error(errorMessage)
    }
  }

  const handleDelete = (itemId: number) => {
    setItemToDelete(itemId)
    setShowDeleteConfirm(true)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedItem) {
        await updateItem.mutateAsync({ id: selectedItem.id, data })
        toast.success('Item updated successfully!')
      } else {
        await createItem.mutateAsync(data)
        toast.success('Item created successfully!')
      }
      setShowForm(false)
      setSelectedItem(null)
    } catch (error: any) {
      console.error('Error saving item:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error saving item. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleToggleStatus = async (item: Item) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        data: { ...item, isActive: !item.isActive },
      })
      toast.success(`Item ${item.isActive ? 'deactivated' : 'activated'} successfully!`)
    } catch (error: any) {
      console.error('Error toggling status:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Error updating status. Please try again.'
      toast.error(errorMessage)
    }
  }

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteItem.mutateAsync(itemToDelete)
        setShowDeleteConfirm(false)
        setItemToDelete(null)
        toast.success('Item deleted successfully!')
      } catch (error: any) {
        console.error('Error deleting item:', error)
        const errorMessage = error?.response?.data?.error || error?.message || 'Error deleting item. Please try again.'
        toast.error(errorMessage)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-medium text-4xl">Items Management</h1>
          <div className="h-[3px] w-16 bg-accent mt-3" />
          <p className="text-ink-60 mt-2">Manage raw materials, packaging, and finished goods</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowBulkUpload(true)}
            aria-label="Bulk upload items"
          >
            <Upload size={14} /> Bulk Upload
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            aria-label="Create new item"
          >
            <Plus size={14} /> New Item
          </Button>
        </div>
      </div>

      <ItemsList
        onItemClick={(item) => {
          router.push(`/items/${item.id}`)
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setSelectedItem(null)
        }}
        title={selectedItem ? 'Edit Item' : 'Create New Item'}
        size="lg"
      >
        <ItemForm
          item={selectedItem || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setSelectedItem(null)
          }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setItemToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <Modal
        isOpen={showBulkUpload}
        onClose={() => {
          setShowBulkUpload(false)
        }}
        title="Bulk Upload Items"
        size="lg"
      >
        <BulkUpload
          onSuccess={() => {
            setShowBulkUpload(false)
          }}
          onCancel={() => {
            setShowBulkUpload(false)
          }}
        />
      </Modal>
    </div>
  )
}
