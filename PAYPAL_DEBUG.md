# PayPal SDK Loading - Debug Steps

## Current Issue
"Failed to load PayPal SDK. Possible causes: invalid Client ID, network issue, or CORS problem."

## Quick Fixes to Try

### 1. Restart Frontend Server (MOST COMMON FIX)

```bash
# Stop the frontend server (Ctrl+C)
# Then restart:
cd priceguard
npm run dev
```

**Why**: Vite only reads `.env` files when the server starts. If you added `VITE_PAYPAL_CLIENT_ID` after starting the server, it won't be available until you restart.

### 2. Verify Client ID in Browser

1. Open your app: `http://localhost:5173` (or `http://localhost:3000`)
2. Open browser console (F12)
3. Run this command:
   ```javascript
   console.log("Client ID:", import.meta.env.VITE_PAYPAL_CLIENT_ID);
   ```

**Expected**: Should show your Client ID
**If undefined**: Frontend server needs restart

### 3. Test PayPal SDK URL Directly

Open this URL in your browser (replace with your actual Client ID):
```
https://www.paypal.com/sdk/js?client-id=AXx1Lt6dwJix_8-Va_E7YTH5E_-1n8aDUifuFYbCET-5Ae8K2PR9S-_WLqBaS5BLQt_q9BkQNIYC1aEa&currency=USD
```

**Expected**: Should load JavaScript code (not an error page)
**If 404/Error**: Client ID is invalid

### 4. Check Browser Console for Specific Errors

Open DevTools (F12) → Console tab and look for:

- **Network errors**: `Failed to fetch` or `net::ERR_...`
- **CORS errors**: `Access to script... blocked by CORS policy`
- **404 errors**: `Failed to load resource: 404`
- **Script errors**: `Uncaught SyntaxError` or `Uncaught ReferenceError`

### 5. Check Network Tab

1. Open DevTools (F12) → Network tab
2. Filter by "paypal"
3. Look for the SDK request
4. Check:
   - **Status**: Should be 200 (success)
   - **URL**: Should include your Client ID
   - **Response**: Should be JavaScript code

### 6. Verify Client ID Format

Your Client ID: `AXx1Lt6dwJix_8-Va_E7YTH5E_-1n8aDUifuFYbCET-5Ae8K2PR9S-_WLqBaS5BLQt_q9BkQNIYC1aEa`

- ✅ Starts with `A` (valid format)
- ⚠️ Not a sandbox ID (sandbox IDs start with `sb-`)
- ⚠️ Might be a Live/Production ID

**If using Sandbox for testing**, you need a Client ID that starts with `sb-`.

### 7. Check for Ad Blockers

Ad blockers may block PayPal scripts:
- Disable ad blocker for `localhost`
- Try incognito/private mode
- Try different browser

### 8. Check Network Connectivity

```bash
# Test if you can reach PayPal
curl -I https://www.paypal.com/sdk/js

# Should return: HTTP/2 200
```

### 9. Clear Browser Cache

1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### 10. Try Different Browser

- Chrome
- Firefox
- Safari
- Edge

## Diagnostic Commands

### Check if Frontend Server is Running

```bash
# Check if port 5173 is in use (Vite default)
lsof -ti:5173

# Check if port 3000 is in use (your vite.config shows port 3000)
lsof -ti:3000
```

### Verify .env File

```bash
cd priceguard
cat .env | grep VITE_PAYPAL_CLIENT_ID
```

### Test PayPal SDK URL

```bash
curl "https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD" | head -20
```

Should return JavaScript code, not an error.

## Common Solutions

### Solution 1: Restart Frontend (90% of cases)

```bash
# Stop frontend (Ctrl+C)
cd priceguard
npm run dev
```

### Solution 2: Verify Client ID is Valid

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **My Apps & Credentials**
3. Select your app (Sandbox or Live)
4. Copy the **Client ID** exactly
5. Update `priceguard/.env`:
   ```bash
   VITE_PAYPAL_CLIENT_ID=your-exact-client-id-here
   ```
6. Restart frontend

### Solution 3: Use Sandbox Client ID for Testing

If you're testing locally, use a Sandbox Client ID (starts with `sb-`):

1. Go to PayPal Developer Dashboard
2. Make sure you're in **Sandbox** mode
3. Get Sandbox Client ID
4. Update `.env`:
   ```bash
   VITE_PAYPAL_CLIENT_ID=sb-xxxxxxxxx
   ```
5. Restart frontend

### Solution 4: Check for Network Issues

- Disable VPN
- Check firewall settings
- Try different network (mobile hotspot)
- Check if corporate network blocks PayPal

## Still Not Working?

1. **Check browser console** for the exact error message
2. **Check Network tab** to see if request is being made
3. **Share the error details**:
   - Browser console error
   - Network tab status code
   - Client ID format (first 10 characters)

## Quick Test

Run this in browser console on your app page:

```javascript
// Test 1: Check if env variable is loaded
console.log("Client ID:", import.meta.env.VITE_PAYPAL_CLIENT_ID);

// Test 2: Try loading PayPal SDK manually
const script = document.createElement("script");
script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&currency=USD`;
script.onload = () => console.log("✅ PayPal SDK loaded!");
script.onerror = (err) => console.error("❌ Failed:", err);
document.body.appendChild(script);
```

This will help identify if it's an environment variable issue or a network/SDK issue.

