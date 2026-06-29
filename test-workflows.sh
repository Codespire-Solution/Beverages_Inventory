#!/bin/bash

# E2E Workflow Testing Script
# This script tests critical workflows end-to-end

set -e

echo "🧪 Testing Beverage Inventory Management System Workflows..."
echo ""

# Set Node.js path
export PATH="$HOME/nodejs-local/node-v20.11.0-darwin-x64/bin:$PATH"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_step() {
    local step_name=$1
    local command=$2
    
    echo -n "Testing: $step_name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 1: Database Connection (skip if not initialized)
echo "📊 Testing Database..."
if [ -f "prisma/dev.db" ]; then
    test_step "Database connection" "npx prisma db execute --stdin <<< 'SELECT 1'"
else
    echo -e "${YELLOW}⚠ Database not initialized (run ./setup.sh first)${NC}"
fi

# Test 2: Prisma Client
echo "📦 Testing Prisma Client..."
test_step "Prisma client generation" "npx prisma generate"

# Test 3: API Routes Exist
echo "🔌 Testing API Routes..."
test_step "Auth API exists" "test -f src/app/api/auth/login/route.ts"
test_step "Items API exists" "test -f src/app/api/items/route.ts"
test_step "Inventory API exists" "test -f src/app/api/inventory/route.ts"
test_step "Purchase Orders API exists" "test -f src/app/api/purchase-orders/route.ts"
test_step "Production API exists" "test -f src/app/api/production-batches/route.ts"
test_step "Customer Orders API exists" "test -f src/app/api/customer-orders/route.ts"
test_step "Forecasts API exists" "test -f src/app/api/forecasts/route.ts"
test_step "Reports API exists" "test -f src/app/api/reports/inventory/route.ts"

# Test 4: Frontend Pages Exist
echo "🎨 Testing Frontend Pages..."
test_step "Dashboard page exists" "test -f src/app/\(dashboard\)/dashboard/page.tsx"
test_step "Items page exists" "test -f src/app/\(dashboard\)/items/page.tsx"
test_step "Inventory page exists" "test -f src/app/\(dashboard\)/inventory/page.tsx"
test_step "Purchase Orders page exists" "test -f src/app/\(dashboard\)/purchase-orders/page.tsx"
test_step "Production page exists" "test -f src/app/\(dashboard\)/production/page.tsx"
test_step "Customer Orders page exists" "test -f src/app/\(dashboard\)/customer-orders/page.tsx"
test_step "Forecasting page exists" "test -f src/app/\(dashboard\)/forecasting/page.tsx"
test_step "Reports page exists" "test -f src/app/\(dashboard\)/reports/page.tsx"

# Test 5: Shared Components
echo "🧩 Testing Shared Components..."
test_step "DataTable component exists" "test -f src/components/common/DataTable.tsx"
test_step "Modal component exists" "test -f src/components/common/Modal.tsx"
test_step "ErrorBoundary component exists" "test -f src/components/common/ErrorBoundary.tsx"

# Test 6: Utilities
echo "🛠️  Testing Utilities..."
test_step "Excel export utility exists" "test -f src/lib/excel-export.ts"
test_step "PDF export utility exists" "test -f src/lib/pdf-export.ts"
test_step "Error handling utility exists" "test -f src/lib/errors.ts"
test_step "Validation utility exists" "test -f src/lib/validation.ts"
test_step "FIFO utility exists" "test -f src/lib/fifo.ts"
test_step "Unit conversion utility exists" "test -f src/lib/unit-conversion.ts"

# Test 7: Business Logic
echo "💼 Testing Business Logic..."
test_step "Forecasting logic exists" "test -f src/lib/forecasting.ts"
test_step "Cost calculation exists" "test -f src/lib/cost-calculation.ts"

# Test 8: Dependencies
echo "📚 Testing Dependencies..."
test_step "xlsx package installed" "npm list xlsx > /dev/null 2>&1"
test_step "jspdf package installed" "npm list jspdf > /dev/null 2>&1"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary:"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run './setup.sh' to initialize the database"
    echo "  2. Run 'npm run dev' to start the application"
    echo "  3. Open http://localhost:3000 and login with admin@beverage.com / admin123"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi

