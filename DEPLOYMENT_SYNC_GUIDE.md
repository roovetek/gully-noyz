# Deployment Synchronization Guide

This guide helps you diagnose and fix external push synchronization issues when deploying to Bolt.new.

## Overview

This project is deployed on **Bolt.new (StackBlitz)**, a browser-based IDE with integrated Git integration. External code pushes should synchronize automatically, but various issues can prevent proper syncing. This guide provides diagnostic steps and solutions.

## Quick Sync Status

**Visual Indicator:** Look for the green checkmark icon (✓) or yellow warning icon (⚠) in the top-right corner of the application header.

Click the icon to see:
- Current deployment version
- Build timestamp
- Environment configuration
- Sync status and any detected issues
- Configuration warnings

## Understanding External Push Sync

### How It Works

1. You push code to the external repository (GitHub, GitLab, etc.)
2. Bolt.new monitors the repository via Git integration
3. When changes are detected, Bolt pulls the latest code
4. Vite rebuilds the application
5. The updated code is served to the deployed URL

### When Sync Issues Occur

Sync problems can happen at any of these stages:
- Git connection fails
- Bolt doesn't detect repository changes
- Build process fails silently
- Deployment uses cached old code
- Environment variables become stale

## Diagnostic Steps

### Step 1: Verify Repository Connection

**In Bolt.new:**
1. Click the "Project" icon (folder icon) in the left sidebar
2. Look for the Git icon or repository name indicator
3. Check that it shows your repository URL correctly
4. If the connection appears broken, try "Pull from Remote"

**Symptoms of connection issues:**
- Repository URL shows as unknown or missing
- Git status shows as disconnected
- No recent commits visible in history

### Step 2: Check Console Logs

**In your browser:**
1. Open Developer Tools (F12 or Cmd+Option+I)
2. Go to the "Console" tab
3. Look for the "=== Deployment Info ===" section
4. Check for any issues marked with ⚠ or ✗

**Key information in console:**
```
Version: 0.0.0-dev
Build Date: [current timestamp]
Environment: development/production
Supabase: cawnxhednocgpmfykjhf (URL shorthand)
```

**Common console errors:**
- `VITE_SUPABASE_URL is not configured` → Environment variables not set
- `VITE_SUPABASE_ANON_KEY is not configured` → API key missing

### Step 3: Check Application Sync Status

**Using the UI:**
1. Click the sync status icon (green check or yellow warning) in the header
2. Review all displayed information:
   - **Version**: Should match your latest code release version
   - **Build Date**: Should be recent (within last deployment timeframe)
   - **Environment**: Should show "production" on deployed version
   - **Issues**: Lists any configuration problems

**Interpreting sync status:**
- ✓ Green checkmark = Properly synced, all configuration correct
- ⚠ Yellow warning = Configuration issues but app still functions

### Step 4: Verify Environment Variables

**Check current configuration:**
1. Sync status popup shows Supabase URL
2. Console logs display configuration summary
3. Check that VITE_SUPABASE_URL matches your actual Supabase project

**In Bolt.new settings:**
1. Open Project settings
2. Navigate to "Environment" or "Secrets" section
3. Verify these are configured:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Step 5: Force Rebuild and Sync

**Method 1: Manual Pull in Bolt.new**
1. Click the Git icon in Bolt.new sidebar
2. Look for "Pull from Remote" or similar option
3. Click it to manually fetch latest changes
4. Wait for build to complete (watch the build indicator)

**Method 2: Trigger Hard Refresh**
1. Hard refresh your browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. This clears all caches and forces re-download of assets
3. Check the console for fresh deployment info

**Method 3: Check Deploy Status**
1. In Bolt.new, look for a "Deploy" or "Build" indicator
2. If showing as failed, click to see error messages
3. Fix any build errors (TypeScript, syntax errors, etc.)

## Common Sync Issues and Solutions

### Issue: Old code still showing in deployed app

**Diagnosis:**
- Sync status shows recent build date
- But app behavior hasn't changed
- Console shows old version numbers

**Solutions:**
1. **Clear browser cache:**
   - Hard refresh: Cmd+Shift+R or Ctrl+Shift+R
   - Or open in incognito/private window

2. **Check CDN cache:**
   - Wait 5-10 minutes for CDN to update
   - Check Bolt.new deployment logs for actual build date

3. **Verify commit was pushed:**
   - Run `git log --oneline` locally
   - Confirm your latest commit is there
   - Run `git push` to ensure it reached remote

### Issue: Sync status shows configuration issues

**Diagnosis:**
- Yellow warning icon appears
- Console shows "is not configured" messages

**Solutions:**
1. **Set environment variables in Bolt.new:**
   - Project Settings → Environment/Secrets
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
   - Rebuild project

2. **Verify values in .env:**
   - Check local `.env` file for correct values
   - Copy exact values to Bolt.new environment settings
   - Don't edit `.env` directly (it's gitignored)

### Issue: Build fails after push

**Diagnosis:**
- Sync status shows as failing
- Build indicator shows error
- App doesn't update at all

**Solutions:**
1. **Check console errors:**
   - Bolt.new build logs (usually in sidebar)
   - Fix TypeScript errors: `npm run typecheck`
   - Fix linting errors: `npm run lint`

2. **Verify dependencies:**
   - Check `package.json` for syntax errors
   - Ensure all imports are correct
   - Run `npm install` locally and verify no errors

3. **Test build locally:**
   - Run `npm run build` locally
   - If it fails locally, Bolt will fail too
   - Fix issues and push again

### Issue: Git shows no changes detected

**Diagnosis:**
- You pushed code but Bolt shows no sync activity
- Repository appears disconnected

**Solutions:**
1. **Verify remote URL:**
   - Locally: `git remote -v`
   - Confirm URL matches Bolt.new settings

2. **Manually trigger sync in Bolt:**
   - Git panel → Pull from Remote
   - Or disconnect/reconnect repository

3. **Check branch:**
   - Ensure you're on the correct branch
   - Bolt might be watching a different branch
   - Verify branch name in Bolt settings

## Preventing Future Sync Issues

### 1. Pre-Push Verification

Before pushing code:
```bash
# Build locally to catch errors early
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### 2. Monitor Deployment Status

- Check sync status icon in app header regularly
- Review console logs for warnings
- Check sync status popup for any issues

### 3. Keep Environment Variables Synced

- After any Supabase changes, update both:
  - Local `.env` file
  - Bolt.new environment settings
- Test locally before pushing

### 4. Establish a Release Process

1. Commit and test locally
2. Push to a staging branch first
3. Verify deployment on staging
4. Merge to production/main branch
5. Monitor production deployment status

## Technical Implementation Details

### Deployment Version Tracking

The app includes automatic version tracking:

**On every deployment:**
1. `deploymentVersion.ts` captures build info
2. Console logs all deployment info on startup
3. `SyncStatus.tsx` component shows real-time status
4. Validation runs every 60 seconds to detect issues

**Version info includes:**
- Version number (from VITE_APP_VERSION)
- Build date (from VITE_BUILD_DATE)
- Environment (development/production)
- Supabase URL
- Feature flags status

### Automatic Versioning (Per Push/Deploy)

The build now generates deployment metadata automatically, so you do not need to manually edit a version on each push.

- `VITE_APP_VERSION` format: `<package.json version>+<suffix>`
  - Example: `0.0.0+a73a63a`
- `suffix` priority:
  1. CI commit SHA (Bolt/Git provider env, if available)
  2. Local git short SHA
  3. Build timestamp fallback
- `VITE_BUILD_DATE` is generated at build time using ISO format.

For Bolt.new deployments, this means each new build after a push gets a fresh version/build-time pair even if semver is unchanged.

Quick verification in Admin Dashboard:
- `Version` should include the semver prefix and a changing suffix.
- `Build date` should reflect the latest deploy/build time.
- Two separate builds should show different metadata values.

### Health Check System

**Automatic checks every minute:**
- Validates Supabase configuration
- Checks for missing environment variables
- Logs any detected issues to console
- Shows warnings in UI if issues persist

**To manually check:**
```javascript
// In browser console:
import { validateDeploymentSync } from './lib/deploymentVersion';
const status = validateDeploymentSync();
console.log(status);
```

## Troubleshooting Checklist

- [ ] Sync status icon is green (✓) or yellow (⚠)
- [ ] Console shows deployment info on page load
- [ ] Sync status popup shows recent build date
- [ ] Environment variables match between local and Bolt.new
- [ ] Latest commit visible in Bolt.new Git history
- [ ] Recent build timestamp in sync status
- [ ] No errors in browser console
- [ ] Hard refresh shows latest code behavior

## Getting Help

If issues persist:

1. **Collect diagnostics:**
   - Screenshot of sync status popup
   - Console output (full deployment info section)
   - Git log showing latest commits
   - Bolt.new build logs (if accessible)

2. **Check logs for errors:**
   - Browser console (F12)
   - Bolt.new build output
   - Supabase project logs (if applicable)

3. **Document the sync issue:**
   - Time issue occurred
   - What code was pushed
   - Expected vs actual behavior
   - All diagnostic information from step 1

## References

- **Bolt.new**: https://bolt.new
- **Supabase**: https://supabase.com
- **Vite Documentation**: https://vitejs.dev
- **React Documentation**: https://react.dev

## Version History

- **v1.0** (2026-04-04): Initial deployment sync guide
  - Added sync status indicator
  - Implemented deployment version tracking
  - Created automated health check system
  - Added this comprehensive troubleshooting guide
