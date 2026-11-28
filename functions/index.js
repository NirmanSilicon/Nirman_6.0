// Callable backends keep the LLM secret off-device and route opt-in proxy notifications.
const crypto = require("node:crypto");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();
const llmApiKey = defineSecret("LLM_API_KEY");

const systemPrompt = `You are Zedtron, a warm and careful wellbeing and personal-safety assistant.
Use short, plain sentences. Reply in the user's selected language (English or Hindi).
Listen without judgement and offer practical, gentle next steps.
If the user may be in immediate danger, tell them to press SOS in Manas or call 112,
and suggest moving to a safer place with other people when possible.
If low mood persists, gently suggest speaking with a trusted person, counsellor, or
local helpline. Never diagnose, give medical or legal advice, or claim to replace
emergency services or a professional. For imminent self-harm, encourage immediate
contact with emergency services and a trusted person.`;

function requireUser(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in to use this feature.");
  }
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  throw new HttpsError("invalid-argument", "Enter a valid Indian mobile number.");
}

function phoneDocumentId(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

exports.zedtronChat = onCall(
  { secrets: [llmApiKey], timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    requireUser(request);
    const message = request.data?.message;
    const language = request.data?.language;
    if (typeof message !== "string" || message.trim().length === 0 || message.length > 1000) {
      throw new HttpsError("invalid-argument", "Message must be 1–1000 characters.");
    }
    if (!["en", "hi"].includes(language)) {
      throw new HttpsError("invalid-argument", "Choose English or Hindi.");
    }
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${llmApiKey.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ZEDTRON_MODEL || "gpt-4o-mini",
          temperature: 0.4,
          max_tokens: 140,
          messages: [
            { role: "system", content: `${systemPrompt}\nSelected language: ${language}.` },
            { role: "user", content: message.trim() },
          ],
        }),
      });
      if (!response.ok) {
        console.error("Zedtron provider returned HTTP", response.status);
        throw new HttpsError("unavailable", "Zedtron is temporarily unavailable.");
      }
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) {
        throw new HttpsError("unavailable", "Zedtron returned no response.");
      }
      return { reply: reply.trim() };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("Zedtron request failed:", error);
      throw new HttpsError("unavailable", "Zedtron is temporarily unavailable.");
    }
  },
);

exports.registerProxyDevice = onCall(async (request) => {
  requireUser(request);
  const token = request.data?.token;
  const phone = request.auth.token.phone_number;
  if (typeof token !== "string" || token.length < 20 || token.length > 5000 || !phone) {
    throw new HttpsError("invalid-argument", "A verified phone and valid device token are required.");
  }
  const normalizedPhone = normalizePhone(phone);
  await db.collection("proxy_devices").doc(phoneDocumentId(normalizedPhone)).set({
    tokens: admin.firestore.FieldValue.arrayUnion(token),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { registered: true };
});

exports.sendProxyPush = onCall(async (request) => {
  requireUser(request);
  const phone = normalizePhone(request.data?.phone);
  const message = request.data?.message;
  if (typeof message !== "string" || message.trim().length === 0 || message.length > 4000) {
    throw new HttpsError("invalid-argument", "Alert message must be 1–4000 characters.");
  }
  const device = await db.collection("proxy_devices").doc(phoneDocumentId(phone)).get();
  const tokens = device.data()?.tokens || [];
  if (tokens.length === 0) return { delivered: false, reason: "no_registered_device" };
  const result = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: "Manas safety alert", body: message.trim() },
    data: { type: "sos_alert" },
    android: { priority: "high" },
  });
  const invalidTokens = result.responses
    .map((item, index) => item.success ? null : tokens[index])
    .filter(Boolean);
  if (invalidTokens.length > 0) {
    await device.ref.update({
      tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
    });
  }
  return { delivered: result.successCount > 0, devices: result.successCount };
});
