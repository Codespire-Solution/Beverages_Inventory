'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/contexts/ToastContext'
import * as XLSX from 'xlsx'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { Download } from '@phosphor-icons/react'

interface BulkUploadProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function BulkUpload({ onSuccess, onCancel }: BulkUploadProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/items/template', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'items-upload-template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      setError(error.message || 'Failed to download template')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (
        selectedFile.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls')
      ) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Please select an Excel file (.xlsx or .xls)')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadResult(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          // Read Excel with first row as headers, and include empty cells
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: null,
            blankrows: true, // Include blank rows so we can process all rows
            raw: false // Convert values to strings/numbers
          })

          console.log('Raw Excel data (all rows):', jsonData)
          console.log('Total rows in Excel:', jsonData.length)

          // Map Excel columns to API format
          const items = jsonData
            .map((row: any, index: number) => {
              // Skip completely empty rows
              const rowValues = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '')
              if (rowValues.length === 0) {
                console.log(`Row ${index + 2} is completely empty - skipping`)
                return null
              }

              // Try to detect and skip example row
              const rowName = String(
                row['Name*'] || 
                row['name*'] || 
                row['Name'] || 
                row['name'] || 
                ''
              ).trim()
              
              if (rowName.toLowerCase().includes('example') || rowName === 'Example Item Name') {
                console.log(`Row ${index + 2} appears to be the example row (name: "${rowName}") - skipping`)
                return null
              }

              const item: any = {}
              const columnMap: { [key: string]: string } = {
                'Code (Optional - leave blank for auto-generation)': 'code',
                'Name*': 'name',
                Description: 'description',
                'Category*': 'category',
                'Base Unit ID*': 'baseUnitId',
                'Preferred Unit ID (Optional)': 'preferredUnitId',
                'Standard Cost': 'standardCost',
                'MOQ (Minimum Order Quantity)': 'moq',
                'Min Stock Quantity (Reorder Level)': 'minStockQuantity',
                'Tax Rate (%)': 'taxRate',
                'Has Expiry (true/false)': 'hasExpiry',
              }

              // Try to find columns (handle variations in column names)
              const rowKeys = Object.keys(row)
              console.log(`Row ${index + 2} (Excel row ${index + 2}):`, row)
              console.log(`Row ${index + 2} keys:`, rowKeys)

              Object.keys(columnMap).forEach((excelKey) => {
                const apiKey = columnMap[excelKey]
                // Try exact match first
                let value = row[excelKey]
                
                // If not found, try case-insensitive match with flexible whitespace
                if (value === undefined || value === null || value === '') {
                  const foundKey = rowKeys.find(
                    (key) => {
                      const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, ' ')
                      const normalizedExcelKey = excelKey.toLowerCase().trim().replace(/\s+/g, ' ')
                      return normalizedKey === normalizedExcelKey
                    }
                  )
                  if (foundKey) {
                    value = row[foundKey]
                    console.log(`Row ${index + 2}: Found "${excelKey}" as "${foundKey}"`)
                  }
                }

                // Handle the value based on type
                if (value !== undefined && value !== null) {
                  const stringValue = String(value).trim()
                  
                  // Only skip if it's truly empty (not 0)
                  if (stringValue !== '') {
                    if (apiKey === 'hasExpiry') {
                      item[apiKey] = stringValue.toLowerCase() === 'true'
                    } else if (
                      ['baseUnitId', 'preferredUnitId', 'standardCost', 'moq', 'minStockQuantity', 'taxRate'].includes(
                        apiKey
                      )
                    ) {
                      const numValue = parseFloat(stringValue)
                      if (!isNaN(numValue)) {
                        item[apiKey] = numValue
                      }
                    } else {
                      item[apiKey] = stringValue
                    }
                  }
                }
              })

              console.log(`Row ${index + 2} processed item:`, item)
              console.log(`Row ${index + 2} validation - name: "${item.name}", category: "${item.category}", baseUnitId: ${item.baseUnitId}`)

              // Only return item if it has required fields
              // Check name: must be non-empty string
              const hasName = item.name !== undefined && item.name !== null && String(item.name).trim() !== ''
              
              // Check category: must be non-empty string
              const hasCategory = item.category !== undefined && item.category !== null && String(item.category).trim() !== ''
              
              // Check baseUnitId: must be a valid number (including 0)
              let hasBaseUnitId = false
              if (item.baseUnitId !== undefined && item.baseUnitId !== null) {
                const baseUnitIdStr = String(item.baseUnitId).trim()
                if (baseUnitIdStr !== '') {
                  const baseUnitIdNum = parseFloat(baseUnitIdStr)
                  hasBaseUnitId = !isNaN(baseUnitIdNum) && baseUnitIdNum > 0
                }
              }
              
              if (hasName && hasCategory && hasBaseUnitId) {
                console.log(`✅ Row ${index + 2} is VALID - will be uploaded`)
                return item
              } else {
                const missingFields = []
                if (!hasName) missingFields.push('Name*')
                if (!hasCategory) missingFields.push('Category*')
                if (!hasBaseUnitId) missingFields.push('Base Unit ID*')
                
                console.warn(`❌ Row ${index + 2} is INVALID - missing: ${missingFields.join(', ')}`, {
                  hasName,
                  hasCategory,
                  hasBaseUnitId,
                  name: item.name,
                  category: item.category,
                  baseUnitId: item.baseUnitId,
                  fullItem: item,
                  rawRow: row
                })
                return null
              }
            })
            .filter((item: any) => item !== null) // Remove invalid rows

          const skippedRows = jsonData.length - items.length
          console.log(`Total valid items after processing: ${items.length} out of ${jsonData.length} rows`)
          console.log(`Skipped ${skippedRows} invalid/empty rows`)
          console.log('Processed items for upload:', items)

          if (items.length === 0) {
            throw new Error(`No valid items found in file. Processed ${jsonData.length} rows but none had all required fields (Name*, Category*, Base Unit ID*). Please check your Excel file and ensure all required fields are filled.`)
          }

          if (skippedRows > 0) {
            console.warn(`⚠️ Warning: ${skippedRows} row(s) were skipped. Check the console for details on why each row was rejected.`)
          }

          const result = await apiClient.post<{
            message: string
            results: { success: any[]; errors: any[] }
          }>('/api/items/bulk', { items })

          console.log('Bulk upload result:', result)

          setUploadResult(result.results)
          
          // Invalidate items query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['items'] })
          
          if (result.results.success.length > 0) {
            if (result.results.errors.length > 0) {
              toast.warning(
                `Successfully uploaded ${result.results.success.length} items. ${result.results.errors.length} item(s) had errors.`
              )
            } else {
              toast.success(`Successfully uploaded ${result.results.success.length} items!`)
            }
            // Wait a moment for the query to refresh, then close modal
            setTimeout(() => {
              onSuccess?.()
            }, 500)
          } else if (result.results.errors.length > 0) {
            toast.error(
              `Upload failed: ${result.results.errors.length} errors. Please check the error details below.`
            )
          } else {
            toast.error('No items were processed. Please check your file format and ensure all required fields are filled.')
          }
        } catch (error: any) {
          setError(error.message || 'Failed to process file')
        } finally {
          setIsUploading(false)
        }
      }

      reader.readAsArrayBuffer(file)
    } catch (error: any) {
      setError(error.message || 'Failed to upload file')
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-wash border border-line rounded-2xl p-4">
        <h3 className="font-semibold text-ink mb-2">Bulk Upload Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-ink-60">
          <li>Download the Excel template using the button below</li>
          <li>Fill in your item data (delete the example row)</li>
          <li>Upload the completed file</li>
          <li>Review the results</li>
        </ol>
      </div>

      <div className="flex gap-4">
        <Button
          variant="ghost"
          onClick={handleDownloadTemplate}
        >
          <Download size={14} /> Download Template
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Select Excel File (.xlsx)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-line rounded-xl focus:ring-2 focus:ring-accent"
          disabled={isUploading}
        />
      </div>

      {error && (
        <div className="bg-warn-bg border border-warn-ink rounded-2xl p-3">
          <p className="text-sm text-warn-ink">{error}</p>
        </div>
      )}

      {uploadResult && (
        <div className="space-y-2">
          <div className="bg-ok-bg border border-ok-ink rounded-2xl p-3">
            <p className="text-sm text-ok-ink">
              Successfully uploaded: {uploadResult.success.length} items
            </p>
          </div>
          {uploadResult.errors.length > 0 && (
            <div className="bg-warn-bg border border-warn-ink rounded-2xl p-3">
              <p className="text-sm text-warn-ink font-semibold mb-2">
                Errors: {uploadResult.errors.length} items
              </p>
              <div className="max-h-40 overflow-y-auto">
                {uploadResult.errors.map((err: any, idx: number) => (
                  <p key={idx} className="text-xs text-warn-ink">
                    Row {err.row}: {err.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isUploading && <LoadingSpinner text="Uploading items..." />}

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Items'}
        </Button>
      </div>
    </div>
  )
}

