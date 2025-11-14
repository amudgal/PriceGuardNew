# Netlify Setup: Connect Frontend to Backend API

## Problem

The frontend at `https://aaires.netlify.app` is trying to connect to `http://localhost:4000` instead of the deployed backend API, causing CORS errors.

## Solution

### Step 1: Backend CORS Updated ✅

The backend CORS has been updated to allow requests from `https://aaires.netlify.app`.

**Backend URL:** `http://34.235.168.136:4000`

**Note:** This IP address may change if tasks are restarted. For production, set up an Application Load Balancer (ALB) for a stable URL.

### Step 2: Set Netlify Environment Variable

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com
   - Select your site: `aaires`

2. **Navigate to Environment Variables:**
   - Go to: **Site settings** → **Environment variables**
   - Or directly: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables

3. **Add Environment Variable:**
   - Click **Add a variable**
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `http://34.235.168.136:4000`
   - **Scopes:** Select all scopes (Production, Preview, Deploy previews)
   - Click **Save**

4. **Redeploy Site:**
   - Go to: **Deploys** tab
   - Or directly: https://app.netlify.com/sites/aaires/deploys
   - Click **Trigger deploy** → **Deploy site**
   - Wait for deployment to complete

### Step 3: Verify Connection

1. **Visit your site:**
   - Go to: https://aaires.netlify.app

2. **Test login:**
   - Try to log in with your credentials
   - Check browser console (F12) for errors
   - Should no longer see CORS errors

3. **Check backend logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --follow --region us-east-1
   ```

### Step 4: Test API Endpoints

**Test health endpoint:**
```bash
curl http://34.235.168.136:4000/health
```

**Test login endpoint:**
```bash
curl -X POST http://34.235.168.136:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"TestPass123!"}'
```

## Current Configuration

### Frontend (Login.tsx)
```typescript
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";
```

**With environment variable set:**
- Development: Uses `VITE_API_BASE_URL` if set
- Production (Netlify): Uses `VITE_API_BASE_URL` from Netlify environment variables
- Fallback: `http://localhost:4000` (only if not set)

### Backend (index.ts)
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000"];
```

**Current ALLOWED_ORIGINS:**
- `https://aaires.netlify.app`
- `http://localhost:3000`

## Troubleshooting

### CORS Error Still Appears

1. **Check Netlify environment variable:**
   - Verify `VITE_API_BASE_URL` is set correctly
   - Make sure you redeployed after setting the variable
   - Check if the variable is available in the build logs

2. **Check backend CORS:**
   - Verify `ALLOWED_ORIGINS` includes `https://aaires.netlify.app`
   - Check backend logs for CORS errors:
     ```bash
     aws logs tail /ecs/priceguard-server --since 5m --region us-east-1 | grep -i cors
     ```

3. **Check if backend is accessible:**
   ```bash
   curl -v http://34.235.168.136:4000/health
   ```

### Connection Refused

1. **Check if backend is running:**
   ```bash
   aws ecs describe-services \
     --cluster priceguard-cluster \
     --services priceguard-server \
     --region us-east-1 \
     --query 'services[0].{runningCount:runningCount,desiredCount:desiredCount}'
   ```

2. **Check backend logs:**
   ```bash
   aws logs tail /ecs/priceguard-server --since 5m --region us-east-1
   ```

3. **Check security group:**
   - Make sure port 4000 is open
   - Check if requests are reaching the backend

### Backend IP Changed

If the backend IP address changes (after task restart), you'll need to:

1. **Get new IP:**
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

2. **Update Netlify environment variable:**
   - Update `VITE_API_BASE_URL` with the new IP
   - Redeploy site

## Next Steps (Production)

For production, you should:

1. **Set up Application Load Balancer (ALB):**
   - Provides stable DNS name (not IP address)
   - Better security (don't expose ECS tasks directly)
   - Health checks and load balancing
   - HTTPS/SSL certificate support

2. **Set up HTTPS:**
   - Get SSL certificate from AWS Certificate Manager
   - Configure ALB to use HTTPS
   - Update Netlify `VITE_API_BASE_URL` to use HTTPS

3. **Set up custom domain:**
   - Configure custom domain for backend API
   - Update DNS records
   - Update Netlify `VITE_API_BASE_URL` to use custom domain

4. **Improve security:**
   - Don't expose ECS tasks directly to internet
   - Use ALB with security groups
   - Implement rate limiting
   - Add API authentication

## Summary

✅ **Backend CORS updated** to allow `https://aaires.netlify.app`
✅ **Backend URL:** `http://34.235.168.136:4000`
⏳ **Next:** Set `VITE_API_BASE_URL` in Netlify environment variables
⏳ **Next:** Redeploy Netlify site
⏳ **Next:** Test connection

## Resources

- **Netlify Dashboard:** https://app.netlify.com/sites/aaires
- **Environment Variables:** https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
- **Deploys:** https://app.netlify.com/sites/aaires/deploys
- **AWS ECS Console:** https://console.aws.amazon.com/ecs/v2/clusters/priceguard-cluster/services/priceguard-server
- **CloudWatch Logs:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/%2Fecs%2Fpriceguard-server

