import assert from 'node:assert/strict';

const BASE_URL = process.env.JANMASAATHI_BASE_URL || 'http://127.0.0.1:3000';
const DEMO_PASS = process.env.JANMASAATHI_DEMO_PASS || 'demo1234';

interface CleanupTarget {
  url: string;
  token: string;
}

async function run() {
  const cleanupTargets: CleanupTarget[] = [];

  try {
    // 1. Health & Firebase Project/Database check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert.equal(healthRes.status, 200, 'GET /api/health must return 200');
    const health = await healthRes.json();
    assert.equal(health.firebase?.projectId, 'outr-janmasaathi');
    assert.equal(
      health.firebase?.firestoreDatabaseId,
      'ai-studio-janmasaathi-8e8b2a1f-7b17-42e6-bc8e-284c5c28d2df'
    );
    console.log('[PASS] 1. /api/health confirms outr-janmasaathi + named Firestore DB');

    // 2. Mother Login (Priya Sharma MCP-2026-0894)
    const priyaLoginRes = await fetch(`${BASE_URL}/api/auth/mother-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'priya.sharma@example.com',
        password: DEMO_PASS,
      }),
    });
    assert.equal(priyaLoginRes.status, 200, 'Priya mother-login must return 200');
    const priyaLogin = await priyaLoginRes.json();
    assert.equal(priyaLogin.success, true);
    assert.ok(typeof priyaLogin.token === 'string' && priyaLogin.token.includes('.'));
    assert.equal(priyaLogin.user?.id, 'MCP-2026-0894');
    assert.equal(priyaLogin.user?.assignedWorkerId, 'HW-44120');
    assert.equal(priyaLogin.user?.assignedWorkerName, 'Sunita Devi');
    console.log(
      `[PASS] 2. Mother login (Priya MCP-2026-0894 -> HW-44120). Custom token: ${
        priyaLogin.firebaseCustomToken
          ? 'minted'
          : `unavailable (${priyaLogin.firebaseCustomTokenUnavailableReason || 'no IAM'})`
      }`
    );

    // 3. Health Worker Logins (Sunita HW-44120 & Kabita HW-002)
    const sunitaLoginRes = await fetch(`${BASE_URL}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: 'HW-44120', password: DEMO_PASS, role: 'worker' }),
    });
    assert.equal(sunitaLoginRes.status, 200, 'Sunita staff-login must return 200');
    const sunitaLogin = await sunitaLoginRes.json();
    assert.equal(sunitaLogin.user?.id, 'HW-44120');
    assert.equal(sunitaLogin.user?.name, 'Sunita Devi');

    const kabitaLoginRes = await fetch(`${BASE_URL}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: 'HW-002', password: DEMO_PASS, role: 'worker' }),
    });
    assert.equal(kabitaLoginRes.status, 200, 'Kabita staff-login must return 200');
    const kabitaLogin = await kabitaLoginRes.json();
    assert.equal(kabitaLogin.user?.id, 'HW-002');
    assert.equal(kabitaLogin.user?.name, 'Kabita Soren');
    assert.notEqual(kabitaLogin.user?.id, 'HW-44120');
    console.log('[PASS] 3. Staff login preserves distinct HW-44120 (Sunita) vs HW-002 (Kabita) identities');

    // 4. Priya uploads real voice audio clip -> conv_MCP-2026-0894_HW-44120
    const canonicalConv = 'conv_MCP-2026-0894_HW-44120';
    const priyaSampleAudio = Buffer.from(
      '4f6767530002000000000000000001000000000000000000000001134f707573486561640101380180bb0000000000',
      'hex'
    );
    const priyaMsgId = `MSG-VERIFY-M-${Date.now()}`;
    const priyaUploadRes = await fetch(`${BASE_URL}/api/voice-messages/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${priyaLogin.token}`,
      },
      body: JSON.stringify({
        audioBase64: priyaSampleAudio.toString('base64'),
        mimeType: 'audio/ogg;codecs=opus',
        conversationId: canonicalConv,
        messageId: priyaMsgId,
        motherId: 'MCP-2026-0894',
        workerId: 'HW-44120',
        senderId: 'MCP-2026-0894',
        senderRole: 'mother',
      }),
    });
    assert.equal(priyaUploadRes.status, 200, 'Priya voice upload must succeed');
    const priyaUpload = await priyaUploadRes.json();
    assert.equal(priyaUpload.success, true);
    assert.ok(priyaUpload.audioStoragePath?.startsWith(`voiceMessages/${canonicalConv}/`));
    assert.ok(priyaUpload.audioDownloadUrl?.startsWith('/api/voice-messages/audio/'));
    cleanupTargets.push({ url: `${BASE_URL}${priyaUpload.audioDownloadUrl}`, token: priyaLogin.token });
    console.log(`[PASS] 4. Priya voice upload stored (${priyaUpload.audioFileSize} bytes)`);

    // 5. Sunita retrieves Priya's audio (full 200 + Range 206)
    const sunitaGetFull = await fetch(`${BASE_URL}${priyaUpload.audioDownloadUrl}`, {
      headers: { Authorization: `Bearer ${sunitaLogin.token}` },
    });
    assert.equal(sunitaGetFull.status, 200, 'Sunita must be able to stream Priya voice audio');
    assert.equal(sunitaGetFull.headers.get('accept-ranges'), 'bytes');
    const sunitaBytes = Buffer.from(await sunitaGetFull.arrayBuffer());
    assert.equal(Buffer.compare(sunitaBytes, priyaSampleAudio), 0, 'Downloaded bytes must match uploaded bytes');

    const sunitaGetRange = await fetch(`${BASE_URL}${priyaUpload.audioDownloadUrl}`, {
      headers: {
        Authorization: `Bearer ${sunitaLogin.token}`,
        Range: 'bytes=0-7',
      },
    });
    assert.equal(sunitaGetRange.status, 206, 'Range request must return 206 Partial Content');
    const rangeBytes = Buffer.from(await sunitaGetRange.arrayBuffer());
    assert.equal(rangeBytes.length, 8);
    assert.equal(Buffer.compare(rangeBytes, priyaSampleAudio.subarray(0, 8)), 0);
    console.log('[PASS] 5. Sunita retrieved Priya voice audio (200 exact match + 206 Range)');

    // 6. Sunita uploads voice reply -> Priya retrieves it
    const sunitaSampleAudio = Buffer.from('1a45dfa39f4286810142f7810142f2810442f381084282847765626d', 'hex');
    const sunitaMsgId = `MSG-VERIFY-W-${Date.now()}`;
    const sunitaUploadRes = await fetch(`${BASE_URL}/api/voice-messages/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sunitaLogin.token}`,
      },
      body: JSON.stringify({
        audioBase64: sunitaSampleAudio.toString('base64'),
        mimeType: 'audio/webm',
        conversationId: canonicalConv,
        messageId: sunitaMsgId,
        motherId: 'MCP-2026-0894',
        workerId: 'HW-44120',
        senderId: 'HW-44120',
        senderRole: 'worker',
      }),
    });
    assert.equal(sunitaUploadRes.status, 200, 'Sunita voice upload must succeed');
    const sunitaUpload = await sunitaUploadRes.json();
    cleanupTargets.push({ url: `${BASE_URL}${sunitaUpload.audioDownloadUrl}`, token: sunitaLogin.token });

    const priyaGetRes = await fetch(`${BASE_URL}${sunitaUpload.audioDownloadUrl}`, {
      headers: { Authorization: `Bearer ${priyaLogin.token}` },
    });
    assert.equal(priyaGetRes.status, 200, 'Priya must be able to stream Sunita voice reply');
    const priyaReadBytes = Buffer.from(await priyaGetRes.arrayBuffer());
    assert.equal(Buffer.compare(priyaReadBytes, sunitaSampleAudio), 0);
    console.log('[PASS] 6. Bidirectional audio verified (Sunita upload -> Priya exact playback)');

    // 7. Cross-worker & Auth isolation checks
    const unauthGet = await fetch(`${BASE_URL}${priyaUpload.audioDownloadUrl}`);
    assert.equal(unauthGet.status, 401, 'Unauthenticated audio access must return 401');

    const kabitaGetRes = await fetch(`${BASE_URL}${priyaUpload.audioDownloadUrl}`, {
      headers: { Authorization: `Bearer ${kabitaLogin.token}` },
    });
    assert.equal(kabitaGetRes.status, 403, 'HW-002 must be denied access to Priya/Sunita audio');

    const kabitaCrossUpload = await fetch(`${BASE_URL}/api/voice-messages/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kabitaLogin.token}`,
      },
      body: JSON.stringify({
        audioBase64: sunitaSampleAudio.toString('base64'),
        mimeType: 'audio/webm',
        conversationId: 'conv_MCP-2026-0894_HW-002',
        messageId: `MSG-VERIFY-X-${Date.now()}`,
        motherId: 'MCP-2026-0894',
        workerId: 'HW-002',
        senderId: 'HW-002',
        senderRole: 'worker',
      }),
    });
    assert.equal(kabitaCrossUpload.status, 403, 'HW-002 must be denied uploading voice for Priya (HW-44120)');

    const kabitaSpoofUpload = await fetch(`${BASE_URL}/api/voice-messages/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kabitaLogin.token}`,
      },
      body: JSON.stringify({
        audioBase64: sunitaSampleAudio.toString('base64'),
        mimeType: 'audio/webm',
        conversationId: canonicalConv,
        messageId: `MSG-VERIFY-SP-${Date.now()}`,
        motherId: 'MCP-2026-0894',
        workerId: 'HW-44120',
        senderId: 'HW-44120',
        senderRole: 'worker',
      }),
    });
    assert.equal(kabitaSpoofUpload.status, 403, 'HW-002 spoofing HW-44120 must be denied');

    const mismatchConvRes = await fetch(`${BASE_URL}/api/voice-messages/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sunitaLogin.token}`,
      },
      body: JSON.stringify({
        audioBase64: sunitaSampleAudio.toString('base64'),
        mimeType: 'audio/webm',
        conversationId: 'conv_MCP-2026-0894_HW-002',
        messageId: `MSG-VERIFY-MM-${Date.now()}`,
        motherId: 'MCP-2026-0894',
        workerId: 'HW-44120',
        senderId: 'HW-44120',
        senderRole: 'worker',
      }),
    });
    assert.equal(mismatchConvRes.status, 400, 'Mismatched conversationId must return 400');
    console.log('[PASS] 7. Cross-worker (HW-002 -> 403), unauth (401), and conversationId mismatch (400) isolation verified');
  } finally {
    // 8. Clean up temporary test voice files
    for (const target of cleanupTargets) {
      try {
        const delRes = await fetch(target.url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${target.token}` },
        });
        assert.equal(delRes.status, 200);
      } catch (err) {
        console.warn('[WARN] Cleanup failed for', target.url, err);
      }
    }
    if (cleanupTargets.length > 0) {
      const checkGone = await fetch(cleanupTargets[0].url, {
        headers: { Authorization: `Bearer ${cleanupTargets[0].token}` },
      });
      assert.equal(checkGone.status, 404, 'Cleaned-up audio must return 404');
      console.log(`[PASS] 8. Cleaned up ${cleanupTargets.length} test voice files cleanly`);
    }
  }
}

run()
  .then(() => {
    console.log('ALL LIVE HTTP VERIFICATION CHECKS PASSED.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
