'use client'

import { useState, useEffect } from 'react'
import FormInput from '@/components/common/FormInput'
import FormSelect from '@/components/common/FormSelect'
import { useUnits } from '@/hooks/useMasterData'
import type { Item, ItemFormData, Unit } from '@/types'
import { Button } from '@/components/common/Button'

interface ItemFormProps {
  item?: Item
  onSubmit: (data: Partial<Item>) => void
  onCancel: () => void
}

export default function ItemForm({ item, onSubmit, onCancel }: ItemFormProps) {
  const { data: unitsData, isLoading: unitsLoading } = useUnits()
  const units = unitsData?.units || []

  const [formData, setFormData] = useState<ItemFormData>({
    code: item?.code || '',
    name: item?.name || '',
    description: item?.description || '',
    category: item?.category || 'raw_material',
    baseUnitId: item?.baseUnitId ? String(item.baseUnitId) : '',
    preferredUnitId: item?.preferredUnitId ? String(item.preferredUnitId) : '',
    standardCost: item?.standardCost || 0,
    moq: item?.moq ? String(item.moq) : '',
    minStockQuantity: item?.minStockQuantity ? String(item.minStockQuantity) : '',
    taxRate: item?.taxRate || 0,
    hasExpiry: item?.hasExpiry || false,
  })

  // Update form data when item prop changes
  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        category: item.category || 'raw_material',
        baseUnitId: item.baseUnitId ? String(item.baseUnitId) : item.baseUnit?.id ? String(item.baseUnit.id) : '',
        preferredUnitId: item.preferredUnitId ? String(item.preferredUnitId) : item.preferredUnit?.id ? String(item.preferredUnit.id) : '',
        standardCost: item.standardCost || 0,
        moq: item.moq ? String(item.moq) : '',
        minStockQuantity: item.minStockQuantity ? String(item.minStockQuantity) : '',
        taxRate: item.taxRate || 0,
        hasExpiry: item.hasExpiry || false,
      })
    } else {
      // Reset form for new item
      setFormData({
        code: '',
        name: '',
        description: '',
        category: 'raw_material',
        baseUnitId: '',
        preferredUnitId: '',
        standardCost: 0,
        moq: '',
        minStockQuantity: '',
        taxRate: 0,
        hasExpiry: false,
      })
    }
  }, [item])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number' ? parseFloat(value) || 0 : type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      code: formData.code || undefined, // Let API auto-generate if empty
      baseUnitId: parseInt(formData.baseUnitId as string),
      preferredUnitId: formData.preferredUnitId ? parseInt(formData.preferredUnitId as string) : null,
      moq: formData.moq ? parseFloat(formData.moq as string) : null,
      minStockQuantity: formData.minStockQuantity ? parseFloat(formData.minStockQuantity as string) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Code"
          name="code"
          value={formData.code}
          onChange={handleChange}
          disabled={!!item}
          placeholder={item ? formData.code : "Leave blank for auto-generation"}
          helperText={!item ? "Leave blank to auto-generate (e.g., ITM-0001)" : "Code cannot be changed"}
        />
        <FormInput
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <FormInput
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={[
            { value: 'raw_material', label: 'Raw Material' },
            { value: 'packaging', label: 'Packaging' },
            { value: 'finished_good', label: 'Finished Good' },
          ]}
          required
        />
        <FormSelect
          label="Base Unit"
          name="baseUnitId"
          value={formData.baseUnitId}
          onChange={handleChange}
          options={units.map((u: Unit) => ({ value: String(u.id), label: `${u.code} - ${u.name}` }))}
          required
          placeholder="Select base unit"
          disabled={unitsLoading}
        />
      </div>

      <FormSelect
        label="Preferred Unit (Optional)"
        name="preferredUnitId"
        value={formData.preferredUnitId}
        onChange={handleChange}
        options={units.map((u: Unit) => ({ value: String(u.id), label: `${u.code} - ${u.name}` }))}
        placeholder="Select preferred unit"
        disabled={unitsLoading}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Standard Cost"
          name="standardCost"
          type="number"
          value={formData.standardCost}
          onChange={handleChange}
          required
          step="0.01"
          min="0"
        />
        <FormInput
          label="Tax Rate (%)"
          name="taxRate"
          type="number"
          value={formData.taxRate}
          onChange={handleChange}
          step="0.01"
          min="0"
          max="100"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="MOQ (Minimum Order Quantity)"
          name="moq"
          type="number"
          value={formData.moq}
          onChange={handleChange}
          step="0.01"
          min="0"
          helperText="Minimum quantity required when ordering from supplier"
        />
        <FormInput
          label="Min Stock Quantity (Reorder Level)"
          name="minStockQuantity"
          type="number"
          value={formData.minStockQuantity}
          onChange={handleChange}
          step="0.01"
          min="0"
          helperText="Alert when stock falls below this level"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="hasExpiry"
          name="hasExpiry"
          checked={formData.hasExpiry}
          onChange={(e) => setFormData((prev) => ({ ...prev, hasExpiry: e.target.checked }))}
          className="h-4 w-4 accent-accent focus:ring-accent border-line rounded-xl"
        />
        <label htmlFor="hasExpiry" className="ml-2 block text-sm text-ink">
          Has Expiry Date
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
        >
          {item ? 'Update' : 'Create'} Item
        </Button>
      </div>
    </form>
  )
}
