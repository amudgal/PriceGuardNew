# PayPal SDK Loading - Troubleshooting Guide

## Error: "Failed to load PayPal SDK"

This error occurs when the PayPal JavaScript SDK cannot be loaded from PayPal's CDN. Follow these steps to diagnose and fix:

---

## Step 1: Check Environment Variable

### Verify `VITE_PAYPAL_CLIENT_ID` is Set

1. **Check your `.env` file** in `priceguard/` directory:
   ```bash
   cd priceguard
   cat .env
   ```

2. **Should contain**:
   ```bash
   VITE_PAYPAL_CLIENT_ID=sb-xxxxxxxxx
   ```

3. **If missing or empty**:
   - Add it to `priceguard/.env`
   - Get your Client ID from [PayPal Developer Dashboard](https://developer.paypal.com/)
   - For sandbox testing, it should start with `sb-`

### Restart Frontend After Updating `.env`

**Important**: Vite only reads `.env` files on startup. After updating:

```bash
# Stop frontend (Ctrl+C)
# Then restart:
cd priceguard
npm run dev
```

---

## Step 2: Verify Client ID Format

Your PayPal Client ID should be in one of these formats:

- **Sandbox**: `sb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (starts with `sb-`)
- **Live**: `live-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (starts with `live-`)
- **Legacy**: `Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (starts with `A`)

**Common Issues**:
- ❌ Missing `sb-` prefix
- ❌ Extra spaces or quotes
- ❌ Wrong environment (using live ID in sandbox mode)

**Fix**: Copy the exact Client ID from PayPal Dashboard → My Apps & Credentials

---

## Step 3: Check Browser Console

Open browser DevTools (F12) → Console tab and look for:

### Error Messages to Check:

1. **Network Error**:
   ```
   Failed to fetch dynamically imported module
   ```
   - **Cause**: Network/CORS issue
   - **Fix**: Check internet connection, firewall, or VPN blocking PayPal CDN

2. **CORS Error**:
   ```
   Access to script at 'https://www.paypal.com/sdk/js?...' from origin 'http://localhost:5173' has been blocked by CORS policy
   ```
   - **Cause**: This shouldn't happen (PayPal allows CORS)
   - **Fix**: Clear browser cache, try incognito mode

3. **404 or Script Not Found**:
   ```
   Failed to load resource: the server responded with a status of 404
   ```
   - **Cause**: Invalid Client ID or malformed URL
   - **Fix**: Verify Client ID is correct

4. **Script Error**:
   ```
   Uncaught SyntaxError: Unexpected token
   ```
   - **Cause**: PayPal SDK script corrupted or blocked
   - **Fix**: Clear browser cache, disable ad blockers

---

## Step 4: Test PayPal SDK URL Directly

1. **Get your Client ID** from `.env`
2. **Open this URL in your browser** (replace `YOUR_CLIENT_ID`):
   ```
   https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD&intent=capture
   ```

3. **Expected Result**: 
   - Should load JavaScript code (not an error page)
   - Should not show 404 or access denied

4. **If it fails**:
   - Your Client ID is invalid
   - Get a new one from PayPal Dashboard

---

## Step 5: Check Network Connectivity

### Test PayPal CDN Access

```bash
# Test if you can reach PayPal's CDN
curl -I https://www.paypal.com/sdk/js

# Should return: HTTP/2 200
```

### Common Network Issues:

1. **Firewall blocking PayPal**:
   - Check if corporate firewall blocks `paypal.com`
   - Try from different network (mobile hotspot)

2. **VPN Issues**:
   - Some VPNs block payment gateways
   - Try disabling VPN temporarily

3. **Ad Blockers**:
   - Ad blockers may block PayPal scripts
   - Disable ad blocker for `localhost:5173`

---

## Step 6: Verify Script is Being Added

1. **Open browser DevTools** (F12)
2. **Go to Elements/Inspector tab**
3. **Search for** `paypal.com/sdk` in the HTML
4. **Check if script tag exists**:
   ```html
   <script src="https://www.paypal.com/sdk/js?client-id=..." async></script>
   ```

**If script tag is missing**:
- Component may not be rendering
- Check React component is mounted
- Check browser console for React errors

---

## Step 7: Check Browser Compatibility

PayPal SDK requires:
- **Modern browser** (Chrome, Firefox, Safari, Edge - latest versions)
- **JavaScript enabled**
- **No browser extensions blocking scripts**

### Test in Different Browser:
- Try Chrome/Firefox if using Safari
- Try incognito/private mode
- Disable browser extensions

---

## Step 8: Verify Vite Configuration

Check `vite.config.ts` doesn't have restrictions:

```typescript
// Should NOT have:
server: {
  proxy: {
    // This might block PayPal CDN
  }
}
```

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] `VITE_PAYPAL_CLIENT_ID` is set in `priceguard/.env`
- [ ] Frontend server was restarted after updating `.env`
- [ ] Client ID starts with `sb-` (for sandbox)
- [ ] Client ID has no extra spaces or quotes
- [ ] Browser console shows no errors
- [ ] Network tab shows script request to PayPal
- [ ] Internet connection is working
- [ ] No firewall/VPN blocking PayPal
- [ ] Ad blocker is disabled
- [ ] Browser is up to date
- [ ] Tried in incognito/private mode

---

## Common Solutions

### Solution 1: Restart Frontend Server

```bash
# Stop frontend (Ctrl+C in terminal)
cd priceguard
npm run dev  # Start again
```

### Solution 2: Clear Browser Cache

1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Solution 3: Verify Client ID

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Navigate to **My Apps & Credentials**
3. Select your **Sandbox** app
4. Copy **Client ID** exactly (including `sb-` prefix)
5. Paste into `priceguard/.env`:
   ```bash
   VITE_PAYPAL_CLIENT_ID=sb-xxxxxxxxx
   ```
6. Restart frontend

### Solution 4: Test with Minimal Example

Create a simple test to isolate the issue:

```tsx
// Test if PayPal SDK can load at all
useEffect(() => {
  const script = document.createElement("script");
  script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}`;
  script.onload = () => console.log("✅ PayPal SDK loaded!");
  script.onerror = () => console.error("❌ Failed to load PayPal SDK");
  document.body.appendChild(script);
}, []);
```

---

## Still Not Working?

### Get More Debug Information

1. **Open browser console** (F12)
2. **Look for `[paypal]` prefixed messages**
3. **Check Network tab**:
   - Filter by "paypal"
   - Check request status (200 = success, 404 = not found)
   - Check response headers

### Check Backend Logs

Even though this is a frontend issue, check backend is running:

```bash
curl http://localhost:4000/health
```

### Verify PayPal Account Status

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Check your app status is **Active**
3. Verify you're using **Sandbox** credentials (not Live)

---

## Error Messages Reference

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "Failed to load PayPal SDK" | Script failed to load | Check network, Client ID, restart frontend |
| "PayPal Client ID is not configured" | Missing env variable | Add `VITE_PAYPAL_CLIENT_ID` to `.env` |
| "window.paypal is not available" | SDK loaded but not initialized | Check browser console for errors |
| CORS error | Browser blocking request | Clear cache, try incognito |
| 404 Not Found | Invalid Client ID | Verify Client ID in PayPal Dashboard |
| Network error | No internet or blocked | Check connection, disable VPN/firewall |

---

## Need More Help?

1. **Check browser console** for detailed error messages
2. **Check Network tab** to see if request is being made
3. **Verify environment variables** are set correctly
4. **Test PayPal SDK URL** directly in browser
5. **Try different browser** or incognito mode
6. **Review PayPal Developer Docs**: [PayPal JavaScript SDK](https://developer.paypal.com/sdk/js/)

---

## Quick Fix Command

If you just want to restart everything:

```bash
# Terminal 1: Backend
cd priceguard/server
npm run dev

# Terminal 2: Frontend (after backend is running)
cd priceguard
npm run dev
```

Then:
1. Open `http://localhost:5173`
2. Open browser console (F12)
3. Check for `[paypal]` messages
4. Look for any red error messages

---

**Most Common Fix**: Restart frontend server after updating `.env` file! 🔄

