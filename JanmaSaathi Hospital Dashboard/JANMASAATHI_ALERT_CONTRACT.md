# JanmaSaathi Hospital Dashboard — Live Firebase, Security Rules & Alert Receiver Contract

## 1. Verified Firebase Backend Architecture

- **Firebase Project ID**: `outr-janmasaathi` (Project Number: `12503123299`)
- **Named Firestore Database ID**: `ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df`
  - Verified live: `(default)` database does **not** exist (`HTTP 404`); the named database exists and enforces Firestore security rules (`HTTP 403 PERMISSION_DENIED` unauthenticated across all collections).
- **Canonical Alert Collection**: `emergencyAlerts`
  - The Hospital Dashboard subscribes exclusively to `emergencyAlerts` using the exact document IDs created by the original JanmaSaathi PWA.
  - Legacy `alerts` collection is **not** subscribed to by the Hospital Dashboard and is locked down (`allow read, write: if false;`) in `firestore.rules` to prevent duplicate or stale test records.
- **No Duplicate Backend**: No new Firebase project, database, Cloud Functions, or second FCM sender are created.

---

## 2. Canonical Collection: `emergencyAlerts/{alertId}`

**Document ID Format**: Created by the original JanmaSaathi PWA (e.g., `EMRG-2026-0894-01`); the Hospital Dashboard listens directly to the same document IDs and never creates duplicate copies.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` / `alertId` | `string` | Yes | Canonical Alert ID matching the Firestore document ID. |
| `recordType` | `"emergencyAlert"` | Yes | JanmaSaathi record discriminator. |
| `motherId` / `relatedMotherId` | `string` | Yes | Reference to existing `mothers/{motherId}` (full maternal profile is never duplicated in alert docs). |
| `sourceRole` | `"mother" \| "health_worker" \| "supervisor"` | Yes | Originating JanmaSaathi interface role. |
| `reportedByUserId` / `reportedByName` | `string` | Yes | Reporter UID / staff ID and display name. |
| `assignedHealthWorkerId` | `string` | Yes | Assigned Health Worker reference (e.g., `HW-44120`). |
| `facilityId` | `string` | Yes | Target authorized hospital facility ID / code (e.g., `HOSP-KHORDHA-DH`). |
| `alertCategory` | `string` | Yes | Approved clinical alert category. |
| `triggerTitle` / `symptomDescription` / `symptoms` | `string` / `string[]` | Yes | Reporter-provided clinical description and signs. |
| `vitals` | `map` | Optional | Available vitals at submission time (no fabricated values). |
| `priority` / `priorityBasis` | `string` | Yes | Protocol-assigned urgency (`Critical`, `High Priority`, `Moderate`, `Low`). |
| `status` | `string` | Yes | Lifecycle state: `NEW`, `ACKNOWLEDGED`, `IN PROGRESS`, `REFERRED / ACTION TAKEN`, `RESOLVED`, `CLOSED`. |
| `duplicateSubmissionCount` / `duplicateSubmissions` | `number` / `array` | Yes | Preserved duplicate reports (never silently discarded). |
| `hospitalResponse` / `responseHistory` / `returnCommunication` | `map` / `array` | Yes | Hospital triage response, append-only audit trail, and status sync metadata. |
| `createdAt` / `updatedAt` / `submittedAt` | `Timestamp` | Yes | Authoritative timestamps. |

---

## 3. Shared Authentication & Authorized Domains

- **Hospital-Only Login**: The Hospital Dashboard preserves the approved Hospital-only **Email/Password** login interface (`signInWithEmailAndPassword` + `sendPasswordResetEmail`). **Google Sign-In is NOT used or enabled** on the Hospital Dashboard.
- **Role Verification (`users/{uid}`)**: Every authenticated Firebase user is verified against `users/{uid}` in `ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df`. In Firebase Integration Mode, only authorized **Hospital Staff** and **Supervisors** with an assigned `facilityId` / `allowedFacilityIds` may access the Hospital Dashboard; Mother, Health Worker, and unrecognized accounts are fail-closed blocked.
- **Firebase Authentication Authorized Domains**:
  Add ONLY these two verified Hospital Dashboard origins in **Firebase Console → Authentication → Settings → Authorized domains** (confirmed absent in live `identitytoolkit` project config probe):
  1. `ais-dev-seppx2sq3vxweq2mboek47-512493056751.asia-southeast1.run.app`
  2. `ais-pre-seppx2sq3vxweq2mboek47-512493056751.asia-southeast1.run.app`

---

## 4. Strict Facility-Level Firestore Security Rules (`firestore.rules`)

The complete fail-closed ruleset is maintained in `/backend/firestore.rules`. Deploy it to the exact named database in `outr-janmasaathi`:

```bash
firebase deploy --only firestore:rules --project outr-janmasaathi
```

Key enforcement points:
- Supports authenticated Hospital personnel and Supervisors reading strictly facility-scoped records across `mothers`, `assessments`, `healthUpdates`, `referrals`, `appointments`, `reports`, `emergencyAlerts`, `auditLogs`, `healthWorkers`, `supervisors`, `assignments`, and `messages`.
- Zero blanket `request.auth != null` read/write rules; default catch-all denies everything.
- `users/{uid}/fcmTokens/{deviceId}` allows read/write strictly for `request.auth.uid == uid` and validates that `facilityId` belongs to the user's authorized facility list.
- Legacy `alerts/{alertId}` is explicitly denied (`allow read, write: if false;`).
- Critical emergency alerts cannot transition directly to `CLOSED` without passing through `RESOLVED`.

---

## 5. FCM Receiver Architecture (No Duplicate Sender)

- **Web Push VAPID Public Key**: Configured in `frontend/src/lib/firebaseConfig.ts` (`vapidKey`, verified 65-byte uncompressed P-256 public key).
- **Minimal FCM-Only Service Worker**: `/frontend/public/firebase-messaging-sw.js` handles `onBackgroundMessage` and `notificationclick` deep-linking (`/?alertId=...` or `JANMASAATHI_OPEN_ALERT` postMessage). No PWA manifest or offline caching is added.
- **Privacy Guarantee**: Background and OS notifications display strictly generic non-sensitive text (`"New maternal health alert requires attention."`) and `alertId` routing metadata only — never mother names, medical history, or symptoms.
- **Device Token Storage**: Registered per-browser under `users/{uid}/fcmTokens/{deviceId}` tied to `uid`, `role`, `facilityId`, and `allowedFacilityIds`, and automatically deleted on disable or sign-out.

---

## 6. Storage Investigation & Voice Communication Architecture

- **Live Probe Result**:
  - `https://firebasestorage.googleapis.com/v0/b/outr-janmasaathi.firebasestorage.app/o` → `HTTP 404 Not Found.`
  - `https://storage.googleapis.com/storage/v1/b/outr-janmasaathi.firebasestorage.app` → `HTTP 404 The specified bucket does not exist.`
  - Legacy `outr-janmasaathi.appspot.com` → `HTTP 404 The specified bucket does not exist.`
- **Conclusion**: Firebase Storage has **not** been initialized in `outr-janmasaathi`. Do **not** auto-create a bucket and do **not** make Storage public.
- **Voice Messages Architecture**: Existing voice messages in the JanmaSaathi ecosystem use the original PWA server's **`/api/voice-messages`** endpoint rather than Firebase Storage. The Hospital Dashboard treats uninitialized Firebase Storage as non-blocking (`not-initialized`) so clinical workflows and `/api/voice-messages` audio are never disrupted.
- **If Direct Firebase Storage Uploads Are Later Required**:
  1. Open **Firebase Console → Project `outr-janmasaathi` → Build → Storage → Get started** and initialize the default bucket in **Production mode** (locked private rules, never public).
  2. Configure authenticated, facility-scoped Storage Security Rules matching `users/{uid}` role/facility claims before enabling client uploads.
