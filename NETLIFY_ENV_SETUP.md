# Netlify Environment Variable Setup

## Quick Setup Guide

### Step 1: Set Environment Variable in Netlify

**Go to:** https://app.netlify.com/sites/aaires/settings/deploys#environment-variables

**Add/Update Variable:**
- **Key:** `VITE_API_BASE_URL`
- **Value:** `http://54.227.2.67:4000` (current backend IP - verify before setting)
- **Scopes:** ✅ Production ✅ Preview ✅ Deploy previews

**Click "Save"**

### Step 2: Get Current Backend IP

The backend IP may change if ECS tasks restart. Get the current IP:

```bash
cd server
./set-netlify-env.sh
```

Or manually:

```bash
TASK_ARN=$(aws ecs list-tasks \
  --cluster priceguard-cluster \
  --service-name priceguard-server \
  --desired-status RUNNING \
  --region us-east-1 \
  --query 'taskArns[0]' \
  --output text)

NETWORK_INTERFACE=$(aws ecs describe-tasks \
  --cluster priceguard-cluster \
  --tasks $TASK_ARN \
  --region us-east-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $NETWORK_INTERFACE \
  --region us-east-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo "Backend URL: http://$PUBLIC_IP:4000"
```

### Step 3: Trigger New Deployment

**After setting the variable, you MUST trigger a new deployment:**

1. Go to: https://app.netlify.com/sites/aaires/deploys
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for deployment to complete (1-2 minutes)

### Step 4: Verify

1. Visit: https://aaires.netlify.app
2. Open browser console (F12) → Network tab
3. Try to log in
4. Verify requests go to the backend IP, not `localhost:4000`

## Important Notes

⚠️ **The environment variable MUST be set BEFORE the build.**
- Setting it after a deployment won't work until you trigger a new deployment
- Each deployment rebuilds with current environment variables

⚠️ **Backend IP May Change**
- If ECS tasks restart, the IP may change
- Update `VITE_API_BASE_URL` in Netlify if the IP changes
- For production, consider using an Application Load Balancer (ALB) for a stable URL

## Current Configuration

- **Backend URL:** `http://54.227.2.67:4000` (verify current IP)
- **Netlify Site:** `aaires`
- **Environment Variable:** `VITE_API_BASE_URL`

## Troubleshooting

If still seeing `localhost:4000`:
1. Verify variable is set in Netlify dashboard
2. Check latest deployment happened AFTER setting the variable
3. Clear browser cache and hard refresh
4. Check build logs to verify variable was available during build

