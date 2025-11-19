# Quick Fix: Seeing Old Code on Netlify

## Immediate Actions (Try in Order)

### 1. Clear Browser Cache ⚡ (Most Common Fix)

**Do this first!** Your browser is likely showing cached files.

- **Windows/Linux:** Press `Ctrl + Shift + R`
- **Mac:** Press `Cmd + Shift + R`
- **Or:** Open in incognito/private mode and test

### 2. Force Netlify to Rebuild with Cache Clear

1. Go to: https://app.netlify.com/sites/aaires/deploys
2. Click **"Trigger deploy"** dropdown
3. Select **"Clear cache and deploy site"**
4. Wait 2-3 minutes for deployment to complete

### 3. Verify Build Settings

Check that Netlify is configured correctly:

1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#build-settings
2. Verify these settings:
   - **Base directory:** (empty) OR `priceguard` if building from parent repo
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `20` (or your current version)

3. If any are wrong, fix them and click **"Save"**
4. Trigger a new deployment

### 4. Check Which Branch Netlify is Building From

1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#deploy-contexts
2. Check **"Production branch"** - should be `main`
3. If it's `master` or something else, change it to `main`
4. Click **"Save"**
5. Trigger a new deployment

### 5. Verify Latest Code is in GitHub

```bash
cd priceguard
git log --oneline -3
```

Make sure your latest commits are there. If not:
```bash
git push origin main
```

Then trigger Netlify deployment again.

## Most Likely Causes (In Order)

1. **Browser cache** (90% of cases) → Clear cache or use incognito
2. **Netlify build cache** → Use "Clear cache and deploy site"
3. **Wrong branch** → Check deploy contexts
4. **Wrong build settings** → Check publish directory is `dist`
5. **Code not in GitHub** → Verify with `git log`

## Verify It's Fixed

After doing the above:

1. **Test in incognito mode:**
   - Open browser in private/incognito mode
   - Visit: https://aaires.netlify.app
   - Check if you see new code

2. **Check deployment:**
   - Go to: https://app.netlify.com/sites/aaires/deploys
   - Latest deployment should show "Published" (green)
   - Check the commit hash matches your latest GitHub commit

3. **Check build logs:**
   - Click on latest deployment
   - Check "Build log"
   - Should show `npm run build` running
   - Should show files being created in `dist/`

## Still Not Working?

If you've tried all of the above:

1. **Check build logs for errors:**
   - Go to latest deployment → Build log
   - Look for any red errors or warnings

2. **Verify Netlify is connected to correct repo:**
   - Go to: Site settings → Build & deploy → Continuous deployment
   - Check repository name matches your GitHub repo

3. **Disconnect and reconnect (nuclear option):**
   - Site settings → Build & deploy → Continuous deployment
   - Click "Disconnect"
   - Click "Connect to Git provider"
   - Reconnect and configure build settings
   - Trigger deployment

## Quick Checklist

- [ ] Cleared browser cache (hard refresh)
- [ ] Tested in incognito mode
- [ ] Triggered "Clear cache and deploy site" in Netlify
- [ ] Verified build settings (publish directory = `dist`)
- [ ] Verified production branch = `main`
- [ ] Verified latest code is in GitHub
- [ ] Checked build logs for errors

## Expected Netlify Build Settings

Based on your `vite.config.ts`:

```
Base directory: (empty) or "priceguard"
Build command: npm run build
Publish directory: dist
Node version: 20
```

If your Netlify site is connected to the `priceguard` repository directly:
- Base directory: (empty)
- Publish directory: `dist`

If your Netlify site is connected to a parent repository:
- Base directory: `priceguard`
- Publish directory: `dist`

