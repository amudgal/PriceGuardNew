#!/bin/bash
# Deployment script using GitHub Actions (no Docker required locally)

set -e

# Configuration
GITHUB_REPO="amudgal/PriceGuard"
GITHUB_BRANCH="main"

echo "🚀 Triggering deployment via GitHub Actions..."
echo ""
echo "This will trigger the GitHub Actions workflow to:"
echo "  1. Build Docker image"
echo "  2. Push to ECR"
echo "  3. Update ECS task definition"
echo "  4. Deploy to ECS service"
echo ""
echo "⚠️  Prerequisites:"
echo "  - GitHub Secrets configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
echo "  - GitHub Actions workflow enabled"
echo "  - AWS resources created (ECR, ECS cluster, ECS service)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Not in a git repository"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "$GITHUB_BRANCH" ]; then
  echo "⚠️  Current branch is '$CURRENT_BRANCH', not '$GITHUB_BRANCH'"
  echo "Switching to '$GITHUB_BRANCH' branch..."
  git checkout $GITHUB_BRANCH
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  You have uncommitted changes"
  echo "Committing changes..."
  git add .
  git commit -m "Trigger deployment to AWS ECS" || true
fi

# Push to trigger GitHub Actions
echo "📤 Pushing to GitHub to trigger deployment..."
git push origin $GITHUB_BRANCH

echo ""
echo "✅ Push complete!"
echo ""
echo "📊 Monitor deployment:"
echo "  - GitHub Actions: https://github.com/$GITHUB_REPO/actions"
echo "  - AWS ECS Console: https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server"
echo ""
echo "⏳ Deployment typically takes 5-10 minutes"
echo "💡 Check GitHub Actions for deployment progress"

