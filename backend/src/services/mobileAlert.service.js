const https = require('https');
const os = require('os');

let mobileConfig = {
  enabled: true,
  ntfyTopic: process.env.NTFY_TOPIC || 'wardens-eye-blankheads-2026',
  ntfyServer: process.env.NTFY_SERVER || 'https://ntfy.sh',
  webhookUrl: process.env.MOBILE_WEBHOOK_URL || '',
  notifyOnViolation: true,
  notifyOnEmergency: true,
};

// Cooldown map per topic+category so rapid camera frames don't spam 30 pushes/sec
const lastSentMap = new Map();

const getLanIp = () => {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
          return net.address;
        }
      }
    }
  } catch (_e) {}
  return '127.0.0.1';
};

const getMobileAlertConfig = () => ({
  ...mobileConfig,
  lanDashboardUrl: `http://${getLanIp()}:${process.env.PORT || 5000}/#notifications`,
  ntfySubscribeUrl: `${mobileConfig.ntfyServer.replace(/\/$/, '')}/${mobileConfig.ntfyTopic}`,
});

const updateMobileAlertConfig = (patch = {}) => {
  if (typeof patch.enabled === 'boolean') mobileConfig.enabled = patch.enabled;
  if (typeof patch.ntfyTopic === 'string' && patch.ntfyTopic.trim().length >= 3) {
    mobileConfig.ntfyTopic = patch.ntfyTopic
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 64);
  }
  if (typeof patch.webhookUrl === 'string') {
    mobileConfig.webhookUrl = patch.webhookUrl.trim();
  }
  if (typeof patch.notifyOnViolation === 'boolean') mobileConfig.notifyOnViolation = patch.notifyOnViolation;
  if (typeof patch.notifyOnEmergency === 'boolean') mobileConfig.notifyOnEmergency = patch.notifyOnEmergency;
  return getMobileAlertConfig();
};

const postHttpsText = (urlStr, bodyText, headers = {}) =>
  new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const dataBuf = Buffer.from(String(bodyText), 'utf8');
      const req = https.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: 'POST',
          timeout: 4500,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Length': dataBuf.length,
            ...headers,
          },
        },
        (res) => {
          res.resume();
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode });
        }
      );
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'timeout' });
      });
      req.write(dataBuf);
      req.end();
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });

/**
 * Send an instant mobile push notification to the user's phone via `ntfy.sh`
 * (and optional custom webhook).
 * - Fire / Emergency (`isEmergency = true`): Priority `max` (5) -> triggers loud continuous alarm sound & vibration on phone!
 * - PPE Violation (`isEmergency = false`): Priority `high` (4) -> triggers mobile alert tone & heads-up banner!
 */
const sendPhoneAlert = async ({
  title,
  message,
  isEmergency = false,
  tags = 'warning',
  dedupeKey = null,
  cooldownMs = 15000,
  force = false,
}) => {
  if (process.env.NODE_ENV === 'test' && !force) {
    return { sent: false, skippedTest: true };
  }
  if (!mobileConfig.enabled || !mobileConfig.ntfyTopic) {
    return { sent: false, disabled: true };
  }
  if (isEmergency && !mobileConfig.notifyOnEmergency && !force) {
    return { sent: false, filtered: true };
  }
  if (!isEmergency && !mobileConfig.notifyOnViolation && !force) {
    return { sent: false, filtered: true };
  }

  if (dedupeKey && !force) {
    const prev = lastSentMap.get(dedupeKey) || 0;
    if (Date.now() - prev < cooldownMs) {
      return { sent: false, throttled: true };
    }
    lastSentMap.set(dedupeKey, Date.now());
  }

  const targetUrl = `${mobileConfig.ntfyServer.replace(/\/$/, '')}/${encodeURIComponent(mobileConfig.ntfyTopic)}`;
  const cleanTitle = String(title || "Warden's Eye Safety Alert").replace(/[^\x20-\x7E]/g, '').trim();
  const priority = isEmergency ? 'max' : 'high';
  const lanUrl = `http://${getLanIp()}:${process.env.PORT || 5000}/#notifications`;

  const ntfyRes = await postHttpsText(targetUrl, message, {
    Title: cleanTitle || "Warden's Eye Alert",
    Priority: priority,
    Tags: tags,
    Click: lanUrl,
  });

  if (mobileConfig.webhookUrl && mobileConfig.webhookUrl.startsWith('https://')) {
    postHttpsText(
      mobileConfig.webhookUrl,
      JSON.stringify({ title, message, isEmergency, priority, timestamp: new Date().toISOString() }),
      { 'Content-Type': 'application/json' }
    ).catch(() => {});
  }

  return {
    sent: ntfyRes.ok,
    topic: mobileConfig.ntfyTopic,
    priority,
    statusCode: ntfyRes.statusCode || null,
    error: ntfyRes.error || null,
  };
};

module.exports = {
  getMobileAlertConfig,
  updateMobileAlertConfig,
  sendPhoneAlert,
};
