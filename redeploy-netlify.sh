#!/bin/bash
# Script to trigger Netlify redeploy
# Option 1: Via Netlify API (requires NETLIFY_AUTH_TOKEN)
# Option 2: Via git push (if auto-deploy is enabled)

set -e

NETLIFY_SITE_ID="aaires"
NETLIFY_AUTH_TOKEN="${NETLIFY_AUTH_TOKEN:-}"

echo "🚀 Triggering Netlify Redeploy..."
echo ""

# Option 1: Via Netlify API (if token is available)
if [ -n "$NETLIFY_AUTH_TOKEN" ]; then
  echo "📡 Triggering redeploy via Netlify API..."
  
  # Get site ID from site name
  SITE_ID=$(curl -s -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
    "https://api.netlify.com/api/v1/sites?name=$NETLIFY_SITE_ID" \
    | jq -r '.[0].site_id' 2>/dev/null || echo "")
  
  if [ -n "$SITE_ID" ] && [ "$SITE_ID" != "null" ]; then
    echo "Site ID: $SITE_ID"
    
    # Trigger build
    BUILD_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $NETLIFY_AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.netlify.com/api/v1/sites/$SITE_ID/builds" \
      | jq -r '.state' 2>/dev/null || echo "")
    
    if [ -n "$BUILD_RESPONSE" ]; then
      echo "✅ Redeploy triggered successfully!"
      echo ""
      echo "📊 Monitor deployment:"
      echo "https://app.netlify.com/sites/$NETLIFY_SITE_ID/deploys"
      exit 0
    fi
  fi
  
  echo "⚠️  Failed to trigger via API. Trying git push method..."
fi

# Option 2: Via git push (triggers auto-deploy if enabled)
echo "📤 Triggering redeploy via git push..."
echo ""

# Make a small commit to trigger deploy
cd /Users/amitmudgal/Documents/Setup_for_Business/Boilerplate/WebProject/priceguard

# Create a trigger file if it doesn't exist
TIMESTAMP=$(date +%Y%m%d%H%M%S)
echo "Redeploy triggered at $(date)" > .netlify-redeploy-trigger

# Stage and commit
git add .netlify-redeploy-trigger 2>/dev/null || true

# Check if there are changes
if git diff --cached --quiet 2>/dev/null; then
  echo "⚠️  No changes to commit. Making an empty commit..."
  git commit --allow-empty -m "Trigger Netlify redeploy - $(date +%Y-%m-%d\ %H:%M:%S)" 2>/dev/null || {
    echo "❌ Failed to create commit. Manual redeploy required."
    echo ""
    echo "📋 Manual Redeploy Instructions:"
    echo "1. Go to: https://app.netlify.com/sites/$NETLIFY_SITE_ID/deploys"
    echo "2. Click 'Trigger deploy' → 'Deploy site'"
    exit 1
  }
else
  git commit -m "Trigger Netlify redeploy - $(date +%Y-%m-%d\ %H:%M:%S)" 2>/dev/null || {
    echo "❌ Failed to create commit. Manual redeploy required."
    exit 1
  }
fi

# Push to trigger auto-deploy
echo "📤 Pushing to git..."
git push origin main 2>/dev/null || git push origin master 2>/dev/null || {
  echo "⚠️  Failed to push to git. Manual redeploy required."
  echo ""
  echo "📋 Manual Redeploy Instructions:"
  echo "1. Go to: https://app.netlify.com/sites/$NETLIFY_SITE_ID/deploys"
  echo "2. Click 'Trigger deploy' → 'Deploy site'"
  echo ""
  echo "Or push manually:"
  echo "  git push origin main"
  exit 1
}

echo "✅ Git push successful! Netlify should auto-deploy."
echo ""
echo "📊 Monitor deployment:"
echo "https://app.netlify.com/sites/$NETLIFY_SITE_ID/deploys"

