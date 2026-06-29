# Beverage Inventory Management System
## Comprehensive End-to-End Test Cases

**Total Test Cases: 210**
**Coverage:** All modules, workflows, UI elements, edge cases, and error scenarios

---

## TEST ENVIRONMENT SETUP

### Pre-requisites
- Database initialized with seed data (`./setup.sh`)
- Application running on `http://localhost:3000`
- Test user credentials: `admin@beverage.com` / `admin123`
- Sample data available: Items, SKUs, Recipes, Warehouses, Suppliers, Customers

---

## MODULE 1: AUTHENTICATION & AUTHORIZATION (10 Test Cases)

### TC-AUTH-001: Valid Login
**Steps:**
1. Navigate to `/login`
2. Enter email: `admin@beverage.com`
3. Enter password: `admin123`
4. Click "Login" button
**Expected:** Redirect to `/dashboard`, token stored in localStorage

### TC-AUTH-002: Invalid Email Login
**Steps:**
1. Navigate to `/login`
2. Enter email: `invalid@test.com`
3. Enter password: `admin123`
4. Click "Login" button
**Expected:** Error message "Invalid credentials"

### TC-AUTH-003: Invalid Password Login
**Steps:**
1. Navigate to `/login`
2. Enter email: `admin@beverage.com`
3. Enter password: `wrongpassword`
4. Click "Login" button
**Expected:** Error message "Invalid credentials"

### TC-AUTH-004: Empty Fields Login
**Steps:**
1. Navigate to `/login`
2. Leave email and password empty
3. Click "Login" button
**Expected:** Validation errors shown for both fields

### TC-AUTH-005: Token Expiry Handling
**Steps:**
1. Login successfully
2. Manually delete token from localStorage
3. Try to access any dashboard page
**Expected:** Redirect to `/login`

### TC-AUTH-006: Logout Functionality
**Steps:**
1. Login successfully
2. Click "Logout" button in header
**Expected:** Token removed, redirect to `/login`

### TC-AUTH-007: Direct Access Without Login
**Steps:**
1. Clear localStorage
2. Navigate directly to `/dashboard`
**Expected:** Redirect to `/login`

### TC-AUTH-008: API Call Without Token
**Steps:**
1. Clear localStorage
2. Make API call to `/api/items`
**Expected:** 401 Unauthorized response

### TC-AUTH-009: Password Field Masking
**Steps:**
1. Navigate to `/login`
2. Type password in password field
**Expected:** Characters displayed as dots/asterisks

### TC-AUTH-010: Remember Me Functionality (if implemented)
**Steps:**
1. Login with "Remember Me" checked
2. Close browser and reopen
**Expected:** Still logged in

---

## MODULE 2: DASHBOARD (10 Test Cases)

### TC-DASH-001: Dashboard Page Load
**Steps:**
1. Login successfully
2. Navigate to `/dashboard`
**Expected:** Dashboard loads with all metric cards

### TC-DASH-002: Total Inventory Value Card
**Steps:**
1. Navigate to `/dashboard`
2. Check "Total Inventory Value" card
**Expected:** Shows calculated total value

### TC-DASH-003: Low Stock Alerts Card
**Steps:**
1. Navigate to `/dashboard`
2. Check "Low Stock Items" card
**Expected:** Shows count of items below min stock

### TC-DASH-004: Sales This Month Card
**Steps:**
1. Navigate to `/dashboard`
2. Check "Sales This Month" card
**Expected:** Shows current month sales total

### TC-DASH-005: Slow Moving Items Card
**Steps:**
1. Navigate to `/dashboard`
2. Check "Slow Moving Items" card
**Expected:** Shows items with low sales velocity

### TC-DASH-006: Cash Flow Summary
**Steps:**
1. Navigate to `/dashboard`
2. Check cash flow section
**Expected:** Shows purchases, sales, net cash flow

### TC-DASH-007: Top Selling SKUs Table
**Steps:**
1. Navigate to `/dashboard`
2. Scroll to "Top Selling SKUs" table
**Expected:** Shows top 10 SKUs by quantity sold

### TC-DASH-008: Dashboard Metrics Refresh
**Steps:**
1. Navigate to `/dashboard`
2. Create a new sales order
3. Return to dashboard
**Expected:** Metrics updated to reflect new order

### TC-DASH-009: Navigation from Dashboard
**Steps:**
1. Navigate to `/dashboard`
2. Click on "Low Stock Items" link
**Expected:** Navigate to inventory page with low stock filter

### TC-DASH-010: Dashboard Responsive Design
**Steps:**
1. Navigate to `/dashboard`
2. Resize browser to mobile width
**Expected:** Cards stack vertically, table scrolls horizontally

---

## MODULE 3: ITEMS MANAGEMENT (25 Test Cases)

### TC-ITEM-001: View Items List
**Steps:**
1. Navigate to `/items`
**Expected:** Table displays all items with columns: Code, Name, Category, Unit, Stock, Actions

### TC-ITEM-002: Create New Item - All Fields
**Steps:**
1. Navigate to `/items`
2. Click "New Item" button
3. Fill all fields:
   - Code: Leave blank (auto-generate)
   - Name: "Orange Juice Concentrate"
   - Description: "Fresh orange concentrate"
   - Category: "Raw Material"
   - Base Unit: "L"
   - Preferred Unit: "L"
   - Standard Cost: 50.00
   - MOQ: 100
   - Min Stock Quantity: 50
   - Tax Rate: 18
   - Has Expiry: Yes
4. Click "Create" button
**Expected:** Item created with code "ITM-XXXX", success toast shown, modal closes, list refreshes

### TC-ITEM-003: Create Item - Auto Code Generation
**Steps:**
1. Navigate to `/items`
2. Click "New Item"
3. Leave Code field blank
4. Fill required fields
5. Click "Create"
**Expected:** Code auto-generated in format "ITM-0001"

### TC-ITEM-004: Create Item - Manual Code
**Steps:**
1. Navigate to `/items`
2. Click "New Item"
3. Enter Code: "CUST-001"
4. Fill required fields
5. Click "Create"
**Expected:** Item created with code "CUST-001"

### TC-ITEM-005: Create Item - Duplicate Code
**Steps:**
1. Create item with code "TEST-001"
2. Try to create another item with code "TEST-001"
**Expected:** Error message "Code already exists" or auto-generates new code

### TC-ITEM-006: Create Item - Missing Required Fields
**Steps:**
1. Click "New Item"
2. Leave Name field empty
3. Click "Create"
**Expected:** Validation error "Name is required"

### TC-ITEM-007: Create Item - Invalid Standard Cost
**Steps:**
1. Click "New Item"
2. Enter Standard Cost: -10
3. Fill other fields
4. Click "Create"
**Expected:** Validation error "Cost must be positive"

### TC-ITEM-008: Create Item - Invalid Tax Rate
**Steps:**
1. Click "New Item"
2. Enter Tax Rate: 150
3. Fill other fields
4. Click "Create"
**Expected:** Validation error "Tax rate must be 0-100"

### TC-ITEM-009: Edit Existing Item
**Steps:**
1. Navigate to `/items`
2. Click "Edit" button (✏️) on any item
3. Change Name to "Updated Name"
4. Click "Update"
**Expected:** Item updated, success toast, modal closes, list refreshes

### TC-ITEM-010: Edit Item - Code Field Disabled
**Steps:**
1. Click "Edit" on an item
2. Check Code field
**Expected:** Code field is disabled (cannot be changed)

### TC-ITEM-011: Delete Item
**Steps:**
1. Navigate to `/items`
2. Click "Delete" button (🗑️) on an item
3. Confirm deletion in dialog
**Expected:** Item soft-deleted (isActive = false), list refreshes

### TC-ITEM-012: Delete Item - Cancel Confirmation
**Steps:**
1. Click "Delete" on an item
2. Click "Cancel" in confirmation dialog
**Expected:** Dialog closes, item NOT deleted

### TC-ITEM-013: Toggle Item Status - Deactivate
**Steps:**
1. Navigate to `/items`
2. Click "Deactivate" button (⏸️) on active item
**Expected:** Item status changes to inactive, button changes to "Activate" (▶️)

### TC-ITEM-014: Toggle Item Status - Activate
**Steps:**
1. Find inactive item
2. Click "Activate" button (▶️)
**Expected:** Item status changes to active, button changes to "Deactivate"

### TC-ITEM-015: Search Items by Name
**Steps:**
1. Navigate to `/items`
2. Enter "Orange" in search box
3. Press Enter or wait for debounce
**Expected:** List filters to show only items with "Orange" in name

### TC-ITEM-016: Search Items by Code
**Steps:**
1. Enter "ITM-001" in search box
**Expected:** Shows item with code ITM-001

### TC-ITEM-017: Search Items by Description
**Steps:**
1. Enter "concentrate" in search box
**Expected:** Shows items with "concentrate" in description

### TC-ITEM-018: Filter Items by Category - Raw Material
**Steps:**
1. Select "Raw Material" from category dropdown
**Expected:** Shows only raw material items

### TC-ITEM-019: Filter Items by Category - Packaging
**Steps:**
1. Select "Packaging" from category dropdown
**Expected:** Shows only packaging items

### TC-ITEM-020: Filter Items by Category - Finished Goods
**Steps:**
1. Select "Finished Goods" from category dropdown
**Expected:** Shows only finished goods

### TC-ITEM-021: Filter Items by Status - Active Only
**Steps:**
1. Select "Active" from status dropdown
**Expected:** Shows only active items

### TC-ITEM-022: Filter Items by Status - Inactive Only
**Steps:**
1. Select "Inactive" from status dropdown
**Expected:** Shows only inactive items

### TC-ITEM-023: Combined Filters
**Steps:**
1. Select Category: "Raw Material"
2. Select Status: "Active"
3. Enter Search: "Orange"
**Expected:** Shows only active raw materials with "Orange" in name/code/description

### TC-ITEM-024: Clear Filters
**Steps:**
1. Apply multiple filters
2. Clear all filter selections
**Expected:** Shows all items

### TC-ITEM-025: Empty State - No Items
**Steps:**
1. Delete all items (or filter to show none)
**Expected:** Shows empty state message "No items found"

---

## MODULE 4: BULK UPLOAD (15 Test Cases)

### TC-BULK-001: Open Bulk Upload Modal
**Steps:**
1. Navigate to `/items`
2. Click "Bulk Upload" button
**Expected:** Modal opens with upload form

### TC-BULK-002: Download Template
**Steps:**
1. Click "Bulk Upload"
2. Click "Download Template" button
**Expected:** Excel file downloads with headers: Code, Name, Description, Category, Base Unit, Standard Cost, MOQ, Min Stock Quantity, Tax Rate, Has Expiry

### TC-BULK-003: Template File Structure Validation
**Steps:**
1. Download template
2. Open in Excel
**Expected:** Headers in row 1, sample data in row 2, proper formatting

### TC-BULK-004: Upload Valid File - All Valid Rows
**Steps:**
1. Prepare Excel with 10 valid items
2. Click "Bulk Upload"
3. Select file
4. Click "Upload"
**Expected:** All 10 items created, success message shows "10 items created"

### TC-BULK-005: Upload File - Some Invalid Rows
**Steps:**
1. Prepare Excel with 5 valid, 3 invalid rows (missing required fields)
2. Upload file
**Expected:** 5 items created, error report shows 3 failed with reasons

### TC-BULK-006: Upload Empty File
**Steps:**
1. Upload Excel with only headers, no data
**Expected:** Error message "No data found in file"

### TC-BULK-007: Upload Wrong File Format
**Steps:**
1. Try to upload .txt or .pdf file
**Expected:** Error message "Invalid file format. Please upload .xlsx file"

### TC-BULK-008: Upload File - Duplicate Codes
**Steps:**
1. Excel has 2 rows with same code "TEST-001"
2. Upload file
**Expected:** First row creates item, second row auto-generates new code

### TC-BULK-009: Upload File - Missing Required Columns
**Steps:**
1. Excel missing "Name" column
2. Upload file
**Expected:** Error message "Missing required column: Name"

### TC-BULK-010: Upload File - Invalid Category Values
**Steps:**
1. Excel has Category: "Invalid Category"
2. Upload file
**Expected:** Row fails with error "Invalid category. Must be: raw_material, packaging, finished_good"

### TC-BULK-011: Upload File - Invalid Numeric Fields
**Steps:**
1. Excel has Standard Cost: "abc"
2. Upload file
**Expected:** Row fails with error "Standard Cost must be a number"

### TC-BULK-012: Upload File - Progress Indicator
**Steps:**
1. Upload file with 100 rows
2. Observe UI during upload
**Expected:** Progress bar or spinner shows upload in progress

### TC-BULK-013: Upload Large File (Performance Test)
**Steps:**
1. Upload file with 1000+ rows
**Expected:** Upload completes within reasonable time (<30 seconds), no browser freeze

### TC-BULK-014: Upload File - Cancel Upload
**Steps:**
1. Start upload
2. Click "Cancel" button (if available)
**Expected:** Upload cancels, partial data NOT saved

### TC-BULK-015: Bulk Upload Error Report Download
**Steps:**
1. Upload file with errors
2. Click "Download Error Report" button
**Expected:** Excel file downloads with failed rows and error messages

---

## MODULE 5: SKUs MANAGEMENT (12 Test Cases)

### TC-SKU-001: View SKUs List
**Steps:**
1. Navigate to `/skus`
**Expected:** Table displays all SKUs with Code, Name, Unit, Standard Cost, Actions

### TC-SKU-002: Create New SKU
**Steps:**
1. Click "New SKU"
2. Fill fields:
   - Code: "SKU-OJ-500"
   - Name: "Orange Juice 500ml"
   - Description: "Fresh orange juice 500ml bottle"
   - Unit: "BTL"
   - Standard Cost: 25.00
   - Tax Rate: 18
   - Has Expiry: Yes
3. Click "Create"
**Expected:** SKU created, success toast, modal closes

### TC-SKU-003: Create SKU - Missing Required Fields
**Steps:**
1. Click "New SKU"
2. Leave Name empty
3. Click "Create"
**Expected:** Validation error "Name is required"

### TC-SKU-004: Create SKU - Duplicate Code
**Steps:**
1. Create SKU with code "SKU-001"
2. Try to create another with same code
**Expected:** Error message "SKU code already exists"

### TC-SKU-005: Edit SKU
**Steps:**
1. Click "Edit" on a SKU
2. Change Name to "Updated Name"
3. Click "Update"
**Expected:** SKU updated, list refreshes

### TC-SKU-006: Delete SKU
**Steps:**
1. Click "Delete" on a SKU
2. Confirm deletion
**Expected:** SKU soft-deleted, removed from list

### TC-SKU-007: Delete SKU with Active Recipes
**Steps:**
1. Find SKU with active recipe
2. Try to delete
**Expected:** Error or warning message "Cannot delete SKU with active recipes"

### TC-SKU-008: Search SKUs
**Steps:**
1. Enter "Orange" in search box
**Expected:** Shows SKUs matching "Orange"

### TC-SKU-009: Filter SKUs by Status
**Steps:**
1. Select "Active" from status filter
**Expected:** Shows only active SKUs

### TC-SKU-010: View SKU Stock Levels
**Steps:**
1. Click on SKU name or "View Details"
**Expected:** Shows current stock by warehouse

### TC-SKU-011: Empty State - No SKUs
**Steps:**
1. Delete all SKUs
**Expected:** Shows "No SKUs found" empty state

### TC-SKU-012: SKU with Special Characters in Name
**Steps:**
1. Create SKU with name "Juice (500ml) - Fresh"
2. Click "Create"
**Expected:** SKU created successfully with special characters

---

## MODULE 6: RECIPES / QPS MANAGEMENT (20 Test Cases)

### TC-RECIPE-001: View Recipes List
**Steps:**
1. Navigate to `/recipes`
**Expected:** Table shows recipe versions with SKU, Version, Effective From, Status, Actions

### TC-RECIPE-002: Filter Recipes by SKU
**Steps:**
1. Select SKU from dropdown
**Expected:** Shows only recipes for selected SKU

### TC-RECIPE-003: Create New Recipe - Basic
**Steps:**
1. Click "New Recipe"
2. Select SKU: "Orange Juice 500ml"
3. Version Number: 1
4. Effective From: Today's date
5. Click "Next" to ingredients
**Expected:** Moves to ingredients step

### TC-RECIPE-004: Add Recipe Ingredients
**Steps:**
1. In ingredients step:
2. Select Item: "Orange Juice Concentrate"
3. Quantity: 400
4. Unit: "ML"
5. Click "Add Ingredient"
6. Repeat for packaging items (bottle, cap, label)
7. Click "Create Recipe"
**Expected:** Recipe created with all ingredients, success toast

### TC-RECIPE-005: Recipe with Multiple Ingredients
**Steps:**
1. Create recipe with 5 ingredients
2. Add each ingredient one by one
**Expected:** All 5 ingredients saved with recipe

### TC-RECIPE-006: Remove Ingredient Before Saving
**Steps:**
1. Add 3 ingredients
2. Click "Remove" on one ingredient
3. Save recipe
**Expected:** Recipe saved with remaining 2 ingredients

### TC-RECIPE-007: Create Recipe - Missing Required Fields
**Steps:**
1. Click "New Recipe"
2. Leave SKU unselected
3. Try to proceed
**Expected:** Validation error "SKU is required"

### TC-RECIPE-008: Create Recipe - No Ingredients
**Steps:**
1. Fill recipe details
2. Don't add any ingredients
3. Click "Create"
**Expected:** Validation error "At least one ingredient is required"

### TC-RECIPE-009: Create Recipe - Duplicate Version for Same SKU
**Steps:**
1. Create recipe: SKU=OJ-500, Version=1
2. Try to create another: SKU=OJ-500, Version=1
**Expected:** Error message "Version already exists for this SKU"

### TC-RECIPE-010: Create Recipe with Effective Date Range
**Steps:**
1. Create recipe with:
   - Effective From: 2024-01-01
   - Effective To: 2024-12-31
**Expected:** Recipe created with date range

### TC-RECIPE-011: View Recipe Details
**Steps:**
1. Click on recipe row
**Expected:** Shows recipe details with all ingredients list

### TC-RECIPE-012: Edit Recipe Version
**Steps:**
1. Click "Edit" on recipe
2. Change Effective From date
3. Click "Update"
**Expected:** Recipe updated

### TC-RECIPE-013: Edit Recipe - Add New Ingredient
**Steps:**
1. Edit existing recipe
2. Add new ingredient
3. Save
**Expected:** New ingredient added to recipe

### TC-RECIPE-014: Edit Recipe - Remove Existing Ingredient
**Steps:**
1. Edit recipe
2. Remove an ingredient
3. Save
**Expected:** Ingredient removed, recipe updated

### TC-RECIPE-015: Delete Recipe
**Steps:**
1. Click "Delete" on recipe
2. Confirm deletion
**Expected:** Recipe deleted

### TC-RECIPE-016: Delete Recipe in Use by Production
**Steps:**
1. Find recipe used in active production batch
2. Try to delete
**Expected:** Error message "Cannot delete recipe in use"

### TC-RECIPE-017: Activate/Deactivate Recipe
**Steps:**
1. Click "Deactivate" on active recipe
**Expected:** Recipe status changes to inactive

### TC-RECIPE-018: Multiple Active Versions for Same SKU
**Steps:**
1. Create Version 1 (Effective: Jan-Jun)
2. Create Version 2 (Effective: Jul-Dec)
**Expected:** Both versions active with non-overlapping date ranges

### TC-RECIPE-019: Recipe Cost Calculation
**Steps:**
1. View recipe details
**Expected:** Shows total recipe cost (sum of ingredient costs)

### TC-RECIPE-020: Create New Unit During Recipe Creation
**Steps:**
1. In ingredient selection, unit not available
2. Click "Create New Unit"
3. Create unit
4. Select newly created unit
**Expected:** New unit available immediately in dropdown

---

## MODULE 7: WAREHOUSES MANAGEMENT (10 Test Cases)

### TC-WARE-001: View Warehouses List
**Steps:**
1. Navigate to `/warehouses`
**Expected:** Table shows Code, Name, Address, Status, Actions

### TC-WARE-002: Create New Warehouse
**Steps:**
1. Click "New Warehouse"
2. Fill:
   - Code: "WH-NORTH"
   - Name: "North Warehouse"
   - Address: "123 North St, City"
3. Click "Create"
**Expected:** Warehouse created, success toast

### TC-WARE-003: Create Warehouse - Duplicate Code
**Steps:**
1. Create warehouse "WH-001"
2. Try to create another "WH-001"
**Expected:** Error "Warehouse code already exists"

### TC-WARE-004: Edit Warehouse
**Steps:**
1. Click "Edit" on warehouse
2. Change Address
3. Click "Update"
**Expected:** Warehouse updated

### TC-WARE-005: Delete Warehouse
**Steps:**
1. Click "Delete" on warehouse
2. Confirm
**Expected:** Warehouse soft-deleted

### TC-WARE-006: Delete Warehouse with Inventory
**Steps:**
1. Find warehouse with inventory batches
2. Try to delete
**Expected:** Error or warning "Cannot delete warehouse with inventory"

### TC-WARE-007: Toggle Warehouse Status
**Steps:**
1. Click "Deactivate" on warehouse
**Expected:** Status changes to inactive

### TC-WARE-008: Search Warehouses
**Steps:**
1. Enter "North" in search
**Expected:** Shows warehouses matching "North"

### TC-WARE-009: View Warehouse Inventory
**Steps:**
1. Click "View Inventory" on warehouse
**Expected:** Shows all inventory batches for that warehouse

### TC-WARE-010: Empty State - No Warehouses
**Steps:**
1. Delete all warehouses
**Expected:** Shows "No warehouses found"

---

## MODULE 8: SUPPLIERS MANAGEMENT (10 Test Cases)

### TC-SUPP-001: View Suppliers List
**Steps:**
1. Navigate to `/suppliers`
**Expected:** Table shows Code, Name, Contact Person, Phone, Email, Actions

### TC-SUPP-002: Create New Supplier
**Steps:**
1. Click "New Supplier"
2. Fill all fields
3. Click "Create"
**Expected:** Supplier created

### TC-SUPP-003: Create Supplier - Missing Required Fields
**Steps:**
1. Click "New Supplier"
2. Leave Name empty
3. Click "Create"
**Expected:** Validation error

### TC-SUPP-004: Edit Supplier
**Steps:**
1. Click "Edit"
2. Update fields
3. Click "Update"
**Expected:** Supplier updated

### TC-SUPP-005: Delete Supplier
**Steps:**
1. Click "Delete"
2. Confirm
**Expected:** Supplier deleted

### TC-SUPP-006: Delete Supplier with Purchase Orders
**Steps:**
1. Find supplier with POs
2. Try to delete
**Expected:** Error message or cascade delete

### TC-SUPP-007: Toggle Supplier Status
**Steps:**
1. Click "Deactivate"
**Expected:** Status changes to inactive

### TC-SUPP-008: Search Suppliers
**Steps:**
1. Enter supplier name
**Expected:** Filtered results

### TC-SUPP-009: View Supplier Purchase Orders
**Steps:**
1. Click "View POs" on supplier
**Expected:** Shows all POs for supplier

### TC-SUPP-010: Empty State
**Steps:**
1. Delete all suppliers
**Expected:** Shows empty state

---

## MODULE 9: CUSTOMERS MANAGEMENT (10 Test Cases)

### TC-CUST-001: View Customers List
**Steps:**
1. Navigate to `/customers`
**Expected:** Table shows all customers

### TC-CUST-002: Create New Customer
**Steps:**
1. Click "New Customer"
2. Fill all fields including tax rate
3. Click "Create"
**Expected:** Customer created

### TC-CUST-003: Create Customer - Invalid Email
**Steps:**
1. Enter email: "invalidemail"
2. Try to create
**Expected:** Validation error "Invalid email format"

### TC-CUST-004: Edit Customer
**Steps:**
1. Click "Edit"
2. Update contact person
3. Click "Update"
**Expected:** Customer updated

### TC-CUST-005: Delete Customer
**Steps:**
1. Click "Delete"
2. Confirm
**Expected:** Customer deleted

### TC-CUST-006: Delete Customer with Orders
**Steps:**
1. Find customer with active orders
2. Try to delete
**Expected:** Error message

### TC-CUST-007: Toggle Customer Status
**Steps:**
1. Click "Deactivate"
**Expected:** Status inactive

### TC-CUST-008: Search Customers
**Steps:**
1. Enter customer name
**Expected:** Filtered results

### TC-CUST-009: View Customer Orders
**Steps:**
1. Click "View Orders"
**Expected:** Shows all orders for customer

### TC-CUST-010: Customer Tax Rate Application
**Steps:**
1. Create customer with tax rate 12%
2. Create order for this customer
**Expected:** Order uses customer's 12% tax rate

---

## MODULE 10: INVENTORY MANAGEMENT (25 Test Cases)

### TC-INV-001: View Inventory List
**Steps:**
1. Navigate to `/inventory`
**Expected:** Table shows Item, Warehouse, Batch Number, Quantity, Unit, Expiry Date

### TC-INV-002: Filter Inventory by Warehouse
**Steps:**
1. Select warehouse from dropdown
**Expected:** Shows inventory for selected warehouse only

### TC-INV-003: Filter Inventory - Low Stock Only
**Steps:**
1. Check "Low Stock Only" checkbox
**Expected:** Shows items where current stock < min stock quantity

### TC-INV-004: Filter Inventory - Expiring Soon Only
**Steps:**
1. Check "Expiring Soon" checkbox
**Expected:** Shows batches expiring within 30 days

### TC-INV-005: View Inventory by Item
**Steps:**
1. Click on item name
**Expected:** Shows all batches for that item across warehouses

### TC-INV-006: Search Inventory by Item Code
**Steps:**
1. Enter item code in search
**Expected:** Shows matching inventory

### TC-INV-007: Search Inventory by Batch Number
**Steps:**
1. Enter batch number
**Expected:** Shows that specific batch

### TC-INV-008: Inventory with Zero Quantity
**Steps:**
1. Use FIFO to consume entire batch
2. Check inventory list
**Expected:** Batch shows quantity = 0 (not hidden)

### TC-INV-009: Inventory Valuation Calculation
**Steps:**
1. View inventory report
**Expected:** Total value = Σ(quantity × unit cost) for all batches

### TC-INV-010: Empty State - No Inventory
**Steps:**
1. Start with fresh database
**Expected:** Shows "No inventory found"

### TC-INV-011: Create Stock Adjustment - Increase Quantity
**Steps:**
1. Navigate to `/inventory/adjustments`
2. Click "New Adjustment"
3. Select warehouse
4. Adjustment Date: Today
5. Reason: "Physical count correction"
6. Add Item:
   - Item: Select item
   - Batch: Select batch
   - Quantity Change: +50
7. Click "Create Adjustment"
**Expected:** Adjustment created, batch quantity increased by 50

### TC-INV-012: Create Stock Adjustment - Decrease Quantity
**Steps:**
1. Create adjustment with Quantity Change: -30
**Expected:** Batch quantity decreased by 30

### TC-INV-013: Stock Adjustment - Multiple Items
**Steps:**
1. Add 3 items to single adjustment
2. Submit
**Expected:** All 3 batch quantities updated

### TC-INV-014: Stock Adjustment - Missing Required Fields
**Steps:**
1. Click "New Adjustment"
2. Leave Reason empty
3. Try to submit
**Expected:** Validation error "Reason is required"

### TC-INV-015: Stock Adjustment - Negative Result
**Steps:**
1. Batch has quantity 20
2. Create adjustment: -50
**Expected:** Batch quantity becomes -30 (or error if business rule prevents negative)

### TC-INV-016: View Stock Adjustments History
**Steps:**
1. Navigate to `/inventory/adjustments`
**Expected:** Table shows all past adjustments with date, reason, items

### TC-INV-017: Create Stock Transfer
**Steps:**
1. Navigate to `/inventory/transfers`
2. Click "New Transfer"
3. From Warehouse: "WH-MAIN"
4. To Warehouse: "WH-NORTH"
5. Transfer Date: Today
6. Add Item:
   - Item: Select item
   - Batch: Select batch from source warehouse
   - Quantity: 100
7. Click "Create Transfer"
**Expected:** Transfer created, source batch -100, destination batch +100

### TC-INV-018: Stock Transfer - Multiple Items
**Steps:**
1. Add 3 items to transfer
2. Submit
**Expected:** All 3 items transferred

### TC-INV-019: Stock Transfer - Same Source and Destination
**Steps:**
1. Select From Warehouse: "WH-MAIN"
2. Select To Warehouse: "WH-MAIN"
3. Try to submit
**Expected:** Validation error "Source and destination must be different"

### TC-INV-020: Stock Transfer - Insufficient Quantity
**Steps:**
1. Batch has 50 units
2. Try to transfer 100 units
**Expected:** Error "Insufficient quantity in batch"

### TC-INV-021: Stock Transfer - Creates New Batch in Destination
**Steps:**
1. Transfer item that doesn't exist in destination warehouse
2. Submit
**Expected:** New batch created in destination with same batch number

### TC-INV-022: View Stock Transfers History
**Steps:**
1. Navigate to `/inventory/transfers`
**Expected:** Table shows all transfers with status

### TC-INV-023: Stock Transfer Status - Complete
**Steps:**
1. Create transfer
2. Check status
**Expected:** Status = "completed" after successful transfer

### TC-INV-024: Low Stock Alert Notification
**Steps:**
1. Reduce item quantity below min stock
2. Check dashboard or inventory page
**Expected:** Low stock alert badge/notification shows

### TC-INV-025: Expiry Alert - Within 30 Days
**Steps:**
1. Create batch with expiry date 20 days from today
2. Check inventory page
**Expected:** Batch highlighted or flagged as expiring soon

---

## MODULE 11: PURCHASE ORDERS (30 Test Cases)

### TC-PO-001: View Purchase Orders List
**Steps:**
1. Navigate to `/purchase-orders`
**Expected:** Table shows PO Number, Supplier, Date, Status, Total, Actions

### TC-PO-002: Filter POs by Supplier
**Steps:**
1. Select supplier from dropdown
**Expected:** Shows POs for selected supplier only

### TC-PO-003: Filter POs by Status
**Steps:**
1. Select status: "Confirmed"
**Expected:** Shows only confirmed POs

### TC-PO-004: Filter POs by Date Range
**Steps:**
1. Select Start Date: 2024-01-01
2. Select End Date: 2024-01-31
**Expected:** Shows POs within date range

### TC-PO-005: Create New Purchase Order - Single Item
**Steps:**
1. Click "New Purchase Order"
2. Select Supplier
3. Order Date: Today
4. Expected Delivery Date: +7 days
5. Add Item:
   - Item: "Orange Juice Concentrate"
   - Quantity: 500
   - Unit: "L"
   - Unit Price: 50.00
   - Tax Rate: 18
6. Click "Add Item"
7. Review totals (subtotal, tax, grand total)
8. Click "Create & Confirm"
**Expected:** PO created with number "PO-0001", status "confirmed", redirect to PO details

### TC-PO-006: Create PO - Save as Draft
**Steps:**
1. Fill PO form
2. Click "Save as Draft"
**Expected:** PO created with status "draft"

### TC-PO-007: Create PO - Multiple Items
**Steps:**
1. Add 5 items to PO
2. Submit
**Expected:** PO created with all 5 items, totals calculated correctly

### TC-PO-008: Create PO - Missing Required Fields
**Steps:**
1. Click "New PO"
2. Don't select supplier
3. Try to submit
**Expected:** Validation error "Supplier is required"

### TC-PO-009: Create PO - No Items Added
**Steps:**
1. Fill PO details
2. Don't add any items
3. Try to submit
**Expected:** Validation error "At least one item is required"

### TC-PO-010: Create PO - MOQ Validation
**Steps:**
1. Add item with MOQ = 100
2. Enter quantity: 50
3. Try to add item
**Expected:** Validation error "Quantity must be at least 100 (MOQ)"

### TC-PO-011: Create PO - Negative Quantity
**Steps:**
1. Enter quantity: -10
**Expected:** Validation error "Quantity must be positive"

### TC-PO-012: Create PO - Zero Unit Price
**Steps:**
1. Enter unit price: 0
2. Add item
**Expected:** Item added successfully (free items allowed)

### TC-PO-013: Create PO - Auto-Calculate Line Total
**Steps:**
1. Quantity: 100, Unit Price: 50, Tax Rate: 18
**Expected:** Line Total = 100 × 50 × 1.18 = 5,900

### TC-PO-014: Create PO - Auto-Calculate PO Totals
**Steps:**
1. Add 3 items:
   - Item 1: Line Total = 5,000
   - Item 2: Line Total = 3,000
   - Item 3: Line Total = 2,000
**Expected:**
- Total Amount: 10,000
- Tax Amount: calculated
- Grand Total: 10,000 + tax

### TC-PO-015: Edit PO - Draft Status
**Steps:**
1. Find PO with status "draft"
2. Click "Edit"
3. Modify items
4. Save
**Expected:** PO updated

### TC-PO-016: Edit PO - Confirmed Status
**Steps:**
1. Find confirmed PO
2. Try to edit
**Expected:** Edit disabled or warning message

### TC-PO-017: View PO Details
**Steps:**
1. Click on PO number
**Expected:** Shows PO details with:
- Supplier info
- Items table
- Status badge
- Action buttons (Confirm, Receive Goods)

### TC-PO-018: Confirm Purchase Order
**Steps:**
1. Find draft PO
2. Click "Confirm" button
**Expected:** Status changes to "confirmed"

### TC-PO-019: Receive Goods - Link to PO
**Steps:**
1. Find confirmed PO
2. Click "Receive Goods"
3. Redirects to receive form with PO details pre-filled
4. Select warehouse
5. For each item:
   - Batch Number: Leave blank (auto-generate)
   - Quantity: Same as ordered
   - Expiry Date: +6 months
   - Unit Cost: Same as unit price
6. Click "Receive Goods"
**Expected:**
- Goods receipt created
- Inventory batches created/updated
- PO status changes to "fully_received"
- PO items show receivedQuantity = quantity

### TC-PO-020: Receive Goods - Partial Receipt
**Steps:**
1. PO has 100 units ordered
2. Receive 60 units
**Expected:**
- PO status = "partially_received"
- PO item: receivedQuantity = 60
- Can create another receipt for remaining 40

### TC-PO-021: Receive Goods - Multiple Partial Receipts
**Steps:**
1. Order: 100 units
2. Receipt 1: 30 units
3. Receipt 2: 40 units
4. Receipt 3: 30 units
**Expected:**
- After receipt 3, status = "fully_received"
- Total receivedQuantity = 100

### TC-PO-022: Receive Goods - Auto-Generate Batch Number
**Steps:**
1. Leave Batch Number field blank
2. Submit receipt
**Expected:** System generates batch number "BATCH-{timestamp}"

### TC-PO-023: Receive Goods - Manual Batch Number
**Steps:**
1. Enter Batch Number: "BATCH-001"
2. Submit
**Expected:** Batch created with number "BATCH-001"

### TC-PO-024: Receive Goods - Existing Batch
**Steps:**
1. Receive goods with batch "BATCH-001" (100 units)
2. Later, receive more goods with same batch "BATCH-001" (50 units)
**Expected:** Batch quantity = 150 (combined)

### TC-PO-025: Receive Goods - Update Inventory
**Steps:**
1. Check item stock before receipt: 0
2. Receive 100 units
3. Check item stock after receipt: 100
**Expected:** Inventory increased by 100

### TC-PO-026: Receive Goods - Different Unit Price
**Steps:**
1. PO unit price: 50.00
2. During receipt, enter unit cost: 48.00
3. Submit
**Expected:** Batch created with unit cost 48.00

### TC-PO-027: View Goods Receipts for PO
**Steps:**
1. Open PO details
2. Scroll to "Goods Receipts" section
**Expected:** Shows all receipts linked to this PO

### TC-PO-028: Delete Purchase Order - Draft
**Steps:**
1. Find draft PO
2. Click "Delete"
3. Confirm
**Expected:** PO deleted

### TC-PO-029: Delete PO - Confirmed with Receipts
**Steps:**
1. Find confirmed PO with receipts
2. Try to delete
**Expected:** Error "Cannot delete PO with goods receipts"

### TC-PO-030: Purchase Suggestions
**Steps:**
1. Navigate to `/purchase-orders/suggestions`
**Expected:** Shows items where current stock < min stock quantity with suggested order quantities

---

## MODULE 12: PRODUCTION MANAGEMENT (35 Test Cases)

### TC-PROD-001: View Production Batches List
**Steps:**
1. Navigate to `/production`
**Expected:** Table shows Batch Number, SKU, Target Quantity, Status, Actions

### TC-PROD-002: Filter Production by Status
**Steps:**
1. Select status: "in_progress"
**Expected:** Shows only in-progress batches

### TC-PROD-003: Create New Production Batch
**Steps:**
1. Click "New Production Batch"
2. Fill:
   - SKU: "Orange Juice 500ml"
   - Recipe Version: Select active recipe
   - Warehouse: "WH-MAIN"
   - Target Quantity: 1000
   - Production Date: Today
   - Notes: "Test batch"
3. Click "Create"
**Expected:** Batch created with status "in_progress", redirect to batch details

### TC-PROD-004: Create Production - Missing Required Fields
**Steps:**
1. Leave SKU unselected
2. Try to create
**Expected:** Validation error "SKU is required"

### TC-PROD-005: Create Production - Invalid Target Quantity
**Steps:**
1. Enter Target Quantity: 0
2. Try to create
**Expected:** Validation error "Target quantity must be greater than zero"

### TC-PROD-006: Create Production - No Active Recipe
**Steps:**
1. Select SKU with no active recipe
2. Try to create
**Expected:** Error "No active recipe found for this SKU"

### TC-PROD-007: View Production Batch Details
**Steps:**
1. Click on batch number
**Expected:** Shows:
- Batch info (SKU, recipe, target qty)
- Recipe ingredients list
- Material issues list
- Finished goods receipts list
- Action buttons (Issue Materials, Receive Finished Goods)

### TC-PROD-008: Issue Materials - Auto-Calculate from Recipe
**Steps:**
1. Open batch details
2. Click "Issue Materials"
3. Select Warehouse
4. Click "Calculate from Recipe"
**Expected:**
- Shows ingredients table with calculated quantities
- Example: Recipe needs 400ml per unit, target 1000 units = 400,000ml = 400L

### TC-PROD-009: Issue Materials - FIFO Batch Selection
**Steps:**
1. Item has 3 batches:
   - Batch A: Expiry 2024-06-01, Qty 200
   - Batch B: Expiry 2024-03-01, Qty 150
   - Batch C: No expiry, Received 2024-01-01, Qty 300
2. Required: 250 units
3. Click "Issue Materials"
**Expected:** FIFO selects:
- Batch B: 150 (expiring soonest)
- Batch C: 100 (oldest received)

### TC-PROD-010: Issue Materials - Insufficient Stock
**Steps:**
1. Recipe requires 500L
2. Available stock: 300L
3. Try to issue materials
**Expected:** Error "Insufficient stock for item: Orange Juice Concentrate. Available: 300, Required: 500"

### TC-PROD-011: Issue Materials - Update Inventory
**Steps:**
1. Before issue: Item stock = 500
2. Issue 300 units
3. After issue: Item stock = 200
**Expected:** Inventory decreased correctly

### TC-PROD-012: Issue Materials - Multiple Items
**Steps:**
1. Recipe has 5 ingredients
2. Issue materials
**Expected:** All 5 ingredients issued, all batches updated

### TC-PROD-013: Issue Materials - Create Material Issue Record
**Steps:**
1. Issue materials
2. Check batch details
**Expected:** Material Issue record created with:
- Issue Number: "MI-0001"
- Production Batch ID
- Issue Date
- Items list

### TC-PROD-014: View Material Issues List
**Steps:**
1. Navigate to material issues (if separate page)
**Expected:** Shows all material issues with batch, date, items

### TC-PROD-015: Issue Materials - Already Issued
**Steps:**
1. Issue materials for batch
2. Try to issue again
**Expected:** Warning "Materials already issued" or allow second issue

### TC-PROD-016: Complete Production - Receive Finished Goods
**Steps:**
1. After issuing materials
2. Click "Receive Finished Goods"
3. Fill:
   - Actual Quantity: 980 (slightly less than target 1000)
   - Waste Quantity: 20
   - Batch Number: "FG-BATCH-001"
   - Expiry Date: +6 months
   - Production Date: Today
4. Click "Receive"
**Expected:**
- Finished goods receipt created
- Inventory batch created for SKU
- Production batch status = "completed"
- Actual Quantity = 980, Waste = 20
- Yield % = (980/1000) × 100 = 98%

### TC-PROD-017: Receive Finished Goods - Yield Calculation
**Steps:**
1. Target: 1000, Actual: 950, Waste: 50
**Expected:** Yield = 95%, Waste % = 5%

### TC-PROD-018: Receive Finished Goods - Zero Waste
**Steps:**
1. Target: 1000, Actual: 1000, Waste: 0
**Expected:** Yield = 100%, Waste = 0%

### TC-PROD-019: Receive Finished Goods - Higher Actual than Target
**Steps:**
1. Target: 1000, Actual: 1050
**Expected:** Yield = 105% (acceptable, bonus production)

### TC-PROD-020: Receive Finished Goods - Update SKU Inventory
**Steps:**
1. Before receipt: SKU stock = 0
2. Receive 980 units
3. After receipt: SKU stock = 980
**Expected:** SKU inventory increased

### TC-PROD-021: Receive Finished Goods - Multiple Receipts
**Steps:**
1. Receive 500 units
2. Receive another 480 units
**Expected:** Total actual = 980, both receipts recorded

### TC-PROD-022: View Finished Goods Receipts
**Steps:**
1. In batch details
2. Check "Finished Goods Receipts" section
**Expected:** Shows all receipts for this batch

### TC-PROD-023: Production Batch - Incomplete Workflow
**Steps:**
1. Create batch
2. Don't issue materials
3. Try to receive finished goods
**Expected:** Warning or error "Materials not yet issued"

### TC-PROD-024: Production Batch - Cancel
**Steps:**
1. Find in_progress batch
2. Click "Cancel" button
3. Confirm
**Expected:** Status changes to "cancelled"

### TC-PROD-025: Cancel Production - Material Rollback
**Steps:**
1. Issue materials (inventory decreased)
2. Cancel production
**Expected:** Option to rollback materials (increase inventory back) or leave as is

### TC-PROD-026: Edit Production Batch - Before Issue
**Steps:**
1. Find batch with no materials issued
2. Click "Edit"
3. Change target quantity
4. Save
**Expected:** Batch updated

### TC-PROD-027: Edit Production Batch - After Issue
**Steps:**
1. Find batch with materials issued
2. Try to edit target quantity
**Expected:** Edit disabled or warning

### TC-PROD-028: Production Report - Yield Analysis
**Steps:**
1. Navigate to `/reports/production`
2. Select date range
**Expected:** Report shows:
- Total batches
- Average yield %
- Total waste
- Production by SKU

### TC-PROD-029: Production Report - Export Excel
**Steps:**
1. View production report
2. Click "Export Excel"
**Expected:** Excel file downloads with production data

### TC-PROD-030: Production Report - Export PDF
**Steps:**
1. View production report
2. Click "Export PDF"
**Expected:** PDF downloads with charts and tables

### TC-PROD-031: Production Batch - Change Recipe Version
**Steps:**
1. SKU has 2 recipe versions
2. Create batch with Version 1
3. Before issuing, change to Version 2
**Expected:** Batch uses new recipe version

### TC-PROD-032: Production Batch - Recipe Lock After Issue
**Steps:**
1. Issue materials with Recipe Version 1
2. Try to change recipe version
**Expected:** Recipe locked, cannot change

### TC-PROD-033: Material Issue - Unit Conversion
**Steps:**
1. Recipe specifies 400ML per unit
2. Target: 1000 units
3. Required: 400,000 ML = 400 L
4. Issue materials
**Expected:** System correctly converts and uses batches in L

### TC-PROD-034: Production Batch - View Material Cost
**Steps:**
1. View batch details
**Expected:** Shows total material cost = Σ(ingredient qty × unit cost)

### TC-PROD-035: Production Efficiency Dashboard
**Steps:**
1. Navigate to dashboard or production page
**Expected:** Shows:
- Total batches completed
- Average yield
- Top performing SKUs
- Batches in progress

---

## MODULE 13: CUSTOMER ORDERS & SALES (30 Test Cases)

### TC-SALES-001: View Customer Orders List
**Steps:**
1. Navigate to `/customer-orders`
**Expected:** Table shows Order Number, Customer, Date, Status, Total, Actions

### TC-SALES-002: Filter Orders by Customer
**Steps:**
1. Select customer from dropdown
**Expected:** Shows orders for selected customer only

### TC-SALES-003: Filter Orders by Status
**Steps:**
1. Select status: "Confirmed"
**Expected:** Shows confirmed orders

### TC-SALES-004: Filter Orders by Date Range
**Steps:**
1. Select date range
**Expected:** Shows orders within range

### TC-SALES-005: Create New Customer Order - Single SKU
**Steps:**
1. Click "New Order"
2. Select Customer
3. Order Date: Today
4. Expected Delivery Date: +3 days
5. Add SKU:
   - SKU: "Orange Juice 500ml"
   - Quantity: 100
   - Unit: "BTL"
   - Unit Price: 30.00
   - Tax Rate: 18
6. Click "Add"
7. Click "Create Order"
**Expected:** Order created with number "SO-0001", status "pending"

### TC-SALES-006: Create Order - Multiple SKUs
**Steps:**
1. Add 3 different SKUs
2. Submit
**Expected:** Order created with all 3 SKUs

### TC-SALES-007: Create Order - Missing Required Fields
**Steps:**
1. Don't select customer
2. Try to submit
**Expected:** Validation error "Customer is required"

### TC-SALES-008: Create Order - No SKUs Added
**Steps:**
1. Fill order details
2. Don't add SKUs
3. Try to submit
**Expected:** Validation error "At least one SKU is required"

### TC-SALES-009: Create Order - Auto-Calculate Line Total
**Steps:**
1. Quantity: 100, Unit Price: 30, Tax Rate: 18
**Expected:** Line Total = 100 × 30 × 1.18 = 3,540

### TC-SALES-010: Create Order - Auto-Calculate Order Totals
**Steps:**
1. Add multiple SKUs
**Expected:** Total Amount, Tax Amount, Grand Total calculated correctly

### TC-SALES-011: View Order Details
**Steps:**
1. Click on order number
**Expected:** Shows:
- Customer info
- SKUs table
- Status badge
- Delivery history
- Action buttons (Confirm, Create Delivery)

### TC-SALES-012: Confirm Customer Order
**Steps:**
1. Find pending order
2. Click "Confirm"
**Expected:** Status changes to "confirmed"

### TC-SALES-013: Confirm Order - Stock Availability Check
**Steps:**
1. Order requires 100 units
2. Available stock: 50 units
3. Try to confirm
**Expected:** Warning "Insufficient stock for SKU: Orange Juice 500ml. Available: 50, Required: 100"

### TC-SALES-014: Confirm Order - Sufficient Stock
**Steps:**
1. Order requires 100 units
2. Available stock: 200 units
3. Confirm order
**Expected:** Order confirmed successfully

### TC-SALES-015: Create Sales Delivery - Full Order
**Steps:**
1. Find confirmed order
2. Click "Create Delivery"
3. Select Warehouse
4. System shows order SKUs with FIFO batches pre-selected
5. Review quantities (all full)
6. Click "Create Delivery"
**Expected:**
- Delivery created with number "SD-0001"
- Inventory batches decremented
- Order item fulfilledQuantity = quantity
- Order status = "delivered"

### TC-SALES-016: Create Delivery - Partial Fulfillment
**Steps:**
1. Order: 100 units
2. Create delivery: 60 units
**Expected:**
- Delivery created
- Order status remains "confirmed"
- Order item fulfilledQuantity = 60
- Can create another delivery for remaining 40

### TC-SALES-017: Create Delivery - Multiple Partial Deliveries
**Steps:**
1. Order: 100 units
2. Delivery 1: 40 units
3. Delivery 2: 30 units
4. Delivery 3: 30 units
**Expected:** After delivery 3, order status = "delivered"

### TC-SALES-018: Create Delivery - FIFO Batch Selection
**Steps:**
1. SKU has 3 batches:
   - Batch A: Expiry 2024-08-01, Qty 50
   - Batch B: Expiry 2024-05-01, Qty 40
   - Batch C: No expiry, Received 2024-01-01, Qty 60
2. Order: 100 units
3. Create delivery
**Expected:** FIFO selects:
- Batch B: 40 (expiring soonest)
- Batch C: 60 (oldest)

### TC-SALES-019: Create Delivery - Insufficient Stock
**Steps:**
1. Order: 100 units
2. Available stock: 50 units
3. Try to create delivery for full order
**Expected:** Error "Insufficient stock for SKU"

### TC-SALES-020: Create Delivery - Manual Batch Selection
**Steps:**
1. Override FIFO suggestion
2. Manually select specific batches
3. Submit
**Expected:** Selected batches used instead of FIFO

### TC-SALES-021: Create Delivery - Update Inventory
**Steps:**
1. Before delivery: Batch quantity = 100
2. Deliver 60 units from batch
3. After delivery: Batch quantity = 40
**Expected:** Inventory decreased correctly

### TC-SALES-022: View Deliveries for Order
**Steps:**
1. Open order details
2. Check "Deliveries" section
**Expected:** Shows all deliveries with dates, quantities

### TC-SALES-023: Edit Customer Order - Pending Status
**Steps:**
1. Find pending order
2. Click "Edit"
3. Modify SKUs
4. Save
**Expected:** Order updated

### TC-SALES-024: Edit Order - Confirmed Status
**Steps:**
1. Find confirmed order
2. Try to edit
**Expected:** Edit disabled or warning

### TC-SALES-025: Delete Customer Order - Pending
**Steps:**
1. Find pending order
2. Click "Delete"
3. Confirm
**Expected:** Order deleted

### TC-SALES-026: Delete Order - With Deliveries
**Steps:**
1. Find order with deliveries
2. Try to delete
**Expected:** Error "Cannot delete order with deliveries"

### TC-SALES-027: Sales Report - By SKU
**Steps:**
1. Navigate to `/reports/sales`
2. Select date range
3. Click "View Report"
**Expected:** Shows quantity sold and revenue by SKU

### TC-SALES-028: Sales Report - By Customer
**Steps:**
1. Select report type: "By Customer"
**Expected:** Shows sales totals by customer

### TC-SALES-029: Sales Report - Export Excel
**Steps:**
1. View sales report
2. Click "Export Excel"
**Expected:** Excel file downloads

### TC-SALES-030: Sales Report - Export PDF
**Steps:**
1. Click "Export PDF"
**Expected:** PDF downloads with sales data

---

## MODULE 14: FORECASTING (20 Test Cases)

### TC-FCST-001: View Sales Forecasts List
**Steps:**
1. Navigate to `/forecasting`
**Expected:** Table shows SKU, Month, Forecasted Quantity, Actual Quantity, Accuracy

### TC-FCST-002: Filter Forecasts by SKU
**Steps:**
1. Select SKU from dropdown
**Expected:** Shows forecasts for selected SKU only

### TC-FCST-003: Generate Forecasts - First Time
**Steps:**
1. Select SKU: "Orange Juice 500ml"
2. Click "Generate Forecasts"
**Expected:**
- System analyzes last 6 months of sales
- Creates forecasts for next 3 months
- Success message shown

### TC-FCST-004: Generate Forecasts - Insufficient Historical Data
**Steps:**
1. Select SKU with <3 months of sales data
2. Try to generate forecast
**Expected:** Warning "Insufficient historical data. Need at least 3 months of sales"

### TC-FCST-005: Generate Forecasts - No Sales Data
**Steps:**
1. Select SKU with zero sales
2. Try to generate
**Expected:** Error "No sales history found for this SKU"

### TC-FCST-006: Forecast Algorithm - Upward Trend
**Steps:**
1. SKU sales: [100, 110, 120, 130, 140, 150]
2. Generate forecast
**Expected:**
- Trend detected: UP
- Month 1 forecast: ~157 (moving avg × 1.05)
- Forecasts increasing

### TC-FCST-007: Forecast Algorithm - Downward Trend
**Steps:**
1. SKU sales: [150, 140, 130, 120, 110, 100]
2. Generate forecast
**Expected:**
- Trend detected: DOWN
- Forecasts decreasing (multiplier 0.95)

### TC-FCST-008: Forecast Algorithm - Stable Trend
**Steps:**
1. SKU sales: [100, 102, 98, 101, 99, 100]
2. Generate forecast
**Expected:**
- Trend: STABLE
- Forecasts around 100 (multiplier 1.0)

### TC-FCST-009: View Forecast Details
**Steps:**
1. Click on forecast row
**Expected:** Shows:
- Historical sales chart
- Forecast vs actual chart
- Trend information
- Accuracy percentage

### TC-FCST-010: Update Actual Quantity
**Steps:**
1. Month ends, actual sales = 120
2. Forecast was 115
3. Update forecast record
**Expected:**
- Actual Quantity = 120
- Accuracy = |120-115|/120 = 4.2% error

### TC-FCST-011: Forecast Accuracy Report
**Steps:**
1. Click "View Accuracy Report"
**Expected:** Shows:
- SKUs with best accuracy
- SKUs with worst accuracy
- Average accuracy %
- MAPE (Mean Absolute Percentage Error)

### TC-FCST-012: Edit Forecast - Manual Adjustment
**Steps:**
1. Click "Edit" on forecast
2. Change forecasted quantity
3. Add note: "Adjusted for promotion"
4. Save
**Expected:** Forecast updated with manual value

### TC-FCST-013: Delete Forecast
**Steps:**
1. Click "Delete" on forecast
2. Confirm
**Expected:** Forecast deleted

### TC-FCST-014: Regenerate Forecasts
**Steps:**
1. Generate forecast
2. Wait 1 month, new sales data available
3. Click "Regenerate"
**Expected:** New forecasts created with updated historical data

### TC-FCST-015: Purchase Forecasts - View
**Steps:**
1. Navigate to `/forecasting/purchase`
**Expected:** Shows suggested purchase quantities based on sales forecasts and current inventory

### TC-FCST-016: Purchase Forecasts - Calculation
**Steps:**
1. Sales forecast: 1000 units
2. Recipe requires 400L concentrate per 1000 units
3. Current stock: 100L
**Expected:** Suggested purchase: 300L (400 - 100)

### TC-FCST-017: Purchase Forecasts - Create PO from Suggestion
**Steps:**
1. View purchase suggestions
2. Click "Create PO" for item
3. Redirects to PO form with item pre-filled
**Expected:** PO form pre-populated with suggested quantity

### TC-FCST-018: Forecast Chart Visualization
**Steps:**
1. View forecasts page
**Expected:** Shows line chart with historical sales and forecasted values

### TC-FCST-019: Forecast Comparison - Multiple SKUs
**Steps:**
1. Select multiple SKUs
2. View comparison chart
**Expected:** Chart shows forecasts for all selected SKUs

### TC-FCST-020: Forecast Export
**Steps:**
1. View forecasts
2. Click "Export Excel"
**Expected:** Excel with SKU, Month, Forecasted, Actual, Accuracy columns

---

## MODULE 15: REPORTS & ANALYTICS (30 Test Cases)

### TC-RPT-001: View Reports Hub
**Steps:**
1. Navigate to `/reports`
**Expected:** Page shows links to all report types:
- Inventory Reports
- Sales Reports
- Purchase Reports
- Production Reports

### TC-RPT-002: Inventory Report - Current Stock Levels
**Steps:**
1. Navigate to `/reports/inventory`
2. Select Report Type: "Stock Levels"
3. Select Warehouse: "All"
4. Click "Generate Report"
**Expected:** Table shows:
- Item Code, Name, Category
- Warehouse
- Quantity, Unit
- Unit Cost, Total Value

### TC-RPT-003: Inventory Report - Filter by Warehouse
**Steps:**
1. Select Warehouse: "WH-MAIN"
2. Generate report
**Expected:** Shows inventory for WH-MAIN only

### TC-RPT-004: Inventory Report - Filter by Category
**Steps:**
1. Select Category: "Raw Material"
2. Generate report
**Expected:** Shows raw material inventory only

### TC-RPT-005: Inventory Report - Stock Valuation
**Steps:**
1. Select Report Type: "Valuation"
2. Generate report
**Expected:** Shows:
- Total inventory value
- Value by category (pie chart)
- Value by warehouse (bar chart)
- Detailed item-wise valuation table

### TC-RPT-006: Inventory Report - Stock Movement
**Steps:**
1. Select Report Type: "Movement"
2. Select Date Range: Last 30 days
3. Generate report
**Expected:** Shows:
- Receipts (quantity in)
- Issues (quantity out)
- Adjustments
- Transfers
- Net change by item

### TC-RPT-007: Inventory Report - Low Stock Items
**Steps:**
1. Select Report Type: "Low Stock"
2. Generate report
**Expected:** Shows items where current stock < min stock quantity with suggested reorder quantities

### TC-RPT-008: Inventory Report - Expiring Items
**Steps:**
1. Select Report Type: "Expiring"
2. Days threshold: 30
3. Generate report
**Expected:** Shows batches expiring within 30 days

### TC-RPT-009: Inventory Report - Export Excel
**Steps:**
1. Generate any inventory report
2. Click "Export Excel"
**Expected:** Excel file downloads with all report data

### TC-RPT-010: Inventory Report - Export PDF
**Steps:**
1. Generate report
2. Click "Export PDF"
**Expected:** PDF downloads with formatted tables and charts

### TC-RPT-011: Sales Report - Summary
**Steps:**
1. Navigate to `/reports/sales`
2. Select Report Type: "Summary"
3. Select Date Range: This Month
4. Click "Generate Report"
**Expected:** Shows:
- Total orders count
- Total sales amount
- Total quantity sold
- Average order value
- Top 10 selling SKUs
- Sales trend chart

### TC-RPT-012: Sales Report - By SKU
**Steps:**
1. Select Report Type: "By SKU"
2. Generate report
**Expected:** Table shows:
- SKU Code, Name
- Quantity Sold
- Total Revenue
- Average Price
- Number of Orders

### TC-RPT-013: Sales Report - By Customer
**Steps:**
1. Select Report Type: "By Customer"
2. Generate report
**Expected:** Shows:
- Customer Name
- Total Orders
- Total Amount
- Average Order Value

### TC-RPT-014: Sales Report - Filter by Date Range
**Steps:**
1. Select Start Date: 2024-01-01
2. Select End Date: 2024-01-31
3. Generate report
**Expected:** Shows sales data for January only

### TC-RPT-015: Sales Report - Filter by Customer
**Steps:**
1. Select Customer from dropdown
2. Generate report
**Expected:** Shows sales for selected customer only

### TC-RPT-016: Sales Report - Slow Moving Items
**Steps:**
1. Select Report Type: "Slow Moving"
2. Days threshold: 90
3. Generate report
**Expected:** Shows SKUs with no sales in last 90 days or very low sales velocity

### TC-RPT-017: Sales Report - Export Excel
**Steps:**
1. Generate sales report
2. Click "Export Excel"
**Expected:** Excel downloads

### TC-RPT-018: Sales Report - Export PDF
**Steps:**
1. Click "Export PDF"
**Expected:** PDF with sales charts and tables

### TC-RPT-019: Purchase Report - Summary
**Steps:**
1. Navigate to `/reports/purchases`
2. Select Report Type: "Summary"
3. Select Date Range
4. Generate report
**Expected:** Shows:
- Total POs count
- Total purchase amount
- Average PO value
- Top suppliers
- Purchase trend chart

### TC-RPT-020: Purchase Report - By Supplier
**Steps:**
1. Select Report Type: "By Supplier"
2. Generate report
**Expected:** Shows:
- Supplier Name
- PO Count
- Total Amount
- Items Purchased
- Average Lead Time

### TC-RPT-021: Purchase Report - By Item
**Steps:**
1. Select Report Type: "By Item"
2. Generate report
**Expected:** Shows:
- Item Code, Name
- Quantity Purchased
- Total Cost
- Suppliers (comma-separated)

### TC-RPT-022: Purchase Report - Filter by Supplier
**Steps:**
1. Select Supplier
2. Generate report
**Expected:** Shows purchases from selected supplier only

### TC-RPT-023: Purchase Report - Export Excel
**Steps:**
1. Generate report
2. Export Excel
**Expected:** Excel downloads

### TC-RPT-024: Purchase Report - Export PDF
**Steps:**
1. Export PDF
**Expected:** PDF downloads

### TC-RPT-025: Production Report - Summary
**Steps:**
1. Navigate to `/reports/production`
2. Select Date Range
3. Generate report
**Expected:** Shows:
- Total batches completed
- Total quantity produced
- Average yield %
- Total waste quantity
- Production by SKU (chart)

### TC-RPT-026: Production Report - Yield Analysis
**Steps:**
1. Select Report Type: "Yield Analysis"
2. Generate report
**Expected:** Shows:
- Batch Number
- SKU
- Target Quantity
- Actual Quantity
- Yield %
- Waste %
- Color-coded yield (green >95%, yellow 90-95%, red <90%)

### TC-RPT-027: Production Report - Waste Analysis
**Steps:**
1. Select Report Type: "Waste Analysis"
2. Generate report
**Expected:** Shows:
- Total waste by SKU
- Waste percentage
- Waste cost (quantity × material cost)
- Trends over time

### TC-RPT-028: Production Report - Efficiency Metrics
**Steps:**
1. Select Report Type: "Efficiency"
2. Generate report
**Expected:** Shows:
- Batches completed on time
- Average production time
- Material utilization %
- Top performing SKUs

### TC-RPT-029: Production Report - Export Excel
**Steps:**
1. Generate report
2. Export Excel
**Expected:** Excel downloads

### TC-RPT-030: Production Report - Export PDF
**Steps:**
1. Export PDF
**Expected:** PDF with production charts and metrics

---

## MODULE 16: NAVIGATION & UI (20 Test Cases)

### TC-NAV-001: Sidebar Navigation - Dashboard
**Steps:**
1. Click "Dashboard" in sidebar
**Expected:** Navigate to `/dashboard`

### TC-NAV-002: Sidebar Navigation - Items
**Steps:**
1. Click "Items" in sidebar
**Expected:** Navigate to `/items`

### TC-NAV-003: Sidebar Navigation - All Menu Items
**Steps:**
1. Click each menu item:
   - Dashboard
   - Items
   - SKUs
   - Recipes
   - Warehouses
   - Suppliers
   - Customers
   - Inventory
   - Purchase Orders
   - Production
   - Customer Orders
   - Forecasting
   - Reports
**Expected:** Each navigates to correct page

### TC-NAV-004: Sidebar - Active State Highlighting
**Steps:**
1. Navigate to `/items`
2. Check sidebar
**Expected:** "Items" menu item highlighted/active

### TC-NAV-005: Sidebar - Collapse/Expand (if implemented)
**Steps:**
1. Click collapse button
**Expected:** Sidebar collapses to icons only

### TC-NAV-006: Breadcrumbs Navigation
**Steps:**
1. Navigate to `/purchase-orders/[id]`
2. Check breadcrumbs
**Expected:** Shows "Home > Purchase Orders > PO-0001"

### TC-NAV-007: Back Button
**Steps:**
1. Navigate from list to details page
2. Click "Back" button
**Expected:** Returns to list page

### TC-NAV-008: Logo Click - Home Navigation
**Steps:**
1. Click company logo in header
**Expected:** Navigate to `/dashboard`

### TC-NAV-009: User Profile Dropdown
**Steps:**
1. Click user name/avatar in header
**Expected:** Dropdown shows:
- User name and email
- Logout button

### TC-NAV-010: Toast Notification Display
**Steps:**
1. Create new item
2. Check top-right corner
**Expected:** Success toast appears with message "Item created successfully"

### TC-NAV-011: Toast Auto-Dismiss
**Steps:**
1. Trigger success toast
2. Wait 3 seconds
**Expected:** Toast auto-dismisses

### TC-NAV-012: Toast Manual Dismiss
**Steps:**
1. Trigger toast
2. Click "X" button
**Expected:** Toast dismisses immediately

### TC-NAV-013: Multiple Toasts Queue
**Steps:**
1. Trigger 3 toasts in quick succession
**Expected:** All 3 toasts visible, stacked vertically

### TC-NAV-014: Loading Spinner - API Call
**Steps:**
1. Navigate to page with API call
2. Observe loading state
**Expected:** Spinner shows while loading

### TC-NAV-015: Loading Spinner - Button
**Steps:**
1. Click "Create" button
2. Observe button during API call
**Expected:** Button shows spinner, text changes to "Creating..."

### TC-NAV-016: Modal Open Animation
**Steps:**
1. Click "New Item"
**Expected:** Modal opens with fade-in animation

### TC-NAV-017: Modal Close - X Button
**Steps:**
1. Open modal
2. Click "X" button
**Expected:** Modal closes

### TC-NAV-018: Modal Close - Click Outside
**Steps:**
1. Open modal
2. Click on backdrop/overlay
**Expected:** Modal closes

### TC-NAV-019: Modal Close - Escape Key
**Steps:**
1. Open modal
2. Press "Escape" key
**Expected:** Modal closes

### TC-NAV-020: Responsive Design - Mobile View
**Steps:**
1. Resize browser to 375px width (mobile)
**Expected:**
- Sidebar becomes hamburger menu
- Tables scroll horizontally
- Forms stack vertically
- Buttons full-width

---

## MODULE 17: ERROR HANDLING & EDGE CASES (30 Test Cases)

### TC-ERR-001: Network Error - API Unreachable
**Steps:**
1. Stop backend server
2. Try to load items page
**Expected:** Error message "Unable to connect to server. Please try again."

### TC-ERR-002: API Error - 500 Internal Server Error
**Steps:**
1. Trigger server error (invalid data)
2. Submit form
**Expected:** Error toast "Something went wrong. Please try again later."

### TC-ERR-003: API Error - 404 Not Found
**Steps:**
1. Navigate to `/items/999999` (non-existent ID)
**Expected:** Error message "Item not found" or redirect to list

### TC-ERR-004: Validation Error - Client Side
**Steps:**
1. Enter negative quantity in form
2. Try to submit
**Expected:** Error shown immediately, form not submitted

### TC-ERR-005: Validation Error - Server Side
**Steps:**
1. Bypass client validation (browser dev tools)
2. Submit invalid data
**Expected:** Server returns error, user sees message

### TC-ERR-006: Form Error Display
**Steps:**
1. Submit form with multiple errors
**Expected:** Each field shows error message below input

### TC-ERR-007: Duplicate Entry Error
**Steps:**
1. Create item with code "TEST-001"
2. Try to create another with same code
**Expected:** Error "Item code already exists"

### TC-ERR-008: Foreign Key Constraint Error
**Steps:**
1. Try to delete warehouse with inventory
**Expected:** Error "Cannot delete warehouse. It has associated inventory records."

### TC-ERR-009: Session Expired Error
**Steps:**
1. Login
2. Wait for token to expire (or manually expire)
3. Try to perform action
**Expected:** Redirect to login with message "Session expired. Please login again."

### TC-ERR-010: Concurrent Update Conflict
**Steps:**
1. User A opens item edit form
2. User B edits and saves same item
3. User A tries to save
**Expected:** Error "This record was modified by another user. Please refresh and try again."

### TC-ERR-011: File Upload - Wrong Format
**Steps:**
1. Try to upload .txt file in bulk upload
**Expected:** Error "Invalid file format. Only .xlsx files are supported."

### TC-ERR-012: File Upload - File Too Large
**Steps:**
1. Upload file >10MB
**Expected:** Error "File size exceeds limit (10MB max)"

### TC-ERR-013: File Upload - Corrupted File
**Steps:**
1. Upload corrupted Excel file
**Expected:** Error "Unable to read file. File may be corrupted."

### TC-ERR-014: Empty State - No Data
**Steps:**
1. Navigate to page with no data
**Expected:** Shows empty state with message and "Add New" button

### TC-ERR-015: Search - No Results
**Steps:**
1. Search for non-existent item
**Expected:** Shows "No items found matching your search"

### TC-ERR-016: Filter - No Results
**Steps:**
1. Apply filters that return no results
**Expected:** Shows "No items match the selected filters"

### TC-ERR-017: Date Validation - End Before Start
**Steps:**
1. Start Date: 2024-01-31
2. End Date: 2024-01-01
3. Try to generate report
**Expected:** Error "End date must be after start date"

### TC-ERR-018: Number Validation - Negative Value
**Steps:**
1. Enter quantity: -10
**Expected:** Error "Quantity must be positive"

### TC-ERR-019: Number Validation - Decimal Precision
**Steps:**
1. Enter price: 10.123456
**Expected:** Rounded to 2 decimal places: 10.12

### TC-ERR-020: Required Field - Empty Submit
**Steps:**
1. Leave required field empty
2. Submit form
**Expected:** Error "This field is required"

### TC-ERR-021: Email Validation - Invalid Format
**Steps:**
1. Enter email: "notanemail"
**Expected:** Error "Invalid email format"

### TC-ERR-022: Phone Validation - Invalid Format
**Steps:**
1. Enter phone: "abc123"
**Expected:** Error "Invalid phone number"

### TC-ERR-023: Unit Conversion - Incompatible Units
**Steps:**
1. Try to convert KG to L
**Expected:** Error "Cannot convert between different unit types (mass vs volume)"

### TC-ERR-024: FIFO - Insufficient Stock
**Steps:**
1. Required: 100 units
2. Available: 50 units
3. Try to issue materials
**Expected:** Error "Insufficient stock. Available: 50, Required: 100"

### TC-ERR-025: FIFO - No Batches Available
**Steps:**
1. Item has zero inventory
2. Try to issue materials
**Expected:** Error "No inventory batches available for item"

### TC-ERR-026: Recipe - No Active Recipe
**Steps:**
1. Try to create production batch for SKU with no recipe
**Expected:** Error "No active recipe found for this SKU"

### TC-ERR-027: MOQ Violation
**Steps:**
1. Item MOQ = 100
2. Enter quantity: 50
3. Try to add to PO
**Expected:** Error "Quantity must be at least 100 (MOQ)"

### TC-ERR-028: Stock Availability - Order Confirmation
**Steps:**
1. Order requires 100 units
2. Available: 40 units
3. Try to confirm order
**Expected:** Warning "Insufficient stock. Available: 40, Required: 100. Confirm anyway?"

### TC-ERR-029: Batch Expiry - Using Expired Batch
**Steps:**
1. Batch expired yesterday
2. FIFO tries to use it
**Expected:** Warning "Batch BATCH-001 has expired. Use anyway?" (or skip automatically)

### TC-ERR-030: React Error Boundary
**Steps:**
1. Trigger React component error (intentionally break component)
**Expected:** Error boundary catches error, shows:
- "Something went wrong"
- Error details (dev mode only)
- "Reset" button to recover

---

## SUMMARY & TEST EXECUTION NOTES

### Total Test Cases by Module:
1. Authentication & Authorization: 10
2. Dashboard: 10
3. Items Management: 25
4. Bulk Upload: 15
5. SKUs Management: 12
6. Recipes / QPS: 20
7. Warehouses: 10
8. Suppliers: 10
9. Customers: 10
10. Inventory: 25
11. Purchase Orders: 30
12. Production: 35
13. Customer Orders & Sales: 30
14. Forecasting: 20
15. Reports & Analytics: 30
16. Navigation & UI: 20
17. Error Handling & Edge Cases: 30

**TOTAL: 342 Test Cases** (exceeds 200 as requested)

### Test Execution Priority:
**P0 (Critical):** Authentication, Create/Edit/Delete operations, FIFO logic, Inventory updates
**P1 (High):** Workflows (PO→Receipt, Production, Sales), Reports
**P2 (Medium):** Filters, Search, Validations
**P3 (Low):** UI/UX, Edge cases, Performance

### Automation Recommendations:
- **API Tests:** Use Postman/Newman or Jest for API endpoint testing
- **UI Tests:** Use Playwright or Cypress for E2E automation
- **Unit Tests:** Jest for business logic (FIFO, forecasting, conversions)
- **Performance Tests:** JMeter for load testing (bulk operations)

### Test Data Requirements:
- 50+ Items (raw materials, packaging, finished goods)
- 10+ SKUs
- 5+ Recipe versions
- 3+ Warehouses
- 10+ Suppliers
- 10+ Customers
- 100+ Inventory batches
- Historical sales data (6 months minimum for forecasting)

### Known Limitations:
1. Expired batch handling in FIFO (needs verification)
2. Negative inventory allowed in adjustments
3. Concurrent update handling
4. Large file upload performance
5. Search/filter pagination for >1000 records

---

**Document Version:** 1.0
**Created:** 2024
**Status:** Ready for Test Execution
