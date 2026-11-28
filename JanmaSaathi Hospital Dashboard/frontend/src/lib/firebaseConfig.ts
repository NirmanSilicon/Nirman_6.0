/**
 * Centralized Firebase Web Configuration for the JanmaSaathi Hospital Dashboard.
 *
 * Connects to the existing JanmaSaathi Firebase project ("outr-janmasaathi")
 * and its exact named Firestore database ("ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df").
 *
 * Security notice:
 * - These values are scoped public Firebase Web App identifiers only.
 * - Never place Firebase Admin SDK credentials, service account private keys,
 *   database passwords, or backend signing secrets in this file.
 * - Strictly erasable TypeScript syntax is preserved so both the Vite frontend
 *   and Node.js 22 (`node server.ts`) can import this module directly.
 */

export interface JanmaSaathiFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseId: string;
  /** Optional Firebase Cloud Messaging Web Push VAPID public key (never a private key). */
  vapidKey: string;
}

export const JANMASAATHI_FIREBASE_CONFIG: Readonly<JanmaSaathiFirebaseConfig> = Object.freeze({
  apiKey: 'AIzaSyApivsKXxGwZXbQxjvaVleKONQYz2ExiBY',
  authDomain: 'outr-janmasaathi.firebaseapp.com',
  projectId: 'outr-janmasaathi',
  storageBucket: 'outr-janmasaathi.firebasestorage.app',
  messagingSenderId: '12503123299',
  appId: '1:12503123299:web:1ec9775245e417f1d2ff56',
  databaseId: 'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df',
  vapidKey: 'BPokUlqwCOdSRjiu3MwRgUyIKu0C_03pIBzXkiH23HHNF71pp0zm9j9ffvidQvtBs0LfQOgRKCm3ECK4BDsMfKk',
});
