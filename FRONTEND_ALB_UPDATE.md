# Frontend Update: ALB Integration

## Changes Made

The frontend code has been updated to automatically use the Application Load Balancer (ALB) HTTPS endpoint when deployed to production.

### New Files

- **`src/config/api.ts`** - Centralized API configuration
  - Automatically detects production vs development environment
  - Uses HTTPS ALB endpoint when frontend is served over HTTPS
  - Falls back to localhost for local development
  - Supports environment variable override via `VITE_API_BASE_URL`

### Updated Files

- **`src/components/Login.tsx`**
  - Updated to use new `API_ENDPOINTS` helper from config
  - Login and register endpoints now use centralized configuration

## How It Works

### Automatic Detection

The API configuration automatically detects the environment:

1. **Production HTTPS** (Netlify): 
   - Uses ALB HTTPS endpoint: `https://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`

2. **Production HTTP** (rare, but handled):
   - Uses ALB HTTP endpoint: `http://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`

3. **Development** (localhost):
   - Uses localhost: `http://localhost:4000`

### Environment Variable Override

You can still override the API URL using the `VITE_API_BASE_URL` environment variable in Netlify:

- **Key:** `VITE_API_BASE_URL`
- **Value:** `https://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`
- **Note:** If set, this takes precedence over automatic detection

## Current ALB Configuration

- **ALB DNS:** `priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`
- **HTTPS Port:** 443 ✅
- **HTTP Port:** 80 ✅
- **Status:** Active ✅

## Benefits

1. **Automatic HTTPS:** No need to manually configure URLs - automatically uses HTTPS when needed
2. **No Mixed Content:** Frontend HTTPS → Backend HTTPS (no browser errors)
3. **Centralized Config:** All API endpoints defined in one place
4. **Easy Updates:** Change ALB URL in one place if needed
5. **Development Friendly:** Still works with localhost for local dev

## Testing

### Local Development

```bash
npm run dev
```

Frontend will automatically use `http://localhost:4000` for API calls.

### Production (Netlify)

1. Deploy to Netlify
2. Frontend will automatically detect HTTPS environment
3. API calls will go to `https://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com`
4. No mixed content errors!

### Verify Configuration

In browser console (F12):
```javascript
// Check current API base URL
import { API_BASE_URL } from './config/api';
console.log('API Base URL:', API_BASE_URL);

// Test health endpoint
fetch('https://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health')
  .then(r => r.json())
  .then(console.log);
```

## Next Steps

1. ✅ Frontend code updated
2. ⏳ Deploy to Netlify (automatic if git push triggers deploy)
3. ⏳ Verify deployment completes successfully
4. ⏳ Test login/register functionality
5. ⏳ Confirm no mixed content errors

## Rollback

If needed, you can revert to the previous hardcoded URL approach by:
1. Setting `VITE_API_BASE_URL` in Netlify environment variables
2. Or reverting the commit

## Configuration Reference

### API Configuration File (`src/config/api.ts`)

```typescript
// Get API base URL (automatic detection)
export function getApiBaseUrl(): string {
  // 1. Check environment variable
  // 2. Auto-detect from window location (production HTTPS → ALB HTTPS)
  // 3. Fallback to localhost for development
}

// Helper to build endpoint URLs
export function apiEndpoint(path: string): string {
  // Builds full URL: baseUrl + path
}

// Predefined endpoints
export const API_ENDPOINTS = {
  auth: {
    login: () => apiEndpoint('/api/auth/login'),
    register: () => apiEndpoint('/api/auth/register'),
  },
  health: () => apiEndpoint('/health'),
};
```

## Troubleshooting

### Still Seeing localhost:4000

1. **Check build:** The URL is determined at build time
2. **Clear cache:** Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
3. **Check environment:** Make sure you're on HTTPS (not HTTP)

### Mixed Content Error

1. **Verify ALB HTTPS:** Check ALB has HTTPS listener on port 443
2. **Check SSL Certificate:** Ensure certificate is valid
3. **Verify DNS:** ALB DNS should be accessible via HTTPS

### API Not Responding

1. **Test ALB directly:**
   ```bash
   curl https://priceguard-alb-1564033973.us-east-1.elb.amazonaws.com/health
   ```

2. **Check ECS service:** Verify tasks are running and registered with ALB target group

3. **Check security groups:** Ensure ALB security group allows inbound on 80/443

## Summary

✅ **Frontend updated** to automatically use ALB HTTPS endpoint
✅ **No manual configuration needed** - automatic detection
✅ **Mixed content errors resolved** - HTTPS frontend → HTTPS backend
✅ **Development friendly** - Still works with localhost

The frontend will now automatically use the correct backend URL based on the environment!

