# PayPal SDK - Browser Console Test

Run these commands in your browser console (F12) to diagnose the PayPal SDK loading issue.

## Step 1: Check if Client ID is Loaded

```javascript
console.log("Client ID:", import.meta.env.VITE_PAYPAL_CLIENT_ID);
```

**Expected**: Should show your Client ID (not `undefined`)

## Step 2: Test PayPal SDK URL Directly

```javascript
const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
const testUrl = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
console.log("Test URL:", testUrl);

// Try to load it
const script = document.createElement("script");
script.src = testUrl;
script.async = true;

script.onload = () => {
  console.log("✅ Script loaded!");
  setTimeout(() => {
    if (window.paypal) {
      console.log("✅ window.paypal is available!");
      console.log("PayPal version:", window.paypal?.version);
    } else {
      console.error("❌ Script loaded but window.paypal is NOT available");
    }
  }, 1000);
};

script.onerror = (err) => {
  console.error("❌ Script failed to load:", err);
  console.error("This usually means:");
  console.error("1. Invalid Client ID");
  console.error("2. Network/firewall blocking");
  console.error("3. CORS issue");
};

document.body.appendChild(script);
```

## Step 3: Check Network Tab

1. Open DevTools (F12) → **Network** tab
2. Filter by "paypal"
3. Look for the SDK request
4. Check:
   - **Status**: Should be 200 (green)
   - **Type**: Should be "script"
   - **Size**: Should be > 0
   - Click on it to see the response

## Step 4: Verify Client ID Format

Your Client ID: `AXx1Lt6dwJix_8-Va_E7YTH5E_-1n8aDUifuFYbCET-5Ae8K2PR9S-_WLqBaS5BLQt_q9BkQNIYC1aEa`

**Observations**:
- ✅ Starts with `A` (valid format, but unusual)
- ⚠️ Not a Sandbox ID (sandbox IDs start with `sb-`)
- ⚠️ Not a Live ID (live IDs start with `live-`)

**Action**: Verify this Client ID in PayPal Developer Dashboard:
1. Go to https://developer.paypal.com/
2. Navigate to **My Apps & Credentials**
3. Check if this Client ID exists and is active
4. For local testing, consider using a **Sandbox** Client ID (starts with `sb-`)

## Step 5: Test Minimal URL

```javascript
// Test with absolute minimal URL
const minimalUrl = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(import.meta.env.VITE_PAYPAL_CLIENT_ID);
console.log("Minimal URL:", minimalUrl);

fetch(minimalUrl)
  .then(r => {
    console.log("✅ Fetch successful, status:", r.status);
    return r.text();
  })
  .then(text => {
    console.log("Response length:", text.length);
    console.log("First 200 chars:", text.substring(0, 200));
  })
  .catch(err => {
    console.error("❌ Fetch failed:", err);
  });
```

## Common Issues & Solutions

### Issue: Client ID is `undefined`
**Solution**: Restart frontend server after adding to `.env`

### Issue: Script loads but `window.paypal` is undefined
**Solution**: 
- Client ID might be invalid
- Check PayPal Developer Dashboard
- Try a Sandbox Client ID for testing

### Issue: Network error / CORS error
**Solution**:
- Check firewall/VPN
- Disable ad blocker
- Try different network
- Check browser console for specific CORS message

### Issue: 404 Not Found
**Solution**: Client ID is invalid - get a new one from PayPal Dashboard

## What to Share for Help

If still not working, share:
1. Output from Step 1 (Client ID check)
2. Output from Step 2 (script load test)
3. Network tab screenshot showing the PayPal request
4. Any red errors from browser console

