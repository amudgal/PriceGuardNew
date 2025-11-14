#!/bin/bash
# Script to help set Netlify environment variable and trigger redeploy

set -e

AWS_REGION="us-east-1"
NETLIFY_SITE="aaires"

echo "🔧 Netlify Environment Variable Setup"
echo ""

# Get backend public IP
echo "📊 Getting backend public IP..."
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text 2>/dev/null || echo "None")

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ No running tasks found. Backend may not be running."
  exit 1
fi

NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region $AWS_REGION \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text 2>/dev/null || echo "None")

if [ "$NETWORK_INTERFACE" == "None" ] || [ -z "$NETWORK_INTERFACE" ]; then
  echo "❌ No network interface found."
  exit 1
fi

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region $AWS_REGION \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text 2>/dev/null || echo "None")

if [ "$PUBLIC_IP" == "None" ] || [ -z "$PUBLIC_IP" ]; then
  echo "❌ No public IP found for task."
  exit 1
fi

BACKEND_URL="http://${PUBLIC_IP}:4000"

echo "✅ Backend URL: $BACKEND_URL"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Set Environment Variable in Netlify:"
echo "   https://app.netlify.com/sites/$NETLIFY_SITE/settings/deploys#environment-variables"
echo ""
echo "   Add variable:"
echo "   - Key: VITE_API_BASE_URL"
echo "   - Value: $BACKEND_URL"
echo "   - Scopes: ✅ Production ✅ Preview ✅ Deploy previews"
echo ""
echo "2. Trigger New Deployment:"
echo "   https://app.netlify.com/sites/$NETLIFY_SITE/deploys"
echo "   Click 'Trigger deploy' → 'Deploy site'"
echo ""
echo "3. Wait for deployment to complete (1-2 minutes)"
echo ""
echo "4. Test the site:"
echo "   https://$NETLIFY_SITE.netlify.app"
echo ""
echo "⚠️  Important: The environment variable MUST be set BEFORE the build."
echo "   If you set it after a deployment, you need to trigger a new deployment."
echo ""
echo "📊 Monitor deployment:"
echo "https://app.netlify.com/sites/$NETLIFY_SITE/deploys"

