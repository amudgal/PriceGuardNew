#!/bin/bash
# Script to trigger GitHub Actions deployment

set -e

echo "🚀 Triggering GitHub Actions deployment..."
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Not in a git repository"
  exit 1
fi

# Get current directory
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  echo "⚠️  Current branch is '$CURRENT_BRANCH', switching to 'main'..."
  git checkout main
fi

# Create a small change to trigger the workflow
echo "# Deployment trigger - $(date)" >> server/.deploy-trigger
git add server/.deploy-trigger
git commit -m "Trigger ECS deployment via GitHub Actions

- GitHub Secrets configured
- Ready to deploy to AWS ECS
- Triggering deployment workflow" || echo "No changes to commit"

# Push to trigger GitHub Actions
echo "📤 Pushing to GitHub to trigger deployment..."
git push origin main

echo ""
echo "✅ Push complete!"
echo ""
echo "📊 Monitor deployment:"
echo "  - GitHub Actions: https://github.com/amudgal/PriceGuard/actions"
echo "  - AWS ECS Console: https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server"
echo ""
echo "⏳ Deployment typically takes 5-10 minutes"
echo "💡 The workflow will:"
echo "   1. Build Docker image"
echo "   2. Push to ECR"
echo "   3. Register ECS task definition"
echo "   4. Create/update ECS service"
echo "   5. Wait for service to stabilize"
echo ""
echo "🔍 Check GitHub Actions for real-time progress"

