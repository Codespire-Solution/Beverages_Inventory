#!/bin/bash

# Beverage Inventory Setup Script
# This script sets up the database and seeds initial data

set -e

echo "🚀 Setting up Beverage Inventory Management System..."
echo ""

# Set Node.js path
export PATH="$HOME/nodejs-local/node-v20.11.0-darwin-x64/bin:$PATH"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please ensure Node.js is installed."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
if npx prisma generate; then
    echo "✅ Prisma Client generated successfully"
else
    echo "⚠️  Prisma generation failed. This might be a temporary CDN issue."
    echo "    Please wait a few minutes and try running: npx prisma generate"
    exit 1
fi
echo ""

# Push database schema
echo "🗄️  Setting up database..."
if npx prisma db push --accept-data-loss; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Database setup failed"
    exit 1
fi
echo ""

# Seed database
echo "🌱 Seeding database with initial data..."
if npm run db:seed; then
    echo "✅ Database seeded successfully"
else
    echo "❌ Database seeding failed"
    exit 1
fi
echo ""

echo "🎉 Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Run 'npm run dev' to start the development server"
echo "   2. Open http://localhost:3000 in your browser"
echo "   3. Login with: admin@beverage.com / admin123"
echo ""

