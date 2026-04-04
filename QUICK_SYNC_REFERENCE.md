# Quick Sync Reference Guide

Fast answers to the most common deployment sync questions.

## Status Check (30 seconds)

1. Look at top-right corner of app
2. If you see ✓ green checkmark → Deployment is synced
3. If you see ⚠ yellow warning → Some configuration issues exist
4. Click icon to see details

## I Pushed Code But Don't See Changes (5 minutes)

1. **Hard refresh browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Wait 2-3 minutes** for Bolt to rebuild
3. Check status icon for any issues
4. If still not working, see "Troubleshooting" section

## Console Diagnostics (1 minute)

```javascript
// Open browser console (F12) and run:

// See full deployment info
syncDiagnostics.print()

// Get report as JSON (for sharing)
const report = syncDiagnostics.export()
console.log(report)

// List all available commands
syncDiagnostics.help()
```

## Pre-Push Checklist (2 minutes)

```bash
npm run build      # Verify builds
npm run typecheck  # Check TypeScript
npm run lint       # Check code quality
```

If all pass, safe to push.

## Yellow Warning - What To Do

**Symptom**: Yellow warning icon in header

**Common causes and fixes:**

| Issue | Fix |
|-------|-----|
| Supabase URL not configured | Check Bolt.new Settings → Environment |
| API key missing | Add VITE_SUPABASE_ANON_KEY to Bolt.new Settings |
| Production build lacks version | Not critical, warning only |

## Build Failed - Recovery

1. Check console for error messages
2. Run locally: `npm run typecheck`
3. Fix any TypeScript errors
4. Run locally: `npm run lint`
5. Fix any linting errors
6. Commit and push again
7. Wait 2-3 minutes for rebuild

## Bolt.new Manual Sync

In Bolt.new editor:
1. Click Git icon (sidebar)
2. Look for "Pull from Remote"
3. Click to manually sync latest changes
4. Watch for rebuild indicator

## Force Browser Cache Clear

Sometimes the browser caches old code:

**Option 1** (Quick): Hard refresh
- Mac: Cmd+Shift+R
- Windows: Ctrl+Shift+R
- Linux: Ctrl+Shift+R

**Option 2** (Complete): Incognito window
- Open new incognito/private window
- Visit deployment URL
- Check if new code appears

**Option 3** (Nuclear): Clear all cache
- Open DevTools (F12)
- Right-click refresh button
- Choose "Empty cache and hard refresh"

## Environment Variables Sync

Changes to .env need to be synced manually to Bolt.new:

1. Update local `.env` file
2. In Bolt.new, go to Settings
3. Find Environment/Secrets section
4. Update matching variables there
5. Trigger rebuild

**Critical variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Verify Successful Sync

After pushing code:

1. Check status icon (should be green ✓)
2. Verify build timestamp is recent
3. Hard refresh browser
4. Check that feature works correctly
5. Run `syncDiagnostics.print()` and verify no issues

## Connection Issues

**Is Bolt.new connected to your repository?**

1. Bolt.new sidebar → Project
2. Look for repository name/URL
3. If missing or "unknown", reconnect repository

**Is the branch correct?**

1. Check which branch Bolt is watching
2. Confirm you pushed to that branch
3. Can verify with `git branch -a` locally

## Debugging Checklist

- [ ] Status icon visible in header?
- [ ] Console shows deployment info on load?
- [ ] No errors in console (F12)?
- [ ] Recent build timestamp in status popup?
- [ ] No yellow warnings?
- [ ] Latest commit in git log?
- [ ] Hard refresh shows latest changes?

## Testing Checklist Before Release

```
□ npm run build       ✓ Build successful
□ npm run typecheck   ✓ No type errors
□ npm run lint        ✓ Code passes linting
□ Local testing       ✓ Features work locally
□ Push to repo        ✓ Code pushed
□ Wait 2-3 min        ✓ Bolt rebuilt
□ Hard refresh        ✓ Browser cache cleared
□ Verify live         ✓ Changes appear on deployed site
□ Check status icon   ✓ Shows green checkmark
```

## Commands Reference

### Build & Deploy
```bash
npm run dev        # Local development
npm run build      # Production build
npm run preview    # Preview production build
```

### Code Quality
```bash
npm run typecheck  # TypeScript check
npm run lint       # Linting check
npm run lint:fix   # Auto-fix linting issues
```

### Testing
```bash
npm run test       # Run tests
npm run test:ui    # Test UI mode
npm run test:run   # Run tests once
```

### Repository
```bash
git log --oneline         # View recent commits
git push                  # Push to repository
git status                # Check working tree
git branch -a             # List all branches
```

## When Everything Is Broken

1. **Take a deep breath** - most sync issues are easily fixed
2. **Check the status icon** - see what's reported
3. **Hard refresh** - Cmd+Shift+R
4. **Run diagnostics** - `syncDiagnostics.print()`
5. **Read DEPLOYMENT_SYNC_GUIDE.md** - covers 95% of issues
6. **Check build locally** - `npm run build`
7. **Verify environment variables** - in Bolt.new Settings
8. **Wait and try again** - sometimes takes 2-5 minutes to rebuild

## Still Stuck?

1. **Generate diagnostic report:**
   ```javascript
   const report = syncDiagnostics.export()
   console.log(report)
   ```

2. **Document:**
   - Time issue occurred
   - What code was pushed
   - What you expected vs what happened
   - Screenshot of sync status

3. **Check detailed guide:** DEPLOYMENT_SYNC_GUIDE.md

4. **Common solutions:**
   - Hard refresh browser
   - Wait for rebuild (2-5 min)
   - Check environment variables
   - Verify build passes locally
   - Confirm code actually pushed

## Quick Links

- 📖 Full Guide: `DEPLOYMENT_SYNC_GUIDE.md`
- 📋 Implementation Details: `SYNC_IMPLEMENTATION_SUMMARY.md`
- 🔧 Vite Config: `vite.config.ts`
- 📱 App Status Component: `src/components/SyncStatus.tsx`
- 🔍 Diagnostics: `src/lib/syncDiagnostics.ts`

## Status Indicators

| Icon | Meaning | Action |
|------|---------|--------|
| ✓ (Green) | Synced | Continue normal development |
| ⚠ (Yellow) | Issues detected | Click to see what's wrong |
| ✗ (Red) | Error | Check build logs |

---

**Last Updated:** 2026-04-04
**Version:** 1.0
