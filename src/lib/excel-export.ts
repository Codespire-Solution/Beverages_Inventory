import * as XLSX from 'xlsx'

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    throw new Error('Failed to export to Excel')
  }
}

export function exportInventoryReport(data: any) {
  const rows = data.stockByWarehouse?.map((stock: any) => ({
    Warehouse: stock.warehouse.name,
    'Item Code': stock.item.code,
    'Item Name': stock.item.name,
    Category: stock.item.category.replace('_', ' '),
    'Total Quantity': stock.totalQuantity,
    'Total Value': stock.totalValue,
    'Batches Count': stock.batches?.length || 0,
  })) || []
  
  const filename = `inventory-report-${new Date().toISOString().split('T')[0]}`
  exportToExcel(rows, filename, 'Inventory Report')
}

export function exportSalesReport(data: any) {
  const rows = data.bySKU?.map((item: any) => ({
    'SKU Code': item.sku.code,
    'SKU Name': item.sku.name,
    'Quantity Sold': item.quantity,
    Revenue: item.revenue,
  })) || []
  
  const filename = `sales-report-${new Date().toISOString().split('T')[0]}`
  exportToExcel(rows, filename, 'Sales Report')
}

export function exportPurchaseReport(data: any) {
  const rows = data.byItem?.map((item: any) => ({
    'Item Code': item.item.code,
    'Item Name': item.item.name,
    'Quantity Purchased': item.quantity,
    'Total Amount': item.amount,
  })) || []
  
  const filename = `purchase-report-${new Date().toISOString().split('T')[0]}`
  exportToExcel(rows, filename, 'Purchase Report')
}

export function exportProductionReport(data: any) {
  const rows = data.bySKU?.map((item: any) => ({
    'SKU Code': item.sku.code,
    'SKU Name': item.sku.name,
    Batches: item.batches,
    'Target Quantity': item.targetQuantity,
    'Actual Quantity': item.actualQuantity,
    'Waste Quantity': item.wasteQuantity,
    'Yield %': item.yieldPercentage,
  })) || []
  
  const filename = `production-report-${new Date().toISOString().split('T')[0]}`
  exportToExcel(rows, filename, 'Production Report')
}

export function exportSalesSummary(data: any) {
  const rows = data.summary?.map((item: any) => ({
    Date: item.date,
    Orders: item.orders,
    Revenue: item.revenue,
    Quantity: item.quantity,
  })) || []
  
  const filename = `sales-summary-${new Date().toISOString().split('T')[0]}`
  exportToExcel(rows, filename, 'Sales Summary')
}

