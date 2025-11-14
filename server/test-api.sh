#!/bin/bash
# Quick script to test the deployed API

set -e

# Configuration
API_URL="${1:-}"

if [ -z "$API_URL" ]; then
  echo "❌ Please provide API URL as argument"
  echo ""
  echo "Usage:"
  echo "  ./test-api.sh https://your-api-url.amazonaws.com"
  echo ""
  echo "If you don't have an ALB/API Gateway URL yet, you can:"
  echo "  1. Check CloudWatch logs to see if service is running"
  echo "  2. Use ECS Exec to test from inside the container"
  echo "  3. Set up an Application Load Balancer"
  exit 1
fi

echo "🧪 Testing API at: $API_URL"
echo ""

# Test 1: Health Endpoint
echo "1️⃣  Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Health Check: PASSED"
  echo "Response: $BODY" | jq . 2>/dev/null || echo "Response: $BODY"
else
  echo "❌ Health Check: FAILED (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Login Endpoint (with test credentials)
echo "2️⃣  Testing Login Endpoint..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}' \
  2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ Login: SUCCESS"
  echo "Response: $BODY" | jq . 2>/dev/null || echo "Response: $BODY"
elif [ "$HTTP_CODE" == "401" ]; then
  echo "⚠️  Login: UNAUTHORIZED (401 - credentials may not match)"
  echo "Response: $BODY"
else
  echo "❌ Login: FAILED (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
fi
echo ""

# Test 3: Register Endpoint
echo "3️⃣  Testing Register Endpoint..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "TestPass123!",
    "plan": "premium"
  }' \
  2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -1)
BODY=$(echo "$REGISTER_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "201" ]; then
  echo "✅ Register: SUCCESS"
  echo "Response: $BODY" | jq . 2>/dev/null || echo "Response: $BODY"
else
  echo "⚠️  Register: HTTP $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

echo "✅ Testing complete!"
echo ""
echo "📊 View service:"
echo "https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server"

