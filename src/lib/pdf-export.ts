import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportToPDF(
  title: string,
  data: any[],
  columns: string[],
  filename: string,
  headers?: string[]
) {
  try {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(16)
    doc.text(title, 14, 20)
    
    // Add date
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)
    doc.setTextColor(0, 0, 0)
    
    // Prepare table data
    const tableHeaders = headers || columns
    const tableRows = data.map((row) => 
      columns.map((col) => {
        const value = row[col]
        if (value === null || value === undefined) return ''
        if (typeof value === 'number') return value.toLocaleString()
        return String(value)
      })
    )
    
    // Add table
    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    })
    
    // Save PDF
    doc.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export to PDF')
  }
}

export function exportInventoryReportPDF(data: any) {
  const rows = data.stockByWarehouse?.map((stock: any) => ({
    Warehouse: stock.warehouse.name,
    'Item Code': stock.item.code,
    'Item Name': stock.item.name,
    Quantity: stock.totalQuantity,
    Value: stock.totalValue,
  })) || []
  
  exportToPDF(
    'Inventory Report',
    rows,
    ['Warehouse', 'Item Code', 'Item Name', 'Quantity', 'Value'],
    `inventory-report-${new Date().toISOString().split('T')[0]}`
  )
}

export function exportSalesReportPDF(data: any) {
  const rows = data.bySKU?.map((item: any) => ({
    'SKU Code': item.sku.code,
    'SKU Name': item.sku.name,
    'Quantity': item.quantity,
    Revenue: item.revenue,
  })) || []
  
  exportToPDF(
    'Sales Report',
    rows,
    ['SKU Code', 'SKU Name', 'Quantity', 'Revenue'],
    `sales-report-${new Date().toISOString().split('T')[0]}`
  )
}

