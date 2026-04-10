# Manual Media + AI Validation Checklist

Use this checklist for real-device verification (camera, microphone, and local AI).

## Prerequisites

- Local app stack running:
  - `npm run dev`
- Local Supabase running and migrations applied:
  - `npx supabase start`
  - `npm run test:schema:local`
- Optional local AI service running:
  - `npm run ai:service`

## Match Setup

1. Create a match with:
   - Match name: `Manual-Media-AI-Check`
   - Overs per innings: 3
   - Balls per over: 6
2. Enter record screen.

Expected:
- `Start Delivery`, `Ball Dead`, `Mark Hit`, `Hold to Speak` visible.
- AI mode dropdown visible (`Manual only`, `Local AI`, `Mock AI`).

## Camera And Video Capture

### A. Permission Granted

1. Click `Start Delivery`.
2. Allow camera/mic permissions when prompted.
3. Click record button, wait 2-3 seconds, stop recording.
4. In drawer, choose `Dot`, click `Save Clip`.

Expected:
- No camera error alert.
- Drawer closes after save.
- Ball/over counters update.

### B. Permission Denied

1. Block camera permission in browser.
2. Click `Start Delivery`.

Expected:
- Visible error alert: permission denied / camera or microphone denied.

## Audio Input (Voice Command)

1. Hold `Hold to Speak`.
2. Say each command:
   - `start delivery`
   - `mark hit`
   - `ball dead`
   - `wide`
   - `no ball`
   - `out`

Expected:
- Either recognized action and toast updates, or clear unsupported browser error.
- No crash / page freeze.

## Recording Bypass

1. Without active recording, click `Log outcome without recording`.
2. Choose `4` and click `Save Clip`.

Expected:
- Clip saves without video upload.
- Score updates.

## AI Availability And Bypass

### A. Off/Manual

1. Set mode to `Manual only`.
2. Open manual drawer.

Expected:
- Status shows AI is off.
- Manual save works.

### B. Mock

1. Set mode to `Mock AI`.
2. Open manual drawer.

Expected:
- AI suggestion panel appears.
- App remains usable even if suggestion is delayed.

### C. Live Available

1. Start `npm run ai:service`.
2. Set mode to `Local AI`.
3. Record a short clip and open drawer.

Expected:
- Suggestion or explicit AI status appears.
- No unhandled errors.

### D. Live Unavailable

1. Stop AI service.
2. Keep mode `Local AI`.
3. Open drawer and save outcome manually.

Expected:
- Graceful unavailable status (no crash).
- Manual fallback save succeeds.

## UI Alignment Checks

1. Verify top summary and lower action controls do not overlap.
2. Open manual drawer and verify all action buttons are visible without clipping:
   - Outcome buttons
   - Dismissal selector (for wicket)
   - `Cancel` and `Save Clip`

Expected:
- No overlap or hidden controls in portrait and resized desktop widths.

