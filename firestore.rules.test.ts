/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads described in security_spec.md
 * are rejected by firestore.rules with PERMISSION_DENIED.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  auth: { uid: string; email_verified: boolean } | null;
  docId: string;
  payload: Record<string, unknown>;
  expected: "PERMISSION_DENIED";
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 1,
    name: "Unauthenticated create attempt",
    auth: null,
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 2,
    name: "Unverified email create attempt",
    auth: { uid: "user_1", email_verified: false },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 3,
    name: "Identity spoofing with mismatched ownerId",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_2",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 4,
    name: "Shadow field injection (extra ghost key)",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
      isVerifiedAdmin: true,
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 5,
    name: "Missing required summary field",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 6,
    name: "Path variable ID poisoning",
    auth: { uid: "user_1", email_verified: true },
    docId: "invalid$id!with*bad^chars",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 7,
    name: "Oversized gameTitle exceeding 120 chars",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "G".repeat(125),
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 8,
    name: "Oversized summary exceeding 600 chars",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "S".repeat(605),
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 9,
    name: "Out-of-range riskScore (150)",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 150,
      riskLevel: "HIGH",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 10,
    name: "Invalid riskLevel enum value",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 80,
      riskLevel: "EXTREME",
      summary: "Valid summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 11,
    name: "Forged client timestamp not matching request.time",
    auth: { uid: "user_1", email_verified: true },
    docId: "scan_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Valid summary",
      createdAt: "2020-01-01T00:00:00Z",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 12,
    name: "Cross-user modification attempt",
    auth: { uid: "attacker_uid", email_verified: true },
    docId: "scan_owned_by_user_1",
    payload: {
      ownerId: "user_1",
      gameTitle: "Test Game",
      riskScore: 50,
      riskLevel: "MEDIUM",
      summary: "Tampered summary",
      createdAt: "SERVER_TIMESTAMP",
    },
    expected: "PERMISSION_DENIED",
  },
];
