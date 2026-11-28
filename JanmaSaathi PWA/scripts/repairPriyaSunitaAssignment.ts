import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
  DEMO_MOTHERS,
  DEMO_WORKERS,
  DEMO_MESSAGES,
  DEMO_ASSESSMENTS,
  DEMO_HEALTH_UPDATES,
  DEMO_APPOINTMENTS,
  DEMO_VILLAGE_ALLOCATIONS,
  AUTHORIZED_HOSPITALS,
} from '../frontend/src/data/centralDemoData';

const EXPECTED_PROJECT_ID = 'outr-janmasaathi';
const EXPECTED_DATABASE_ID = 'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df';
const PRIYA_ID = 'MCP-2026-0894';
const SUNITA_ID = 'HW-44120';
const KABITA_ID = 'HW-002';
const CANONICAL_CONVERSATION_ID = `conv_${PRIYA_ID}_${SUNITA_ID}`;

interface RepairAction {
  collection: string;
  docId: string;
  action: 'create' | 'repair_linkage' | 'noop';
  details: string;
  fieldsToSet?: Record<string, any>;
}

function cleanUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        out[k] = cleanUndefined(v);
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}

function loadAppletConfig(): { projectId: string; firestoreDatabaseId: string } {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(cfgPath)) {
    return { projectId: EXPECTED_PROJECT_ID, firestoreDatabaseId: EXPECTED_DATABASE_ID };
  }
  const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  return {
    projectId: parsed.projectId || EXPECTED_PROJECT_ID,
    firestoreDatabaseId: parsed.firestoreDatabaseId || EXPECTED_DATABASE_ID,
  };
}

function buildBaselinePlan(): RepairAction[] {
  const actions: RepairAction[] = [];

  for (const workerId of [SUNITA_ID, KABITA_ID]) {
    const w = DEMO_WORKERS.find((x) => x.id === workerId);
    if (w) {
      actions.push({
        collection: 'healthWorkers',
        docId: w.id,
        action: 'create',
        details: `Ensure health worker ${w.name} (${w.id}) exists cleanly`,
        fieldsToSet: cleanUndefined(w),
      });
    }
  }

  const priya = DEMO_MOTHERS.find((m) => m.id === PRIYA_ID);
  if (priya) {
    actions.push({
      collection: 'mothers',
      docId: priya.id,
      action: 'repair_linkage',
      details: `Ensure Priya Sharma (${PRIYA_ID}) is assigned to Sunita Devi (${SUNITA_ID}) without overwriting clinical/pregnancy fields`,
      fieldsToSet: cleanUndefined({
        ...priya,
        assignedWorkerId: SUNITA_ID,
        assignedWorkerName: 'Sunita Devi',
      }),
    });
  }

  const va001 = DEMO_VILLAGE_ALLOCATIONS.find((v) => v.id === 'VA-001');
  if (va001) {
    actions.push({
      collection: 'assignments',
      docId: va001.id,
      action: 'repair_linkage',
      details: `Ensure village allocation VA-001 binds Rampur Sector 4 to Sunita Devi (${SUNITA_ID})`,
      fieldsToSet: cleanUndefined(va001),
    });
  }

  for (const msg of DEMO_MESSAGES.filter((m) => m.motherId === PRIYA_ID)) {
    actions.push({
      collection: 'messages',
      docId: msg.id,
      action: 'repair_linkage',
      details: `Ensure canonical message ${msg.id} uses conversationId=${CANONICAL_CONVERSATION_ID} and workerId=${SUNITA_ID}`,
      fieldsToSet: cleanUndefined({
        ...msg,
        type: msg.type || 'text',
        conversationId: CANONICAL_CONVERSATION_ID,
        motherId: PRIYA_ID,
        workerId: SUNITA_ID,
        receiverId: msg.senderRole === 'mother' ? SUNITA_ID : PRIYA_ID,
        recipientId: msg.senderRole === 'mother' ? SUNITA_ID : PRIYA_ID,
      }),
    });
  }

  for (const asmt of DEMO_ASSESSMENTS.filter((a) => a.motherId === PRIYA_ID)) {
    actions.push({
      collection: 'assessments',
      docId: asmt.id,
      action: 'create',
      details: `Ensure baseline assessment ${asmt.id} links Priya (${PRIYA_ID}) <-> Sunita (${SUNITA_ID}) if missing`,
      fieldsToSet: cleanUndefined(asmt),
    });
  }

  for (const hu of DEMO_HEALTH_UPDATES.filter((u) => u.motherId === PRIYA_ID)) {
    actions.push({
      collection: 'healthUpdates',
      docId: hu.healthUpdateId,
      action: 'create',
      details: `Ensure health update ${hu.healthUpdateId} links Priya (${PRIYA_ID}) <-> Sunita (${SUNITA_ID}) if missing`,
      fieldsToSet: cleanUndefined(hu),
    });
  }

  for (const apt of DEMO_APPOINTMENTS.filter((a) => a.motherId === PRIYA_ID)) {
    actions.push({
      collection: 'appointments',
      docId: apt.id,
      action: 'create',
      details: `Ensure appointment ${apt.id} links Priya (${PRIYA_ID}) <-> Sunita (${SUNITA_ID}) if missing`,
      fieldsToSet: cleanUndefined(apt),
    });
  }

  for (const hosp of AUTHORIZED_HOSPITALS) {
    actions.push({
      collection: 'hospitals',
      docId: hosp.id,
      action: 'create',
      details: `Ensure authorized hospital ${hosp.id} exists if missing`,
      fieldsToSet: cleanUndefined(hosp),
    });
  }

  return actions;
}

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const dryRun = !applyMode || args.includes('--dry-run');

  const cfg = loadAppletConfig();
  if (cfg.projectId !== EXPECTED_PROJECT_ID || cfg.firestoreDatabaseId !== EXPECTED_DATABASE_ID) {
    console.error(
      `❌ Firebase config mismatch! Expected ${EXPECTED_PROJECT_ID} / ${EXPECTED_DATABASE_ID}, got ${cfg.projectId} / ${cfg.firestoreDatabaseId}`
    );
    process.exit(1);
  }

  console.log('====================================================================');
  console.log('JanmaSaathi — Priya (MCP-2026-0894) <-> Sunita (HW-44120) Repair Tool');
  console.log('====================================================================');
  console.log(`Mode:        ${dryRun ? 'DRY RUN (no Firestore writes)' : 'APPLY (idempotent writes)'}`);
  console.log(`Project ID:  ${cfg.projectId}`);
  console.log(`Database ID: ${cfg.firestoreDatabaseId}`);
  console.log(`Thread ID:   ${CANONICAL_CONVERSATION_ID}`);

  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: applicationDefault(),
          projectId: cfg.projectId,
        });

  const db = getFirestore(app, cfg.firestoreDatabaseId);
  const baselineActions = buildBaselinePlan();

  try {
    // Live inspection probe
    const priyaRef = db.collection('mothers').doc(PRIYA_ID);
    const sunitaRef = db.collection('healthWorkers').doc(SUNITA_ID);
    const kabitaRef = db.collection('healthWorkers').doc(KABITA_ID);
    const vaRef = db.collection('assignments').doc('VA-001');

    const [priyaSnap, sunitaSnap, kabitaSnap, vaSnap, msgSnap, usersPriyaSnap, usersSunitaSnap] =
      await Promise.all([
        priyaRef.get(),
        sunitaRef.get(),
        kabitaRef.get(),
        vaRef.get(),
        db.collection('messages').where('motherId', '==', PRIYA_ID).get(),
        db.collection('users').where('motherId', '==', PRIYA_ID).get(),
        db.collection('users').where('staffId', '==', SUNITA_ID).get(),
      ]);

    const liveActions: RepairAction[] = [];

    // 1. Workers
    for (const [id, snap] of [
      [SUNITA_ID, sunitaSnap],
      [KABITA_ID, kabitaSnap],
    ] as const) {
      const baseline = DEMO_WORKERS.find((w) => w.id === id)!;
      if (!snap.exists) {
        liveActions.push({
          collection: 'healthWorkers',
          docId: id,
          action: 'create',
          details: `Create missing healthWorkers/${id} (${baseline.name})`,
          fieldsToSet: cleanUndefined(baseline),
        });
      } else {
        liveActions.push({
          collection: 'healthWorkers',
          docId: id,
          action: 'noop',
          details: `healthWorkers/${id} already exists`,
        });
      }
    }

    // 2. Priya mother doc — NEVER overwrite existing clinical/pregnancy fields
    const priyaBaseline = DEMO_MOTHERS.find((m) => m.id === PRIYA_ID)!;
    const matchedPriyaUser = usersPriyaSnap.docs[0]?.data();
    const resolvedPriyaAuthUid =
      (priyaSnap.exists ? priyaSnap.data()?.authUid : null) ||
      matchedPriyaUser?.uid ||
      null;

    if (!priyaSnap.exists) {
      liveActions.push({
        collection: 'mothers',
        docId: PRIYA_ID,
        action: 'create',
        details: `Create missing mothers/${PRIYA_ID} assigned to ${SUNITA_ID}`,
        fieldsToSet: cleanUndefined({
          ...priyaBaseline,
          assignedWorkerId: SUNITA_ID,
          assignedWorkerName: 'Sunita Devi',
          authUid: resolvedPriyaAuthUid,
        }),
      });
    } else {
      const current = priyaSnap.data() || {};
      const repairPatch: Record<string, any> = {};
      if (current.assignedWorkerId !== SUNITA_ID) repairPatch.assignedWorkerId = SUNITA_ID;
      if (current.assignedWorkerName !== 'Sunita Devi') repairPatch.assignedWorkerName = 'Sunita Devi';
      if (!current.authUid && resolvedPriyaAuthUid) repairPatch.authUid = resolvedPriyaAuthUid;
      if (!current.mcpCardNumber) repairPatch.mcpCardNumber = PRIYA_ID;

      if (Object.keys(repairPatch).length > 0) {
        liveActions.push({
          collection: 'mothers',
          docId: PRIYA_ID,
          action: 'repair_linkage',
          details: `Repair mothers/${PRIYA_ID} assignment/identity linkage (${Object.keys(repairPatch).join(', ')}) while preserving pregnancy/clinical fields`,
          fieldsToSet: repairPatch,
        });
      } else {
        liveActions.push({
          collection: 'mothers',
          docId: PRIYA_ID,
          action: 'noop',
          details: `mothers/${PRIYA_ID} already linked to ${SUNITA_ID}`,
        });
      }
    }

    // 3. Village allocation VA-001
    const vaBaseline = DEMO_VILLAGE_ALLOCATIONS.find((v) => v.id === 'VA-001')!;
    if (!vaSnap.exists) {
      liveActions.push({
        collection: 'assignments',
        docId: 'VA-001',
        action: 'create',
        details: `Create assignments/VA-001 for ${SUNITA_ID}`,
        fieldsToSet: cleanUndefined(vaBaseline),
      });
    } else if (vaSnap.data()?.assignedWorkerId !== SUNITA_ID) {
      liveActions.push({
        collection: 'assignments',
        docId: 'VA-001',
        action: 'repair_linkage',
        details: `Repair assignments/VA-001 to assignedWorkerId=${SUNITA_ID}`,
        fieldsToSet: {
          assignedWorkerId: SUNITA_ID,
          assignedWorkerName: 'Sunita Devi',
        },
      });
    } else {
      liveActions.push({
        collection: 'assignments',
        docId: 'VA-001',
        action: 'noop',
        details: `assignments/VA-001 already linked to ${SUNITA_ID}`,
      });
    }

    // 4. Existing Priya messages normalization (idempotent, preserves text & audio fields)
    const existingMsgIds = new Set<string>();
    for (const docSnap of msgSnap.docs) {
      existingMsgIds.add(docSnap.id);
      const data = docSnap.data() || {};
      const msgPatch: Record<string, any> = {};
      if (!data.workerId && (!data.senderRole || data.senderRole === 'mother' || data.senderId === SUNITA_ID)) {
        msgPatch.workerId = SUNITA_ID;
      }
      const targetWorkerId = data.workerId || msgPatch.workerId;
      if (targetWorkerId === SUNITA_ID) {
        if (data.conversationId !== CANONICAL_CONVERSATION_ID) {
          msgPatch.conversationId = CANONICAL_CONVERSATION_ID;
        }
        if (!data.type) {
          msgPatch.type = data.audioStoragePath ? 'audio' : 'text';
        }
        if (!data.receiverId) {
          msgPatch.receiverId = data.senderRole === 'mother' ? SUNITA_ID : PRIYA_ID;
        }
        if (!data.recipientId) {
          msgPatch.recipientId = msgPatch.receiverId || data.receiverId;
        }
      }
      if (Object.keys(msgPatch).length > 0) {
        liveActions.push({
          collection: 'messages',
          docId: docSnap.id,
          action: 'repair_linkage',
          details: `Normalize message ${docSnap.id} metadata (${Object.keys(msgPatch).join(', ')})`,
          fieldsToSet: msgPatch,
        });
      }
    }

    // Seed missing canonical baseline Priya <-> Sunita messages only when zero Priya messages exist
    if (msgSnap.empty) {
      for (const msg of DEMO_MESSAGES.filter((m) => m.motherId === PRIYA_ID && !existingMsgIds.has(m.id))) {
        liveActions.push({
          collection: 'messages',
          docId: msg.id,
          action: 'create',
          details: `Seed baseline message ${msg.id} in ${CANONICAL_CONVERSATION_ID}`,
          fieldsToSet: cleanUndefined(msg),
        });
      }
    }

    // 5. Clinical sub-collections (create only if absent)
    for (const a of DEMO_ASSESSMENTS.filter((x) => x.motherId === PRIYA_ID)) {
      const snap = await db.collection('assessments').doc(a.id).get();
      liveActions.push(
        snap.exists
          ? { collection: 'assessments', docId: a.id, action: 'noop', details: `assessments/${a.id} exists` }
          : {
              collection: 'assessments',
              docId: a.id,
              action: 'create',
              details: `Create missing assessments/${a.id}`,
              fieldsToSet: cleanUndefined(a),
            }
      );
    }

    console.log('\nAudit summary:');
    console.log(`- users mapped to Priya (${PRIYA_ID}): ${usersPriyaSnap.size}`);
    console.log(`- users mapped to Sunita (${SUNITA_ID}): ${usersSunitaSnap.size}`);

    const pendingMutations = liveActions.filter((a) => a.action !== 'noop');
    for (const act of liveActions) {
      console.log(`[${act.action.toUpperCase()}] ${act.collection}/${act.docId} — ${act.details}`);
    }

    if (dryRun) {
      console.log(`\nDry run complete. ${pendingMutations.length} repair action(s) identified; 0 writes executed.`);
      return;
    }

    if (pendingMutations.length === 0) {
      console.log('\nDatabase is already consistent. 0 writes needed.');
      return;
    }

    const batch = db.batch();
    for (const act of pendingMutations) {
      const ref = db.collection(act.collection).doc(act.docId);
      if (act.action === 'create') {
        batch.set(ref, {
          ...act.fieldsToSet,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        batch.set(
          ref,
          {
            ...act.fieldsToSet,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
    await batch.commit();
    console.log(`\n✅ Applied ${pendingMutations.length} idempotent repair(s) to ${cfg.firestoreDatabaseId}.`);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('\n⚠️ Live Firestore Admin SDK inspection blocked in current environment:');
    console.warn(`   ${errMsg}`);
    console.warn(
      '   Prerequisite for live execution: run with credentials having Cloud Datastore User (roles/datastore.user) on project outr-janmasaathi.'
    );
    console.log('\nPlanned idempotent repair manifest (from canonical schema):');
    for (const act of baselineActions) {
      console.log(`  - [${act.action.toUpperCase()}] ${act.collection}/${act.docId}: ${act.details}`);
    }
    if (applyMode) {
      process.exit(1);
    }
    console.log('\nDry run completed with canonical repair manifest printed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
