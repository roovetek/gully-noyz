# Test Cases

This file is the source of truth for test coverage in this repository.
Use it to track which scenarios already have automation and which still need implementation.

Status values:
- `existing`: implemented and committed test coverage exists.
- `to add`: planned coverage not yet implemented.

## Strategy

- **Unit tests** cover pure logic (validation, scoring math, adapters, parsers, security helpers).
- **Component tests** cover user actions in isolated UI with mocked dependencies.
- **E2E tests** cover critical user journeys and integration between screens.
- Keep E2E small and stable; push branch-heavy edge cases into unit/component layers.

## TC-U: Unit Tests

| TC-ID | Description | File | Status |
|---|---|---|---|
| U-BALL-001 | Valid vs invalid ball counting respects wide/no-ball config | `tests/lib/ballCounter.test.ts` | existing |
| U-BALL-002 | Run calculation honors wide/legbye and extra rules | `tests/lib/ballCounter.test.ts` | existing |
| U-BALL-003 | Over/ball display helpers map legal deliveries correctly | `tests/lib/ballCounter.test.ts` | existing |
| U-MATCH-001 | Innings overs display uses legal balls only | `tests/lib/match.test.ts` | existing |
| U-MATCH-002 | Match stats aggregate runs/wickets with extras | `tests/lib/match.test.ts` | existing |
| U-VALID-001 | Match name/secret/matchId validation rejects invalid input | `tests/lib/validation.test.ts` | existing |
| U-VALID-002 | Overs and outcomes validation handles boundaries and empties | `tests/lib/validation.test.ts` | existing |
| U-SEC-001 | Secret hashing is deterministic and SHA-256 hex format | `tests/lib/security.test.ts` | existing |
| U-SEC-002 | Secret verification returns true/false on match mismatch | `tests/lib/security.test.ts` | existing |
| U-SEC-003 | Secure match ID validation and generation format | `tests/lib/security.test.ts` | existing |
| U-SEC-004 | SecureStorage set/get/remove/clear with prefix safety | `tests/lib/security.test.ts` | existing |
| U-URL-001 | Hash generation covers landing, match tabs, admin, gully-rulz | `tests/lib/appUrl.test.ts` | existing |
| U-URL-002 | Hash parsing handles valid/invalid routes safely | `tests/lib/appUrl.test.ts` | existing |
| U-DISMISS-001 | Canonical dismissal order keeps primary block first and Other last | `tests/lib/dismissalOptions.test.ts` | existing |
| U-DISMISS-002 | Dismissal labels are human readable and stable | `tests/lib/dismissalOptions.test.ts` | existing |
| U-ENGINE-001 | Over flow swaps strike at legal over end | `tests/engine/matchEngine.test.ts` | existing |
| U-ENGINE-002 | No-ball caught does not increment wicket count | `tests/engine/matchEngine.test.ts` | existing |
| U-ENGINE-003 | Odd/even and boundary strike rotation behavior | `tests/engine/matchEngine.test.ts` | existing |
| U-ENGINE-004 | Manual correction updates state without mutating history | `tests/engine/matchEngine.test.ts` | existing |
| U-INTENT-001 | STT intent parser maps wide/no-ball/wicket/dot/run phrases | `tests/engine/intentParser.test.ts` | existing |
| U-SCHEMA-001 | Required scoring schema columns/tables verified before E2E | `scripts/schema-sanity-check.mjs` | existing |
| U-AI-001 | AI mode and fallback behavior handled deterministically | `tests/lib/aiScoringClient.test.ts` | existing |
| U-DEL-001 | Delete match flow validates inputs and RPC handling | `tests/lib/deleteMatch.test.ts` | existing |
| U-REQ-001 | Audit payload sanitization strips sensitive fields | `tests/lib/requestTracker.test.ts` | existing |
| U-ERROR-001 | User-friendly error mapper returns stable messages | `tests/lib/userFriendlyError.test.ts` | existing |

## TC-C: Component Tests

| TC-ID | Description | File | Status |
|---|---|---|---|
| C-RECORD-001 | Record page layout keeps capture area in flow (no fixed overlay) | `tests/components/RecordLayout.test.tsx` | existing |
| C-VIDEO-001 | VideoCapture smoke renders key controls | `tests/components/VideoCaptureSmoke.test.tsx` | existing |
| C-VIDEO-002 | Outcome action buttons (dot/1/2/3/4/6/W/WD/NB) are present | `tests/components/VideoCaptureSmoke.test.tsx` | existing |
| C-VIDEO-003 | Wicket action reveals dismissal selector with canonical ordering | `tests/components/VideoCaptureSmoke.test.tsx` | existing |
| C-VIDEO-004 | AI Assist mode toggle updates visible state | `tests/components/VideoCaptureSmoke.test.tsx` | existing |
| C-CREATE-001 | Create Match modal validates name, secret, passcode, and close behavior | `tests/components/CreateMatchModal.test.tsx` | existing |
| C-CREATE-002 | Customize rules toggle displays rule controls | `tests/components/CreateMatchModal.test.tsx` | existing |
| C-SELECT-001 | Match selector join validation handles empty and malformed IDs | `tests/components/MatchSelector.test.tsx` | existing |
| C-SELECT-002 | Private match join shows secret prompt path | `tests/components/MatchSelector.test.tsx` | existing |
| C-HEADER-001 | Header renders Home and Gully Rulz links with active style | `tests/components/Header.test.tsx` | existing |
| C-LIST-001 | Match list empty state renders expected copy | `tests/components/MatchList.test.tsx` | existing |

## TC-E: E2E Tests

| TC-ID | Description | File | Status |
|---|---|---|---|
| E-SMOKE-001 | Landing page renders Create Match and Join Match actions | `tests/e2e/smoke.spec.ts` | existing |
| E-RECORD-001 | Public create-match happy path reaches record HUD | `tests/e2e/record-flow.spec.ts` | existing |
| E-PRIVATE-001 | Private match creation + join secret validation flow | `tests/e2e/private-match.spec.ts` | existing |
| E-TABS-001 | Record/Timeline/Stats/Info tab navigation works | `tests/e2e/tab-navigation.spec.ts` | existing |
| E-ADMIN-001 | Hidden admin route remains accessible via `/#/admin` | `tests/e2e/tab-navigation.spec.ts` | existing |
| E-BALL-001 | Basic scoring interaction in browser (select run, record control visible) | `tests/e2e/ball-recording.spec.ts` | existing |
| E-MATRIX-001 | 3-over x 6-ball deterministic outcome matrix | `tests/e2e/three-over-six-ball.spec.ts` | existing |
| E-MATRIX-002 | Match config combinations (public/private/customized/validation) | `tests/e2e/match-config-combinations.spec.ts` | existing |
| E-AI-001 | AI mode availability and manual bypass flow | `tests/e2e/ai-modes-and-bypass.spec.ts` | existing |
| E-UI-001 | UI alignment and non-overlap checks for record controls and drawer | `tests/e2e/ui-alignment.spec.ts` | existing |
| E-VIS-001 | Dark Studio visual snapshot baselines for landing and key match states | `tests/e2e/ui-visual.spec.ts` | existing |
| E-QA-001 | Hidden QA gallery route shows latest command results + screenshot sequence metadata | `src/components/QAReport.tsx`, `scripts/qa-harness.mjs` | existing |

## TC-I: Integration-Gated (Supabase-Backed)

| TC-ID | Description | File | Status |
|---|---|---|---|
| I-MATCH-001 | Test match creation and production filtering | `tests/integration/matchCreation.test.ts` | existing |
| I-CLIP-001 | Clip insertion/retrieval and production filtering | `tests/integration/clipStorage.test.ts` | existing |
| I-DEL-001 | Match deletion data lifecycle for test data | `tests/integration/matchDeletion.test.ts` | existing |
| I-RULE-001 | Global/effective rule retrieval and override behavior | `tests/integration/rulesEngine.integration.test.ts` | existing |
| I-BOWL-001 | Bowler constraints from persisted clips | `tests/integration/bowlerValidator.integration.test.ts` | existing |
