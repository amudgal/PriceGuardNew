#!/bin/bash
# Script to update Netlify configuration and backend CORS

set -e

AWS_REGION="us-east-1"
NETLIFY_DOMAIN="https://aaires.netlify.app"

echo "🔧 Updating backend CORS to allow Netlify domain..."
echo ""

# Update ALLOWED_ORIGINS in Secrets Manager
echo "📝 Updating ALLOWED_ORIGINS secret..."
aws secretsmanager update-secret \
  --secret-id priceguard/allowed-origins-yBKnxy \
  --secret-string "https://aaires.netlify.app,http://localhost:3000" \
  --region $AWS_REGION \
  --query 'ARN' \
  --output text

echo "✅ ALLOWED_ORIGINS updated"
echo ""

# Get backend public IP
echo "📊 Getting backend public IP..."
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region $AWS_REGION \
  --query 'taskArns[0]' \
  --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
  echo "❌ No running tasks found"
  exit 1
fi

NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region $AWS_REGION \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region $AWS_REGION \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
  echo "❌ No public IP found for task"
  exit 1
fi

BACKEND_URL="http://$PUBLIC_IP:4000"

echo "✅ Backend URL: $BACKEND_URL"
echo ""

# Restart ECS service to apply CORS changes
echo "🔄 Restarting ECS service to apply CORS changes..."
aws ecs update-service \
  --cluster priceguard-cluster \
  --service priceguard-server \
  --force-new-deployment \
  --region $AWS_REGION \
  --query 'service.{status:status,runningCount:runningCount,desiredCount:desiredCount}' \
  --output json

echo ""
echo "✅ Service restarted. Wait 2-3 minutes for tasks to start."
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set Netlify environment variable:"
echo "   - Go to: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables"
echo "   - Add variable:"
echo "     Key: VITE_API_BASE_URL"
echo "     Value: $BACKEND_URL"
echo ""
echo "2. Redeploy Netlify site:"
echo "   - Go to: https://app.netlify.com/sites/aaires/deploys"
echo "   - Click 'Trigger deploy' → 'Deploy site'"
echo ""
echo "3. Test the connection:"
echo "   - Visit: $NETLIFY_DOMAIN"
echo "   - Try to log in"
echo "   - Check browser console for errors"
echo ""
echo "4. Monitor backend logs:"
echo "   aws logs tail /ecs/priceguard-server --follow --region $AWS_REGION"
echo ""
echo "⚠️  Note: Using the task's public IP is temporary. For production, set up an ALB for a stable URL."

