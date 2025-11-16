#!/bin/bash
# Script to restart the backend server with Stripe integration

set -e

cd "$(dirname "$0")"

echo "🔄 Restarting PriceGuard backend server..."
echo ""

# Check if Stripe key is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "⚠️  WARNING: STRIPE_SECRET_KEY is not set!"
  echo "   Set it with: export STRIPE_SECRET_KEY='sk_test_xxxxx'"
  echo ""
fi

# Set default environment variables if not set
export DATABASE_URL="${DATABASE_URL:-postgres://appadmin:Shalini#1357@pg-dev.cy7sig6qo75s.us-east-1.rds.amazonaws.com:5432/appdb}"
export PGSSLMODE="${PGSSLMODE:-require}"
export PGSSLROOTCERT="${PGSSLROOTCERT:-./us-east-1-bundle.pem}"
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5173}"
export PORT="${PORT:-4000}"
export NODE_ENV="${NODE_ENV:-development}"

echo "📋 Environment:"
echo "   PORT: $PORT"
echo "   NODE_ENV: $NODE_ENV"
echo "   ALLOWED_ORIGINS: $ALLOWED_ORIGINS"
echo "   STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:20}..." 
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🚀 Starting server..."
echo "   Server will be available at: http://localhost:$PORT"
echo "   Billing endpoint: http://localhost:$PORT/api/billing/create-setup-intent"
echo ""

npm run dev

