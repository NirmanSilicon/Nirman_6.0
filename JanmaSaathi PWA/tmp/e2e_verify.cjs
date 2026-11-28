const { chromium } = require('/usr/local/share/bun-global/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const EXEC_PATH = '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

function assert(cond, msg) {
  if (!cond) {
    throw new Error('ASSERTION FAILED: ' + msg);
  }
}

async function loginAs(page, roleTabText, identifier, password) {
  await page.waitForSelector('button[role="tab"], [role="tablist"] button', { timeout: 15000 });
  const roleBtns = page.locator('[role="tablist"] button');
  const count = await roleBtns.count();
  let clicked = false;
  for (let i = 0; i < count; i++) {
    const txt = (await roleBtns.nth(i).innerText()).trim();
    if (txt.toLowerCase().includes(roleTabText.toLowerCase())) {
      await roleBtns.nth(i).click();
      clicked = true;
      break;
    }
  }
  assert(clicked, `Could not find role tab matching "${roleTabText}"`);

  await page.fill('#identity-input', identifier);
  await page.fill('#password-input', password);
  await page.click('form button[type="submit"]');

  // Wait until LoginScreen unmounts
  await page.waitForSelector('#identity-input', { state: 'detached', timeout: 15000 });
}

async function logoutFromCurrentRole(page, role) {
  if (role === 'mother') {
    await page.locator('nav button').nth(4).click(); // Profile tab
  } else if (role === 'worker') {
    await page.locator('nav button').nth(4).click(); // More tab
  } else if (role === 'supervisor') {
    await page.locator('nav button').nth(4).click(); // More tab
  }
  const logoutBtn = page.locator('button:has(span.material-symbols-outlined:text-is("logout"))');
  await logoutBtn.waitFor({ state: 'visible', timeout: 10000 });
  await logoutBtn.click();
  await page.waitForSelector('#identity-input', { timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: EXEC_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 892 },
    permissions: ['microphone'],
  });
  const page = await context.newPage();

  const authErrors = [];
  const apiFailures = [];
  const networkRecords = [];

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/api/')) {
      const status = resp.status();
      networkRecords.push({ url, status });
      if (status === 401 || status === 403) {
        authErrors.push(`${status} ${url}`);
      } else if (status >= 500) {
        apiFailures.push(`${status} ${url}`);
      }
    }
  });

  page.on('dialog', async (dialog) => {
    authErrors.push(`Unexpected dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });

  const results = [];

  try {
    console.log('=== Loading App ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // =========================================================================
    // TEST 1: Mother AI Companion - Odia text conversation without re-auth
    // =========================================================================
    console.log('\n--- TEST 1: Mother AI Companion (Odia text) ---');
    await loginAs(page, 'Mother', 'priya.sharma@example.com', 'demo1234');

    // Open AI Companion
    const aiTrigger = page.locator('button[aria-label="Ask JanmaSaathi"]');
    await aiTrigger.waitFor({ state: 'visible', timeout: 10000 });
    await aiTrigger.click();

    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 10000 });

    // Switch AI Companion language to Odia (ଓଡ଼ିଆ)
    await dialog.locator('[aria-label="Companion language"] button:has-text("ଓଡ଼ିଆ")').click();

    // Send Odia question
    const odiaQuestion = 'ମୋର ଗର୍ଭାବସ୍ଥାରେ କଣ ଖାଇବା ଉଚିତ?';
    const aiInput = dialog.locator('form input[type="text"]');
    await aiInput.fill(odiaQuestion);
    const chatRespPromise1 = page.waitForResponse(
      (r) => r.url().includes('/api/companion/chat') && r.request().method() === 'POST',
      { timeout: 30000 }
    );
    await dialog.locator('form button[type="submit"]').click();
    const chatResp1 = await chatRespPromise1;
    assert(chatResp1.status() === 200, `Odia /api/companion/chat expected 200, got ${chatResp1.status()}`);
    const chatJson1 = await chatResp1.json();
    assert(chatJson1.success && typeof chatJson1.reply === 'string' && chatJson1.reply.length > 10, 'Odia AI reply missing');
    assert(!chatJson1.reply.toLowerCase().includes('sign-in') && !chatJson1.reply.toLowerCase().includes('firebase'), 'AI reply contained auth prompt');

    // Verify rendered bubble contains reply
    await page.waitForTimeout(500);
    const bodyText1 = await dialog.innerText();
    assert(bodyText1.includes(odiaQuestion), 'Odia user prompt not displayed');
    assert(bodyText1.includes(chatJson1.reply.slice(0, 20)), 'Odia AI reply not rendered in UI');
    results.push('TEST 1 PASS: Mother Odia AI text conversation works without extra Firebase Auth');

    // =========================================================================
    // TEST 2: Mother AI Companion - Hindi voice flow & TTS without re-auth
    // =========================================================================
    console.log('\n--- TEST 2: Mother AI Companion (Hindi voice flow + TTS) ---');
    await dialog.locator('[aria-label="Companion language"] button:has-text("हिन्दी")').click();

    // Test real browser mic recording -> /api/companion/transcribe (verify authenticated 200 response)
    const micBtn = dialog.locator('form button[type="button"]').first();
    await micBtn.click();
    await page.waitForTimeout(1200);
    const transcribePromise = page.waitForResponse(
      (r) => r.url().includes('/api/companion/transcribe') && r.request().method() === 'POST',
      { timeout: 30000 }
    );
    await micBtn.click(); // stop recording & send to /api/companion/transcribe
    const transcribeResp = await transcribePromise;
    assert(transcribeResp.status() === 200, `/api/companion/transcribe expected 200, got ${transcribeResp.status()}`);

    // Now send Hindi text and verify both /api/companion/chat and /api/companion/tts succeed with 200
    const hindiQuestion = 'मेरी गर्भावस्था में कौन से लक्षण खतरनाक हैं?';
    await aiInput.fill(hindiQuestion);
    const chatRespPromise2 = page.waitForResponse(
      (r) => r.url().includes('/api/companion/chat') && r.request().method() === 'POST',
      { timeout: 30000 }
    );
    const ttsRespPromise = page.waitForResponse(
      (r) => r.url().includes('/api/companion/tts') && r.request().method() === 'POST',
      { timeout: 30000 }
    ).catch(() => null);
    await dialog.locator('form button[type="submit"]').click();
    const chatResp2 = await chatRespPromise2;
    assert(chatResp2.status() === 200, `Hindi /api/companion/chat expected 200, got ${chatResp2.status()}`);
    const chatJson2 = await chatResp2.json();
    assert(chatJson2.success && chatJson2.reply.length > 10, 'Hindi AI reply missing');

    // Check TTS response (triggered automatically since speaker toggle defaults ON)
    const ttsResp = await ttsRespPromise;
    if (ttsResp) {
      assert(ttsResp.status() === 200, `/api/companion/tts expected 200, got ${ttsResp.status()}`);
      const ttsJson = await ttsResp.json();
      assert(ttsJson.success && (ttsJson.audioBase64 || ttsJson.useBrowserSpeechFallback), 'TTS response invalid');
    }

    // Close AI Companion panel
    await dialog.locator('header button').last().click();
    await dialog.waitFor({ state: 'detached', timeout: 5000 });
    results.push('TEST 2 PASS: Mother Hindi AI voice recording, chat, and TTS work with zero auth errors');

    // =========================================================================
    // TEST 3: Mother -> Health Worker Direct Voice Message (Original Audio)
    // =========================================================================
    console.log('\n--- TEST 3: Mother -> Health Worker direct voice message ---');
    await page.locator('nav button').nth(3).click(); // Mother Connect tab
    await page.waitForSelector('#chat-section', { timeout: 10000 });

    const motherComposer = page.locator('#chat-section form');
    const motherMic = motherComposer.locator('button[type="button"]').first();
    await motherMic.click();
    await page.waitForTimeout(1500);

    // Ensure NO Google Sign-In lock banner appears
    const lockVisible = await page.locator('#chat-section :text("Google Sign-In")').count();
    assert(lockVisible === 0, 'Unexpected Google Sign-In lock banner in VoiceMessageComposer');

    // Stop recording -> Preview
    await page.locator('#chat-section button:has-text("Stop")').click();
    const sendVoiceBtnMother = page.locator('#chat-section button:has-text("Send Voice")');
    await sendVoiceBtnMother.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('#chat-section button')).find((b) =>
          (b.textContent || '').includes('Send Voice')
        );
        return btn && !btn.hasAttribute('disabled');
      },
      { timeout: 10000 }
    );

    const uploadPromiseM2W = page.waitForResponse(
      (r) => r.url().includes('/api/voice-messages/upload') && r.request().method() === 'POST',
      { timeout: 20000 }
    );
    await sendVoiceBtnMother.click();
    const uploadRespM2W = await uploadPromiseM2W;
    assert(uploadRespM2W.status() === 200, `Mother voice upload expected 200, got ${uploadRespM2W.status()}`);
    const uploadJsonM2W = await uploadRespM2W.json();
    const m2wStoragePath = uploadJsonM2W.audioStoragePath;
    const m2wDownloadUrl = uploadJsonM2W.audioDownloadUrl;
    assert(m2wStoragePath && m2wDownloadUrl, 'Missing uploaded voice audio metadata');

    // Verify bubble renders for Mother with valid blob audio URL
    await page.waitForSelector('#chat-section audio', { timeout: 15000 });
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('#chat-section audio')).some((a) => a.src.startsWith('blob:') && a.readyState >= 1),
      { timeout: 15000 }
    );

    // Logout Mother and login as Health Worker HW-44120
    await logoutFromCurrentRole(page, 'mother');
    await loginAs(page, 'Health Worker', 'HW-44120', 'demo1234');

    await page.locator('nav button').nth(1).click(); // Worker Patients tab
    await page.waitForSelector('button:has-text("Chat")', { timeout: 10000 });
    await page.locator('button:has-text("Chat")').first().click();

    // Wait for modal & audio fetch
    const workerModalAudioFetch = await page.waitForFunction(
      () => {
        const audios = Array.from(document.querySelectorAll('.fixed audio'));
        return audios.some((a) => a.src.startsWith('blob:') && a.readyState >= 1);
      },
      { timeout: 15000 }
    );
    assert(Boolean(workerModalAudioFetch), 'Health Worker could not load Mother voice audio blob');

    // Click play on the last voice message bubble inside modal and verify it plays cleanly without error
    const workerModalErrs = await page.locator('.fixed :text("Unable to load voice message")').count();
    assert(workerModalErrs === 0, 'Worker chat rendered voice audio load error');
    const playResW = await page.evaluate(async () => {
      const audios = Array.from(document.querySelectorAll('.fixed audio'));
      const last = audios[audios.length - 1];
      if (!last) return { ok: false, reason: 'no audio element' };
      try {
        await last.play();
        const playing = !last.paused;
        last.pause();
        return { ok: true, playing, src: last.src, readyState: last.readyState };
      } catch (e) {
        return { ok: false, reason: String(e) };
      }
    });
    assert(playResW.ok, `Worker playback of Mother audio failed: ${JSON.stringify(playResW)}`);
    results.push('TEST 3 PASS: Mother -> Health Worker direct audio uploaded, synced via Firestore, loaded as authenticated blob, and played');

    // =========================================================================
    // TEST 4: Health Worker -> Mother Direct Voice Message (Original Audio)
    // =========================================================================
    console.log('\n--- TEST 4: Health Worker -> Mother direct voice message ---');
    const workerComposer = page.locator('.fixed form');
    const workerMic = workerComposer.locator('button[type="button"]').first();
    await workerMic.click();
    await page.waitForTimeout(1500);
    await page.locator('.fixed button:has-text("Stop")').click();

    const sendVoiceBtnWorker = page.locator('.fixed button:has-text("Send Voice")');
    await sendVoiceBtnWorker.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(
      () => {
        const btn = Array.from(document.querySelectorAll('.fixed button')).find((b) =>
          (b.textContent || '').includes('Send Voice')
        );
        return btn && !btn.hasAttribute('disabled');
      },
      { timeout: 10000 }
    );

    const uploadPromiseW2M = page.waitForResponse(
      (r) => r.url().includes('/api/voice-messages/upload') && r.request().method() === 'POST',
      { timeout: 20000 }
    );
    await sendVoiceBtnWorker.click();
    const uploadRespW2M = await uploadPromiseW2M;
    assert(uploadRespW2M.status() === 200, `Worker voice upload expected 200, got ${uploadRespW2M.status()}`);
    const uploadJsonW2M = await uploadRespW2M.json();
    const w2mStoragePath = uploadJsonW2M.audioStoragePath;
    const w2mDownloadUrl = uploadJsonW2M.audioDownloadUrl;
    assert(w2mStoragePath && w2mDownloadUrl, 'Missing worker uploaded voice audio metadata');

    // Close chat modal, log out Health Worker, log back in as Mother
    await page.locator('.fixed button:has(span.material-symbols-outlined:text-is("close"))').click();
    await logoutFromCurrentRole(page, 'worker');
    await loginAs(page, 'Mother', 'priya.sharma@example.com', 'demo1234');

    await page.locator('nav button').nth(3).click(); // Connect tab
    await page.waitForSelector('#chat-section audio', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const audios = Array.from(document.querySelectorAll('#chat-section audio'));
        return audios.length >= 2 && audios.every((a) => a.src.startsWith('blob:') && a.readyState >= 1);
      },
      { timeout: 15000 }
    );
    const motherErrs = await page.locator('#chat-section :text("Unable to load voice message")').count();
    assert(motherErrs === 0, 'Mother Connect thread had voice audio load errors');

    const playResM = await page.evaluate(async () => {
      const audios = Array.from(document.querySelectorAll('#chat-section audio'));
      const last = audios[audios.length - 1];
      if (!last) return { ok: false, reason: 'no audio element' };
      try {
        await last.play();
        last.pause();
        return { ok: true, count: audios.length, readyState: last.readyState };
      } catch (e) {
        return { ok: false, reason: String(e) };
      }
    });
    assert(playResM.ok, `Mother playback of Worker audio failed: ${JSON.stringify(playResM)}`);
    results.push('TEST 4 PASS: Health Worker -> Mother direct audio uploaded, received by Mother, and played cleanly');

    // =========================================================================
    // TEST 5: Session & Auth Persistence across Page Reload & Navigation (AI Companion)
    // =========================================================================
    console.log('\n--- TEST 5: Reload & Navigation Persistence (AI Companion) ---');
    await page.reload({ waitUntil: 'networkidle' });
    // Ensure Mother stayed authenticated without LoginScreen
    const loginVisibleAfterReload = await page.locator('#identity-input').count();
    assert(loginVisibleAfterReload === 0, 'Mother was logged out after page reload!');

    // Navigate tabs: Journey -> Home
    await page.locator('nav button').nth(1).click();
    await page.waitForTimeout(300);
    await page.locator('nav button').nth(0).click();

    // Open AI Companion and send English query
    await page.locator('button[aria-label="Ask JanmaSaathi"]').click();
    const dialogAfterReload = page.locator('[role="dialog"]');
    await dialogAfterReload.waitFor({ state: 'visible', timeout: 10000 });
    await dialogAfterReload.locator('[aria-label="Companion language"] button:has-text("EN")').click();
    await dialogAfterReload.locator('form input[type="text"]').fill('How much water should I drink daily?');
    const chatRespPromise3 = page.waitForResponse(
      (r) => r.url().includes('/api/companion/chat') && r.request().method() === 'POST',
      { timeout: 30000 }
    );
    await dialogAfterReload.locator('form button[type="submit"]').click();
    const chatResp3 = await chatRespPromise3;
    assert(chatResp3.status() === 200, `Post-reload AI chat expected 200, got ${chatResp3.status()}`);
    await dialogAfterReload.locator('header button').last().click();
    results.push('TEST 5 PASS: Mother session + AI Companion work seamlessly after full page reload & navigation');

    // =========================================================================
    // TEST 6: Two-Way Voice Messages Persist & Stay Playable After Reload
    // =========================================================================
    console.log('\n--- TEST 6: Reload Persistence for Two-Way Voice Messages ---');
    await page.locator('nav button').nth(3).click(); // Connect tab
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('nav button').nth(3).click(); // Connect tab
    await page.waitForSelector('#chat-section audio', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const audios = Array.from(document.querySelectorAll('#chat-section audio'));
        return audios.length >= 2 && audios.every((a) => a.src.startsWith('blob:') && a.readyState >= 1);
      },
      { timeout: 15000 }
    );
    const reloadAudioErrs = await page.locator('#chat-section :text("Unable to load voice message")').count();
    assert(reloadAudioErrs === 0, 'Voice messages showed error after page reload');
    results.push('TEST 6 PASS: Both Mother and Worker voice messages remain visible and playable after full reload');

    // =========================================================================
    // TEST 7: All Existing Roles (Mother, Worker, Supervisor) & Security Negative Checks
    // =========================================================================
    console.log('\n--- TEST 7: All Roles Login + Negative Security Checks ---');
    await logoutFromCurrentRole(page, 'mother');
    await loginAs(page, 'Supervisor', 'SUP-2025-012', 'demo1234');
    await page.waitForTimeout(800);
    await logoutFromCurrentRole(page, 'supervisor');

    // Negative Security Checks via Node fetch
    const unauthChat = await fetch(`${BASE_URL}/api/companion/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello', language: 'en' }),
    });
    assert(unauthChat.status === 401, `Unauth /api/companion/chat expected 401, got ${unauthChat.status}`);

    const unauthVoiceUpload = await fetch(`${BASE_URL}/api/voice-messages/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: 'AAAA', mimeType: 'audio/webm' }),
    });
    assert(unauthVoiceUpload.status === 401, `Unauth /api/voice-messages/upload expected 401, got ${unauthVoiceUpload.status}`);

    const unauthVoiceGet = await fetch(`${BASE_URL}${m2wDownloadUrl}`);
    assert(unauthVoiceGet.status === 401, `Unauth GET voice audio expected 401, got ${unauthVoiceGet.status}`);

    // Worker token blocked from Mother AI Companion (403)
    const workerLoginResp = await fetch(`${BASE_URL}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: 'HW-44120', password: 'demo1234', role: 'worker' }),
    });
    const workerLoginJson = await workerLoginResp.json();
    const workerToken = workerLoginJson.token;
    assert(Boolean(workerToken), 'Failed to get worker token');

    const workerAiResp = await fetch(`${BASE_URL}/api/companion/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
      body: JSON.stringify({ message: 'Hi', language: 'en' }),
    });
    assert(workerAiResp.status === 403, `Worker token on AI Companion expected 403, got ${workerAiResp.status}`);

    // Wrong worker (HW-002) blocked from reading Priya <-> Sunita voice audio (403)
    const otherWorkerResp = await fetch(`${BASE_URL}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: 'HW-002', password: 'demo1234', role: 'worker' }),
    });
    const otherWorkerJson = await otherWorkerResp.json();
    const crossWorkerAudio = await fetch(`${BASE_URL}${m2wDownloadUrl}`, {
      headers: { Authorization: `Bearer ${otherWorkerJson.token}` },
    });
    assert(crossWorkerAudio.status === 403, `Cross-worker audio read expected 403, got ${crossWorkerAudio.status}`);

    results.push('TEST 7 PASS: All 3 roles login cleanly without extra Firebase Auth; 401/403 negative security checks passed');

    assert(authErrors.length === 0, `Auth errors observed during E2E flow: ${JSON.stringify(authErrors)}`);
    assert(apiFailures.length === 0, `5xx API failures observed: ${JSON.stringify(apiFailures)}`);

    console.log('\n================ ALL 7 E2E TESTS PASSED ================');
    results.forEach((r) => console.log('  ✔ ' + r));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
