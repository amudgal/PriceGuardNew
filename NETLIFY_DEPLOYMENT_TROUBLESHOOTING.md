# Netlify Deployment Troubleshooting: Seeing Old Code

If you're seeing old code after deploying to Netlify, here are the most common causes and solutions:

## Quick Fixes (Try These First)

### 1. Clear Browser Cache
**Most common issue!** Your browser might be showing cached files.

**Solution:**
- **Hard refresh:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Or clear cache:** Browser settings → Clear browsing data → Cached images and files
- **Or use incognito/private mode** to test

### 2. Trigger a New Deployment
Netlify might not have pulled the latest code from GitHub.

**Solution:**
1. Go to: https://app.netlify.com/sites/aaires/deploys
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for deployment to complete (2-3 minutes)

### 3. Check Build Logs
The build might be failing silently or using cached dependencies.

**Solution:**
1. Go to: https://app.netlify.com/sites/aaires/deploys
2. Click on the latest deployment
3. Check the **"Build log"** for errors
4. Look for any warnings or failures

## Common Issues and Solutions

### Issue 1: Netlify Building from Wrong Branch

**Problem:** Netlify might be building from `master` instead of `main`, or from an old branch.

**Check:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#deploy-contexts
2. Check which branch is set for **Production branch**
3. Verify it matches your GitHub branch (likely `main`)

**Fix:**
1. Go to: **Site settings** → **Build & deploy** → **Deploy contexts**
2. Set **Production branch** to `main` (or your active branch)
3. Click **"Save"**
4. Trigger a new deployment

### Issue 2: Build Output Directory Mismatch

**Problem:** Netlify might be looking in the wrong directory for built files.

**Check:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#build-settings
2. Check **"Publish directory"** - should be `dist` (Vite's default output)
3. Check **"Base directory"** - should be empty or `priceguard` if Netlify is building from root

**Fix:**
1. Go to: **Site settings** → **Build & deploy** → **Build settings**
2. Set **Publish directory** to: `dist`
3. If your repo structure has `priceguard` as a subdirectory, set **Base directory** to: `priceguard`
4. Click **"Save"**
5. Trigger a new deployment

### Issue 3: Build Command Not Running

**Problem:** Netlify might not be running the build command, or it's using a cached build.

**Check:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#build-settings
2. Check **"Build command"** - should be `npm run build` or `cd priceguard && npm run build`
3. Check build logs to see if the command actually ran

**Fix:**
1. Go to: **Site settings** → **Build & deploy** → **Build settings**
2. Set **Build command** to:
   - If base directory is `priceguard`: `npm run build`
   - If building from root: `cd priceguard && npm run build`
3. Set **Publish directory** to: `dist` (or `priceguard/dist` if building from root)
4. Click **"Save"**
5. Trigger a new deployment with **"Clear cache and deploy site"**

### Issue 4: GitHub Not Connected or Wrong Repository

**Problem:** Netlify might be connected to the wrong GitHub repository or branch.

**Check:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#continuous-deployment
2. Check which repository is connected
3. Verify it's the correct repo (should be `amudgal/PriceGuard` or similar)

**Fix:**
1. If wrong repo: **Disconnect** and **Connect to Git provider** again
2. Select the correct repository
3. Select the correct branch (`main`)
4. Configure build settings (see above)
5. Trigger a new deployment

### Issue 5: Build Cache Issues

**Problem:** Netlify might be using cached `node_modules` or build artifacts from an old deployment.

**Solution:**
1. Go to: https://app.netlify.com/sites/aaires/deploys
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. This will:
   - Clear cached `node_modules`
   - Clear cached build artifacts
   - Pull fresh code from GitHub
   - Run a clean build

### Issue 6: Submodule Not Updated

**Problem:** If `priceguard` is a submodule, Netlify might not be pulling the latest submodule commit.

**Check:**
1. Verify the latest commit is in GitHub:
   ```bash
   cd priceguard
   git log --oneline -5
   ```
2. Check if parent repo has updated submodule reference:
   ```bash
   cd ..
   git submodule status
   ```

**Fix:**
1. Make sure submodule changes are pushed:
   ```bash
   cd priceguard
   git push origin main
   ```
2. Update parent repo submodule reference:
   ```bash
   cd ..
   git add priceguard
   git commit -m "Update submodule"
   git push origin master
   ```
3. Trigger Netlify deployment with cache clear

### Issue 7: Environment Variables Not Set

**Problem:** If your code checks for environment variables and they're missing, it might fall back to old behavior.

**Check:**
1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#environment-variables
2. Verify all required variables are set:
   - `VITE_PAYPAL_CLIENT_ID`
   - `VITE_API_BASE_URL`
   - Any other `VITE_*` variables

**Fix:**
1. Set missing environment variables
2. Trigger a new deployment (variables are read at build time)

## Step-by-Step Diagnostic Process

### Step 1: Verify Code is in GitHub

```bash
# Check latest commits
cd priceguard
git log --oneline -5

# Verify you're on the right branch
git branch

# Check if there are uncommitted changes
git status
```

### Step 2: Check Netlify Build Settings

1. Go to: https://app.netlify.com/sites/aaires/settings/deploys#build-settings
2. Verify:
   - **Base directory:** `priceguard` (if repo has subdirectory) or empty
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** Should match your local (check with `node --version`)

### Step 3: Check Latest Deployment

1. Go to: https://app.netlify.com/sites/aaires/deploys
2. Check the **latest deployment**:
   - Does it show the latest commit hash from GitHub?
   - Does it show "Published" status?
   - Check the build log for errors

### Step 4: Verify Build Output

1. In the deployment log, check:
   - Does it show `npm run build` running?
   - Does it show files being built?
   - Are there any errors or warnings?

2. Check the deployed files:
   - Go to: https://app.netlify.com/sites/aaires/deploys
   - Click on latest deployment → **"Browse published site"**
   - Or visit: https://aaires.netlify.app
   - View page source (Ctrl+U or Cmd+Option+U)
   - Check if the JavaScript files have recent timestamps

### Step 5: Test in Incognito Mode

1. Open browser in incognito/private mode
2. Visit: https://aaires.netlify.app
3. Check if you see the new code
4. If yes → it's a browser cache issue
5. If no → it's a Netlify deployment issue

## Recommended Netlify Build Settings

Based on your project structure, here are the recommended settings:

### If `priceguard` is the root of the Netlify site:

**Build settings:**
- **Base directory:** (leave empty)
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** `20` (or your current version)

### If Netlify is building from parent directory:

**Build settings:**
- **Base directory:** `priceguard`
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** `20`

## Force a Complete Rebuild

If nothing else works, force a complete rebuild:

1. **Clear all caches:**
   - Go to: https://app.netlify.com/sites/aaires/deploys
   - Click **"Trigger deploy"** → **"Clear cache and deploy site"**

2. **Or disconnect and reconnect:**
   - Go to: **Site settings** → **Build & deploy** → **Continuous deployment**
   - Click **"Disconnect"**
   - Click **"Connect to Git provider"**
   - Reconnect and configure build settings
   - Trigger deployment

## Verify Deployment is Working

After deploying, verify:

1. **Check deployment status:**
   - Should show "Published" (green)
   - Should show latest commit hash

2. **Check build logs:**
   - Should show `npm run build` running
   - Should show files being created in `dist/`
   - No errors

3. **Test the site:**
   - Visit: https://aaires.netlify.app
   - Open browser console (F12)
   - Check for any errors
   - Verify PayPal button appears (if that's what you're testing)

4. **Check file timestamps:**
   - View page source
   - Check JavaScript file URLs
   - They should have recent timestamps

## Still Not Working?

If you've tried everything above:

1. **Check Netlify status:**
   - Visit: https://www.netlifystatus.com/
   - See if there are any service issues

2. **Check GitHub webhook:**
   - Go to: **Site settings** → **Build & deploy** → **Continuous deployment**
   - Check if webhook is configured correctly
   - Test by making a small commit and pushing

3. **Contact support:**
   - Netlify support: https://www.netlify.com/support/
   - Include:
     - Site name: `aaires`
     - Latest deployment log
     - What you're expecting vs. what you're seeing

## Quick Checklist

Before asking for help, verify:

- [ ] Code is pushed to GitHub (check `git log`)
- [ ] Netlify is connected to correct repository
- [ ] Netlify is building from correct branch (`main`)
- [ ] Build settings are correct (command, publish directory)
- [ ] Latest deployment shows "Published" status
- [ ] Build logs show no errors
- [ ] Tried clearing browser cache
- [ ] Tried "Clear cache and deploy site"
- [ ] Tested in incognito mode
- [ ] Environment variables are set (if needed)

## Summary

**Most common fixes:**
1. ✅ Clear browser cache (hard refresh)
2. ✅ Trigger "Clear cache and deploy site" in Netlify
3. ✅ Verify build settings (publish directory, build command)
4. ✅ Check if building from correct branch
5. ✅ Verify code is actually in GitHub

**If still not working:**
- Check build logs for errors
- Verify Netlify is connected to correct repo
- Test in incognito mode to rule out browser cache
- Check if submodule needs updating (if applicable)

