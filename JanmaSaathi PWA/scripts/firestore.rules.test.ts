import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
} from 'firebase/firestore';

const PROJECT_ID = 'outr-janmasaathi';
const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function runCase(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true, details: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, details: err?.message || String(err) });
    console.error(`❌ FAIL: ${name}\n   ${err?.stack || err}`);
  }
}

function buildValidAlert(overrides: Record<string, any> = {}) {
  const now = Date.now();
  return {
    id: 'ALT-TEST-001',
    motherId: 'MCP-2026-0894',
    motherName: 'Priya Sharma',
    assignedWorkerId: 'HW-44120',
    assignedWorkerName: 'Sunita Devi',
    supervisorId: 'SUP-2025-012',
    raisedByRole: 'mother',
    raisedById: 'MCP-2026-0894',
    raisedByName: 'Priya Sharma',
    raisedByAuthUid: 'uid-mother-priya',
    targetHospitalId: 'HOSP-RAMPUR-PHC',
    targetHospitalName: 'Rampur Primary Health Centre (PHC)',
    targetFacilityType: 'PHC',
    concernCategory: 'high_bp',
    concernLabel: 'High Blood Pressure',
    urgency: 'urgent',
    symptoms: ['Headache'],
    description: 'Headache and high blood pressure reading.',
    status: 'pending_acknowledgement',
    createdAtMs: now,
    createdAtIso: new Date(now).toISOString(),
    createdAtLabel: 'Just now',
    updatedAtMs: now,
    hospitalUpdates: [],
    escalated: false,
    isSynthetic: true,
    ...overrides,
  };
}

async function seedBaselineData(testEnv: RulesTestEnvironment) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Users (for role fallback & audit verification)
    await setDoc(doc(db, 'users', 'uid-mother-priya'), {
      uid: 'uid-mother-priya',
      email: 'priya.sharma@example.com',
      role: 'mother',
      motherId: 'MCP-2026-0894',
      displayName: 'Priya Sharma',
    });
    await setDoc(doc(db, 'users', 'uid-worker-sunita'), {
      uid: 'uid-worker-sunita',
      role: 'worker',
      staffId: 'HW-44120',
      displayName: 'Sunita Devi',
    });
    await setDoc(doc(db, 'users', 'uid-sup-rajesh'), {
      uid: 'uid-sup-rajesh',
      role: 'supervisor',
      staffId: 'SUP-2025-012',
      displayName: 'Dr. Rajesh Kumar',
    });
    // Legacy role string 'hospital' in /users/{uid} to verify backward-compatible normalization
    await setDoc(doc(db, 'users', 'uid-hosp-legacy-rampur'), {
      uid: 'uid-hosp-legacy-rampur',
      role: 'hospital',
      hospitalId: 'HOSP-RAMPUR-PHC',
      displayName: 'Dr. Pradhan Legacy',
    });

    // Hospitals
    await setDoc(doc(db, 'hospitals', 'HOSP-RAMPUR-PHC'), {
      id: 'HOSP-RAMPUR-PHC',
      name: 'Rampur Primary Health Centre (PHC)',
      facilityType: 'PHC',
      block: 'Rampur Block',
      district: 'Khordha',
      contactPhone: '+91 6755 241010',
      acceptsEmergency: true,
    });
    await setDoc(doc(db, 'hospitals', 'HOSP-PIPILI-CHC'), {
      id: 'HOSP-PIPILI-CHC',
      name: 'Pipili Community Health Centre (CHC)',
      facilityType: 'CHC',
      block: 'Pipili Block',
      district: 'Khordha',
      contactPhone: '+91 6758 242211',
      acceptsEmergency: true,
    });

    // Mothers (assigned vs other vs hospital-linked)
    await setDoc(doc(db, 'mothers', 'MCP-2026-0894'), {
      id: 'MCP-2026-0894',
      mcpCardNumber: 'MCP-2026-0894',
      name: 'Priya Sharma',
      assignedWorkerId: 'HW-44120',
      hospitalId: 'HOSP-RAMPUR-PHC',
      authUid: 'uid-mother-priya',
      riskCategory: 'low',
    });
    await setDoc(doc(db, 'mothers', 'MCP-2026-5000'), {
      id: 'MCP-2026-5000',
      mcpCardNumber: 'MCP-2026-5000',
      name: 'Other Mother',
      assignedWorkerId: 'HW-002',
      hospitalId: 'HOSP-PIPILI-CHC',
      authUid: 'uid-mother-other',
      riskCategory: 'medium',
    });

    // Assessments
    await setDoc(doc(db, 'assessments', 'ASMT-RAMPUR-01'), {
      id: 'ASMT-RAMPUR-01',
      motherId: 'MCP-2026-0894',
      workerId: 'HW-44120',
      hospitalId: 'HOSP-RAMPUR-PHC',
      supervisorReviewStatus: 'pending',
    });
    await setDoc(doc(db, 'assessments', 'ASMT-PIPILI-01'), {
      id: 'ASMT-PIPILI-01',
      motherId: 'MCP-2026-5000',
      workerId: 'HW-002',
      hospitalId: 'HOSP-PIPILI-CHC',
      supervisorReviewStatus: 'pending',
    });

    // Health Updates
    await setDoc(doc(db, 'healthUpdates', 'HU-RAMPUR-01'), {
      healthUpdateId: 'HU-RAMPUR-01',
      motherId: 'MCP-2026-0894',
      assignedHealthWorkerId: 'HW-44120',
      hospitalId: 'HOSP-RAMPUR-PHC',
      observations: 'Mild headache',
      reviewStatus: 'pending',
    });
    await setDoc(doc(db, 'healthUpdates', 'HU-PIPILI-01'), {
      healthUpdateId: 'HU-PIPILI-01',
      motherId: 'MCP-2026-5000',
      assignedHealthWorkerId: 'HW-002',
      hospitalId: 'HOSP-PIPILI-CHC',
      observations: 'Fatigue',
      reviewStatus: 'pending',
    });

    // Referrals
    await setDoc(doc(db, 'referrals', 'REF-RAMPUR-01'), {
      id: 'REF-RAMPUR-01',
      motherId: 'MCP-2026-0894',
      workerId: 'HW-44120',
      targetHospitalId: 'HOSP-RAMPUR-PHC',
      referredToFacility: 'Rampur Primary Health Centre (PHC)',
      status: 'initiated',
      transportArranged: true,
    });
    await setDoc(doc(db, 'referrals', 'REF-PIPILI-01'), {
      id: 'REF-PIPILI-01',
      motherId: 'MCP-2026-5000',
      workerId: 'HW-002',
      targetHospitalId: 'HOSP-PIPILI-CHC',
      referredToFacility: 'Pipili Community Health Centre (CHC)',
      status: 'initiated',
      transportArranged: false,
    });

    // Appointments
    await setDoc(doc(db, 'appointments', 'APT-RAMPUR-01'), {
      id: 'APT-RAMPUR-01',
      motherId: 'MCP-2026-0894',
      workerId: 'HW-44120',
      hospitalId: 'HOSP-RAMPUR-PHC',
      date: '2026-11-28',
      time: '10:30 AM',
      status: 'confirmed',
    });
    await setDoc(doc(db, 'appointments', 'APT-PIPILI-01'), {
      id: 'APT-PIPILI-01',
      motherId: 'MCP-2026-5000',
      workerId: 'HW-002',
      hospitalId: 'HOSP-PIPILI-CHC',
      date: '2026-11-29',
      time: '11:00 AM',
      status: 'confirmed',
    });

    // Reports
    await setDoc(doc(db, 'reports', 'RPT-RAMPUR-01'), {
      id: 'RPT-RAMPUR-01',
      title: 'Rampur Monthly Triage Summary',
      type: 'facility_summary',
      hospitalId: 'HOSP-RAMPUR-PHC',
      workerId: 'HW-44120',
      status: 'published',
    });
    await setDoc(doc(db, 'reports', 'RPT-PIPILI-01'), {
      id: 'RPT-PIPILI-01',
      title: 'Pipili Monthly Triage Summary',
      type: 'facility_summary',
      hospitalId: 'HOSP-PIPILI-CHC',
      workerId: 'HW-002',
      status: 'published',
    });

    // Emergency Alerts
    await setDoc(
      doc(db, 'emergencyAlerts', 'ALT-RAMPUR-01'),
      buildValidAlert({
        id: 'ALT-RAMPUR-01',
        motherId: 'MCP-2026-0894',
        assignedWorkerId: 'HW-44120',
        targetHospitalId: 'HOSP-RAMPUR-PHC',
      })
    );
    await setDoc(
      doc(db, 'emergencyAlerts', 'ALT-PIPILI-01'),
      buildValidAlert({
        id: 'ALT-PIPILI-01',
        motherId: 'MCP-2026-5000',
        motherName: 'Other Mother',
        assignedWorkerId: 'HW-002',
        raisedById: 'MCP-2026-5000',
        raisedByName: 'Other Mother',
        raisedByAuthUid: 'uid-mother-other',
        targetHospitalId: 'HOSP-PIPILI-CHC',
        targetHospitalName: 'Pipili Community Health Centre (CHC)',
        targetFacilityType: 'CHC',
      })
    );
    await setDoc(
      doc(db, 'emergencyAlerts', 'ALT-CLOSED-01'),
      buildValidAlert({
        id: 'ALT-CLOSED-01',
        status: 'closed',
        targetHospitalId: 'HOSP-RAMPUR-PHC',
      })
    );

    // Audit Logs
    await setDoc(doc(db, 'auditLogs', 'LOG-RAMPUR-01'), {
      id: 'LOG-RAMPUR-01',
      action: 'alert_acknowledged',
      actorId: 'uid-hosp-rampur',
      actorUid: 'uid-hosp-rampur',
      actorRole: 'hospital_staff',
      hospitalId: 'HOSP-RAMPUR-PHC',
      targetResource: 'emergencyAlerts',
      targetId: 'ALT-RAMPUR-01',
    });
    await setDoc(doc(db, 'auditLogs', 'LOG-PIPILI-01'), {
      id: 'LOG-PIPILI-01',
      action: 'alert_acknowledged',
      actorId: 'uid-hosp-pipili',
      actorUid: 'uid-hosp-pipili',
      actorRole: 'hospital_staff',
      hospitalId: 'HOSP-PIPILI-CHC',
      targetResource: 'emergencyAlerts',
      targetId: 'ALT-PIPILI-01',
    });

    // Companion Memories (Mother-only private AI summary)
    await setDoc(doc(db, 'companionMemories', 'MEM-PRIYA-01'), {
      id: 'MEM-PRIYA-01',
      motherId: 'MCP-2026-0894',
      authUid: 'uid-mother-priya',
      title: 'Iron Diet Guidance',
      summary: 'Eat spinach and vitamin C rich foods.',
      topic: 'nutrition',
      language: 'en',
      consentedByMother: true,
      isClinicalRecord: false,
    });
  });
}

async function main() {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });

  try {
    await testEnv.clearFirestore();
    await seedBaselineData(testEnv);

    // Contexts using Canonical Custom Claims
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const motherDb = testEnv
      .authenticatedContext('uid-mother-priya', { role: 'mother', motherId: 'MCP-2026-0894' })
      .firestore();
    const workerDb = testEnv
      .authenticatedContext('uid-worker-sunita', { role: 'worker', staffId: 'HW-44120' })
      .firestore();
    const supervisorDb = testEnv
      .authenticatedContext('uid-sup-rajesh', { role: 'supervisor', staffId: 'SUP-2025-012' })
      .firestore();
    const rampurHospitalDb = testEnv
      .authenticatedContext('uid-hosp-rampur', {
        role: 'hospital_staff',
        hospitalId: 'HOSP-RAMPUR-PHC',
      })
      .firestore();
    // Legacy role ('hospital') resolved via /users/{uid} doc fallback without custom claims
    const legacyRampurHospitalDb = testEnv
      .authenticatedContext('uid-hosp-legacy-rampur')
      .firestore();
    // Unassigned hospital user (hospitalId: null) — must be denied cross-facility access
    const unassignedHospitalDb = testEnv
      .authenticatedContext('uid-hosp-unassigned', { role: 'hospital_staff' })
      .firestore();

    // 1. Mother allowed own / denied others
    await runCase('1. Mother allowed own records and denied other mother records', async () => {
      await assertSucceeds(getDoc(doc(motherDb, 'mothers', 'MCP-2026-0894')));
      await assertSucceeds(getDoc(doc(motherDb, 'assessments', 'ASMT-RAMPUR-01')));
      await assertSucceeds(getDoc(doc(motherDb, 'emergencyAlerts', 'ALT-RAMPUR-01')));
      await assertSucceeds(getDoc(doc(motherDb, 'companionMemories', 'MEM-PRIYA-01')));
      await assertSucceeds(
        setDoc(doc(motherDb, 'healthUpdates', 'HU-MOTHER-NEW'), {
          healthUpdateId: 'HU-MOTHER-NEW',
          motherId: 'MCP-2026-0894',
          assignedHealthWorkerId: 'HW-44120',
          observations: 'Feeling well after rest.',
          reviewStatus: 'pending',
        })
      );
      await assertSucceeds(
        setDoc(doc(motherDb, 'users', 'uid-mother-priya', 'fcmTokens', 'TOK-MOTHER-1234'), {
          id: 'TOK-MOTHER-1234',
          token: 'valid-fcm-token-value-1234567890',
          uid: 'uid-mother-priya',
          role: 'mother',
          motherId: 'MCP-2026-0894',
          platform: 'web',
          enabled: true,
          updatedAtMs: Date.now(),
        })
      );

      // Denials on other mother's records & staff-only writes
      await assertFails(getDoc(doc(motherDb, 'mothers', 'MCP-2026-5000')));
      await assertFails(getDoc(doc(motherDb, 'assessments', 'ASMT-PIPILI-01')));
      await assertFails(getDoc(doc(motherDb, 'healthUpdates', 'HU-PIPILI-01')));
      await assertFails(getDoc(doc(motherDb, 'emergencyAlerts', 'ALT-PIPILI-01')));
      await assertFails(
        setDoc(doc(motherDb, 'healthUpdates', 'HU-SPOOF-OTHER'), {
          healthUpdateId: 'HU-SPOOF-OTHER',
          motherId: 'MCP-2026-5000',
          observations: 'Spoofed',
        })
      );
      await assertFails(getDoc(doc(motherDb, 'reports', 'RPT-RAMPUR-01')));
    });

    // 2. Health Worker allowed assigned / denied unassigned
    await runCase('2. Health Worker allowed assigned mothers and denied unassigned mothers', async () => {
      await assertSucceeds(getDoc(doc(workerDb, 'mothers', 'MCP-2026-0894')));
      await assertSucceeds(
        updateDoc(doc(workerDb, 'mothers', 'MCP-2026-0894'), {
          lastVisitSummary: 'Routine check complete',
          riskCategory: 'low',
        })
      );
      await assertSucceeds(
        setDoc(doc(workerDb, 'assessments', 'ASMT-WORKER-NEW'), {
          id: 'ASMT-WORKER-NEW',
          motherId: 'MCP-2026-0894',
          workerId: 'HW-44120',
          supervisorReviewStatus: 'pending',
        })
      );
      await assertSucceeds(getDoc(doc(workerDb, 'emergencyAlerts', 'ALT-RAMPUR-01')));

      // Denials on unassigned mother (assigned to HW-002)
      await assertFails(getDoc(doc(workerDb, 'mothers', 'MCP-2026-5000')));
      await assertFails(
        updateDoc(doc(workerDb, 'mothers', 'MCP-2026-5000'), {
          lastVisitSummary: 'Unauthorized tamper',
        })
      );
      await assertFails(getDoc(doc(workerDb, 'assessments', 'ASMT-PIPILI-01')));
      await assertFails(getDoc(doc(workerDb, 'emergencyAlerts', 'ALT-PIPILI-01')));
      await assertFails(
        setDoc(doc(workerDb, 'assessments', 'ASMT-SPOOF-WORKER'), {
          id: 'ASMT-SPOOF-WORKER',
          motherId: 'MCP-2026-5000',
          workerId: 'HW-002',
        })
      );
    });

    // 3. Supervisor authorized scope
    await runCase('3. Supervisor authorized within block scope; immutable deletes denied', async () => {
      await assertSucceeds(getDoc(doc(supervisorDb, 'users', 'uid-mother-priya')));
      await assertSucceeds(getDoc(doc(supervisorDb, 'mothers', 'MCP-2026-5000')));
      await assertSucceeds(getDoc(doc(supervisorDb, 'auditLogs', 'LOG-PIPILI-01')));
      await assertSucceeds(
        updateDoc(doc(supervisorDb, 'assessments', 'ASMT-RAMPUR-01'), {
          supervisorReviewStatus: 'signed_off',
          supervisorNotes: 'Reviewed and signed off by SUP-2025-012.',
        })
      );
      await assertSucceeds(
        setDoc(doc(supervisorDb, 'reports', 'RPT-SUP-01'), {
          id: 'RPT-SUP-01',
          title: 'Block Maternal Audit',
          type: 'block_audit',
          status: 'published',
          hospitalId: 'HOSP-RAMPUR-PHC',
        })
      );

      // Denials: no deletes, no client writes to alertNotificationDeliveries
      await assertFails(deleteDoc(doc(supervisorDb, 'mothers', 'MCP-2026-0894')));
      await assertFails(deleteDoc(doc(supervisorDb, 'auditLogs', 'LOG-RAMPUR-01')));
      await assertFails(
        setDoc(doc(supervisorDb, 'alertNotificationDeliveries', 'DELIV-1'), {
          id: 'DELIV-1',
          alertId: 'ALT-RAMPUR-01',
          eventType: 'alert_created',
          status: 'dispatched',
          dispatchedAtMs: Date.now(),
        })
      );
    });

    // 4. Hospital Staff allowed for assigned hospital facility (across all 10 collections + legacy role fallback)
    await runCase('4. Hospital Staff allowed for assigned hospital facility across all 10 collections', async () => {
      // hospitals
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'hospitals', 'HOSP-RAMPUR-PHC')));
      await assertSucceeds(
        updateDoc(doc(rampurHospitalDb, 'hospitals', 'HOSP-RAMPUR-PHC'), {
          name: 'Rampur Primary Health Centre (PHC)',
          facilityType: 'PHC',
          contactPhone: '+91 6755 241099',
          acceptsEmergency: true,
        })
      );

      // mothers (get & scoped list)
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'mothers', 'MCP-2026-0894')));
      await assertSucceeds(
        getDocs(query(collection(rampurHospitalDb, 'mothers'), where('hospitalId', '==', 'HOSP-RAMPUR-PHC')))
      );

      // assessments & healthUpdates
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'assessments', 'ASMT-RAMPUR-01')));
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'healthUpdates', 'HU-RAMPUR-01')));

      // referrals (read & facility triage update)
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'referrals', 'REF-RAMPUR-01')));
      await assertSucceeds(
        updateDoc(doc(rampurHospitalDb, 'referrals', 'REF-RAMPUR-01'), {
          status: 'acknowledged',
          hospitalRemarks: 'Antenatal bed ready at Rampur PHC.',
        })
      );

      // appointments (read, create, update)
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'appointments', 'APT-RAMPUR-01')));
      await assertSucceeds(
        setDoc(doc(rampurHospitalDb, 'appointments', 'APT-RAMPUR-NEW'), {
          id: 'APT-RAMPUR-NEW',
          motherId: 'MCP-2026-0894',
          hospitalId: 'HOSP-RAMPUR-PHC',
          date: '2026-12-02',
          time: '09:30 AM',
          status: 'scheduled',
        })
      );
      await assertSucceeds(
        updateDoc(doc(rampurHospitalDb, 'appointments', 'APT-RAMPUR-NEW'), {
          status: 'confirmed',
        })
      );

      // reports (read, create, update)
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'reports', 'RPT-RAMPUR-01')));
      await assertSucceeds(
        setDoc(doc(rampurHospitalDb, 'reports', 'RPT-RAMPUR-NEW'), {
          id: 'RPT-RAMPUR-NEW',
          title: 'Daily Maternity Desk Log',
          type: 'facility_daily',
          status: 'draft',
          hospitalId: 'HOSP-RAMPUR-PHC',
        })
      );
      await assertSucceeds(
        updateDoc(doc(rampurHospitalDb, 'reports', 'RPT-RAMPUR-NEW'), {
          status: 'published',
        })
      );

      // emergencyAlerts (read & scoped list)
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-RAMPUR-01')));
      await assertSucceeds(
        getDocs(
          query(
            collection(rampurHospitalDb, 'emergencyAlerts'),
            where('targetHospitalId', '==', 'HOSP-RAMPUR-PHC')
          )
        )
      );

      // auditLogs (read & create)
      await assertSucceeds(getDoc(doc(rampurHospitalDb, 'auditLogs', 'LOG-RAMPUR-01')));
      await assertSucceeds(
        setDoc(doc(rampurHospitalDb, 'auditLogs', 'LOG-RAMPUR-NEW'), {
          id: 'LOG-RAMPUR-NEW',
          action: 'hospital_triage_viewed',
          actorId: 'uid-hosp-rampur',
          actorUid: 'uid-hosp-rampur',
          actorRole: 'hospital_staff',
          hospitalId: 'HOSP-RAMPUR-PHC',
          targetResource: 'emergencyAlerts',
          targetId: 'ALT-RAMPUR-01',
        })
      );

      // users/{uid}/fcmTokens (create, read, delete)
      await assertSucceeds(
        setDoc(doc(rampurHospitalDb, 'users', 'uid-hosp-rampur', 'fcmTokens', 'TOK-RAMPUR-1234'), {
          id: 'TOK-RAMPUR-1234',
          token: 'valid-hospital-fcm-token-1234567890',
          uid: 'uid-hosp-rampur',
          role: 'hospital_staff',
          hospitalId: 'HOSP-RAMPUR-PHC',
          platform: 'web',
          enabled: true,
          updatedAtMs: Date.now(),
        })
      );
      await assertSucceeds(
        getDoc(doc(rampurHospitalDb, 'users', 'uid-hosp-rampur', 'fcmTokens', 'TOK-RAMPUR-1234'))
      );

      // Legacy /users/{uid}.role == 'hospital' mapping fallback
      await assertSucceeds(getDoc(doc(legacyRampurHospitalDb, 'emergencyAlerts', 'ALT-RAMPUR-01')));
    });

    // 5. Hospital Staff DENIED for other hospital facilities & private non-facility collections
    await runCase('5. Hospital Staff denied cross-facility access and unassigned/private reads', async () => {
      await assertFails(
        updateDoc(doc(rampurHospitalDb, 'hospitals', 'HOSP-PIPILI-CHC'), {
          contactPhone: '+91 00000 00000',
        })
      );
      await assertFails(getDoc(doc(rampurHospitalDb, 'mothers', 'MCP-2026-5000')));
      await assertFails(getDoc(doc(rampurHospitalDb, 'assessments', 'ASMT-PIPILI-01')));
      await assertFails(getDoc(doc(rampurHospitalDb, 'healthUpdates', 'HU-PIPILI-01')));
      await assertFails(getDoc(doc(rampurHospitalDb, 'referrals', 'REF-PIPILI-01')));
      await assertFails(
        updateDoc(doc(rampurHospitalDb, 'referrals', 'REF-PIPILI-01'), { status: 'acknowledged' })
      );
      await assertFails(getDoc(doc(rampurHospitalDb, 'appointments', 'APT-PIPILI-01')));
      await assertFails(getDoc(doc(rampurHospitalDb, 'reports', 'RPT-PIPILI-01')));
      await assertFails(getDoc(doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-PIPILI-01')));
      await assertFails(
        updateDoc(doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-PIPILI-01'), {
          status: 'acknowledged',
        })
      );
      await assertFails(getDoc(doc(rampurHospitalDb, 'auditLogs', 'LOG-PIPILI-01')));
      await assertFails(
        setDoc(doc(rampurHospitalDb, 'auditLogs', 'LOG-SPOOF-PIPILI'), {
          id: 'LOG-SPOOF-PIPILI',
          action: 'spoof',
          actorId: 'uid-hosp-rampur',
          actorUid: 'uid-hosp-rampur',
          actorRole: 'hospital_staff',
          hospitalId: 'HOSP-PIPILI-CHC',
          targetResource: 'emergencyAlerts',
          targetId: 'ALT-PIPILI-01',
        })
      );
      await assertFails(
        setDoc(doc(rampurHospitalDb, 'users', 'uid-hosp-rampur', 'fcmTokens', 'TOK-SPOOF-1234'), {
          id: 'TOK-SPOOF-1234',
          token: 'valid-hospital-fcm-token-1234567890',
          uid: 'uid-hosp-rampur',
          role: 'hospital_staff',
          hospitalId: 'HOSP-PIPILI-CHC',
          platform: 'web',
          enabled: true,
          updatedAtMs: Date.now(),
        })
      );

      // Unscoped list queries & unassigned hospital staff & private collections denied
      await assertFails(getDocs(collection(rampurHospitalDb, 'emergencyAlerts')));
      await assertFails(getDocs(collection(rampurHospitalDb, 'mothers')));
      await assertFails(getDoc(doc(unassignedHospitalDb, 'emergencyAlerts', 'ALT-RAMPUR-01')));
      await assertFails(getDoc(doc(rampurHospitalDb, 'companionMemories', 'MEM-PRIYA-01')));
    });

    // 6. Unauthenticated read/write denials across protected collections
    await runCase('6. Unauthenticated read/write denials enforced across all collections', async () => {
      await assertFails(getDoc(doc(unauthDb, 'users', 'uid-mother-priya')));
      await assertFails(getDoc(doc(unauthDb, 'hospitals', 'HOSP-RAMPUR-PHC')));
      await assertFails(getDoc(doc(unauthDb, 'mothers', 'MCP-2026-0894')));
      await assertFails(getDoc(doc(unauthDb, 'assessments', 'ASMT-RAMPUR-01')));
      await assertFails(getDoc(doc(unauthDb, 'healthUpdates', 'HU-RAMPUR-01')));
      await assertFails(getDoc(doc(unauthDb, 'referrals', 'REF-RAMPUR-01')));
      await assertFails(getDoc(doc(unauthDb, 'appointments', 'APT-RAMPUR-01')));
      await assertFails(getDoc(doc(unauthDb, 'reports', 'RPT-RAMPUR-01')));
      await assertFails(getDoc(doc(unauthDb, 'emergencyAlerts', 'ALT-RAMPUR-01')));
      await assertFails(getDoc(doc(unauthDb, 'auditLogs', 'LOG-RAMPUR-01')));
      await assertFails(getDoc(doc(unauthDb, 'companionMemories', 'MEM-PRIYA-01')));
      await assertFails(
        setDoc(
          doc(unauthDb, 'emergencyAlerts', 'ALT-ANON-01'),
          buildValidAlert({ id: 'ALT-ANON-01' })
        )
      );
      await assertFails(
        setDoc(doc(unauthDb, 'mothers', 'MCP-ANON-01'), {
          id: 'MCP-ANON-01',
          mcpCardNumber: 'MCP-ANON-01',
          name: 'Spoof',
          assignedWorkerId: 'HW-44120',
        })
      );
      await assertFails(getDoc(doc(unauthDb, 'unknownCollection', 'doc1')));
      // Connectivity probe doc allowed only for single get('test/connection')
      await assertSucceeds(getDoc(doc(unauthDb, 'test', 'connection')));
      await assertFails(getDoc(doc(unauthDb, 'test', 'other')));
    });

    // 7. Valid alert creation (Mother / Worker / Supervisor) + invalid/spoofed alert rejections
    await runCase('7. Valid alert creation allowed for Mother/Worker/Supervisor; spoofed/hospital create denied', async () => {
      await assertSucceeds(
        setDoc(
          doc(motherDb, 'emergencyAlerts', 'ALT-MOTHER-CREATED'),
          buildValidAlert({ id: 'ALT-MOTHER-CREATED' })
        )
      );
      await assertSucceeds(
        setDoc(
          doc(workerDb, 'emergencyAlerts', 'ALT-WORKER-CREATED'),
          buildValidAlert({
            id: 'ALT-WORKER-CREATED',
            raisedByRole: 'worker',
            raisedById: 'HW-44120',
            raisedByName: 'Sunita Devi',
            raisedByAuthUid: 'uid-worker-sunita',
          })
        )
      );
      await assertSucceeds(
        setDoc(
          doc(supervisorDb, 'emergencyAlerts', 'ALT-SUP-CREATED'),
          buildValidAlert({
            id: 'ALT-SUP-CREATED',
            raisedByRole: 'supervisor',
            raisedById: 'SUP-2025-012',
            raisedByName: 'Dr. Rajesh Kumar',
            raisedByAuthUid: 'uid-sup-rajesh',
          })
        )
      );

      // Denials: Hospital staff creating alerts, spoofed hospital ID, or escalated: true on create
      await assertFails(
        setDoc(
          doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-HOSP-SPOOF'),
          buildValidAlert({ id: 'ALT-HOSP-SPOOF', raisedByAuthUid: 'uid-hosp-rampur' })
        )
      );
      await assertFails(
        setDoc(
          doc(motherDb, 'emergencyAlerts', 'ALT-INVALID-HOSP'),
          buildValidAlert({ id: 'ALT-INVALID-HOSP', targetHospitalId: 'HOSP-FAKE-999' })
        )
      );
      await assertFails(
        setDoc(
          doc(motherDb, 'emergencyAlerts', 'ALT-ESCALATED-CREATE'),
          buildValidAlert({ id: 'ALT-ESCALATED-CREATE', escalated: true })
        )
      );
    });

    // 8. Valid hospital acknowledgement + immutable/terminal protection
    await runCase('8. Valid hospital acknowledgement allowed; immutable fields & closed state protected', async () => {
      const ackMs = Date.now();
      await assertSucceeds(
        updateDoc(doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-RAMPUR-01'), {
          status: 'acknowledged',
          updatedAtMs: ackMs,
          acknowledgedAtMs: ackMs,
          acknowledgedBy: 'Dr. Pradhan (MOIC)',
          hospitalResponse: 'Antenatal triage bay ready.',
          hospitalUpdates: [
            {
              id: 'UPD-1',
              timestampIso: new Date(ackMs).toISOString(),
              timestampLabel: 'Now',
              actorName: 'Dr. Pradhan',
              actorRole: 'hospital',
              status: 'acknowledged',
              note: 'Acknowledged at Rampur PHC.',
            },
          ],
        })
      );

      // Denials: mutating immutable motherId, injecting shadow key, shrinking updates, or editing closed alert
      await assertFails(
        updateDoc(doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-RAMPUR-01'), {
          motherId: 'MCP-TAMPERED',
          status: 'in_progress',
        })
      );
      await assertFails(
        updateDoc(doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-RAMPUR-01'), {
          hospitalUpdates: [],
          status: 'in_progress',
        })
      );
      await assertFails(
        updateDoc(doc(rampurHospitalDb, 'emergencyAlerts', 'ALT-CLOSED-01'), {
          status: 'acknowledged',
        })
      );
    });

    // 9. Privilege escalation & /users/{uid} RBAC protection
    await runCase('9. /users/{uid} blocks self-assigned privileged roles and RBAC tampering', async () => {
      const freshUserDb = testEnv.authenticatedContext('uid-fresh-attacker').firestore();
      await assertFails(
        setDoc(doc(freshUserDb, 'users', 'uid-fresh-attacker'), {
          uid: 'uid-fresh-attacker',
          role: 'hospital_staff',
          hospitalId: 'HOSP-RAMPUR-PHC',
        })
      );
      await assertFails(
        setDoc(doc(freshUserDb, 'users', 'uid-fresh-attacker-sup'), {
          uid: 'uid-fresh-attacker-sup',
          role: 'supervisor',
          staffId: 'SUP-2025-012',
        })
      );
      await assertFails(
        updateDoc(doc(motherDb, 'users', 'uid-mother-priya'), {
          role: 'supervisor',
        })
      );
      await assertFails(
        updateDoc(doc(legacyRampurHospitalDb, 'users', 'uid-hosp-legacy-rampur'), {
          hospitalId: 'HOSP-PIPILI-CHC',
        })
      );
      await assertFails(
        getDoc(doc(motherDb, 'users', 'uid-hosp-rampur', 'fcmTokens', 'TOK-RAMPUR-1234'))
      );
    });
  } finally {
    await testEnv.cleanup();
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n=== FIRESTORE EMULATOR SECURITY TEST SUMMARY: ${passedCount}/${results.length} PASSED ===`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal emulator test harness error:', err);
  process.exit(1);
});
