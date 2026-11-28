import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DetectedPattern {
  name: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  psychologyHook: string;
  explanation: string;
}

interface RiskAnalysisResponse {
  gameTitle: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  breakdown: {
    skillPct: number;
    cosmeticPct: number;
    gamblingPct: number;
  };
  detectedPatterns: DetectedPattern[];
  gamerAlert: string;
  parentAlert: string;
  summary: string;
  analysisSource: "gemini" | "heuristic";
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function analyzeHeuristically(
  title: string,
  description: string,
  language: "en" | "hi"
): RiskAnalysisResponse {
  const text = `${title} ${description}`.toLowerCase();
  const patterns: DetectedPattern[] = [];
  let score = 15;

  const isHindi = language === "hi";

  const hasGachaOrLoot =
    /gacha|loot\s*box|banner|0\.\d+%|summon|pack|crate|drop\s*rate|pity|rng|roulette|wheel|spin/.test(
      text
    );
  const hasFomo =
    /fomo|countdown|limited[- ]time|timer|daily\s*shop|rotating|expires|hurry|last\s*chance|flash\s*sale/.test(
      text
    );
  const hasDualCurrency =
    /gem|crystal|diamond|coin|token|virtual\s*currency|dual[- ]currency|v-bucks|points|shards/.test(
      text
    );
  const hasPayToWin =
    /pay[- ]to[- ]win|p2w|stat\s*boost|power|ultimate|reset|annual\s*reset|competitive\s*advantage|meta/.test(
      text
    );
  const hasNearMiss =
    /near[- ]miss|almost|teaser|animation|glow|spark|jackpot/.test(text);
  const hasCosmeticPass =
    /cosmetic|skin|battle\s*pass|emote|outfit|visual\s*only/.test(text);
  const hasSafeSignals =
    /one[- ]time\s*purchase|no\s*microtransactions|zero\s*microtransactions|offline|indie|skill[- ]only|fair|creativity|co-op|story/.test(
      text
    );

  if (hasGachaOrLoot) {
    score += 36;
    patterns.push({
      name: isHindi ? "वेरिएबल-रेशियो RNG लूट बॉक्स" : "Variable-Ratio RNG Rewards",
      severity: "HIGH",
      psychologyHook: isHindi ? "डोपामाइन लूप और अनिश्चित इनाम" : "Variable-Ratio Reinforcement",
      explanation: isHindi
        ? "अनिश्चित जीत की संभावना दिमाग को बार-बार पैसे खर्च करने के लिए प्रेरित करती है, ठीक स्लॉट मशीन की तरह।"
        : "Unpredictable drop rates trigger repeated dopamine spikes, mimicking slot-machine conditioning to encourage more spending.",
    });
  }

  if (hasDualCurrency) {
    score += 20;
    patterns.push({
      name: isHindi ? "दोहरी वर्चुअल मुद्रा जाल" : "Dual-Currency Obfuscation",
      severity: "HIGH",
      psychologyHook: isHindi ? "असली पैसे का अहसास छिपाना" : "Pain-of-Paying Disconnection",
      explanation: isHindi
        ? "असली रुपये को जेम्स या क्रिस्टल में बदलने से खिलाड़ी यह भूल जाते हैं कि वे कितना असली पैसा खर्च कर रहे हैं।"
        : "Converting real currency into gems or tokens masks the true financial cost of each pull and leaves odd unspendable balances.",
    });
  }

  if (hasFomo) {
    score += 18;
    patterns.push({
      name: isHindi ? "FOMO काउंटडाउन टाइमर" : "FOMO Countdown Timers",
      severity: "MEDIUM",
      psychologyHook: isHindi ? "कमी और जल्दबाज़ी का दबाव" : "Artificial Scarcity & Urgency",
      explanation: isHindi
        ? "सीमित समय के बैनर और रोटेटिंग शॉप खिलाड़ियों को बिना सोचे-समझे तुरंत खरीदने के लिए मजबूर करते हैं।"
        : "Expiring banners and 24-hour rotating shops pressure players into impulsive purchases before verifying real odds.",
    });
  }

  if (hasPayToWin) {
    score += 22;
    patterns.push({
      name: isHindi ? "पे-टू-विन RNG और रीसेट" : "Pay-to-Win RNG & Annual Reset",
      severity: "HIGH",
      psychologyHook: isHindi ? "संक-कॉस्ट और प्रतिस्पर्धा दबाव" : "Sunk-Cost Escalation",
      explanation: isHindi
        ? "ताकतवर खिलाड़ी या आइटम पैसों के पैक में बंद होने से जीतने के लिए बार-बार खर्च करने का दबाव बढ़ता है।"
        : "Locking competitive stats behind randomized packs forces players to spend continually, especially when progress resets yearly.",
    });
  }

  if (hasNearMiss) {
    score += 12;
    patterns.push({
      name: isHindi ? "नियर-मिस एनीमेशन भ्रम" : "Near-Miss Animations",
      severity: "MEDIUM",
      psychologyHook: isHindi ? "जीत के करीब होने का झूठा एहसास" : "Cognitive Near-Miss Illusion",
      explanation: isHindi
        ? "जैकपॉट के ठीक बगल में रुकने वाला एनीमेशन खिलाड़ी को लगता है कि अगली बार जीत पक्की है, जबकि परिणाम पहले से तय होता है।"
        : "Visual teasers that stop one slot away from a grand prize create a false sense of imminent victory despite fixed low odds.",
    });
  }

  if (hasCosmeticPass && !hasGachaOrLoot && !hasPayToWin) {
    score += 18;
    patterns.push({
      name: isHindi ? "कॉस्मेटिक बैटल पास और शॉप" : "Cosmetic Battle Pass Pressure",
      severity: "MEDIUM",
      psychologyHook: isHindi ? "सामाजिक तुलना और ग्राइंड दबाव" : "Social Conformity & Time Sunk",
      explanation: isHindi
        ? "स्किन्स गेम जीतने की ताकत नहीं बढ़ातीं, लेकिन समय-सीमा और दोस्तों के दबाव से खर्च बढ़ सकता है।"
        : "Items do not affect gameplay fairness, though time-limited passes can encourage daily grinding and social spending pressure.",
    });
  }

  if (hasSafeSignals && !hasGachaOrLoot && !hasPayToWin) {
    score = Math.min(score, 16);
    if (patterns.length === 0) {
      patterns.push({
        name: isHindi ? "पारदर्शी कौशल-आधारित डिज़ाइन" : "Transparent Skill-First Design",
        severity: "LOW",
        psychologyHook: isHindi ? "स्वस्थ आंतरिक प्रेरणा" : "Intrinsic Mastery Loop",
        explanation: isHindi
          ? "एकमुश्त कीमत और बिना किसी रैंडम पैसे के मैकेनिक के यह गेम खिलाड़ी के समय और कौशल का सम्मान करता है।"
          : "With upfront pricing and zero randomized real-money hooks, progression depends purely on player skill and creativity.",
      });
    }
  }

  if (patterns.length === 0) {
    score = 42;
    patterns.push({
      name: isHindi ? "सीमित मुद्रीकरण विवरण" : "In-App Purchase Ambiguity",
      severity: "MEDIUM",
      psychologyHook: isHindi ? "अस्पष्ट खर्च संरचना" : "Unverified Storefront Odds",
      explanation: isHindi
        ? "पूरी पॉलिसी उपलब्ध न होने पर माता-पिता को जांचना चाहिए कि क्या खरीद कॉस्मेटिक है या रैंडम लूट बॉक्स।"
        : "Without explicit odds disclosures, verify whether in-game purchases grant guaranteed items or randomized chances.",
    });
  }

  const riskScore = clamp(Math.round(score), 5, 98);
  const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
    riskScore >= 65 ? "HIGH" : riskScore >= 32 ? "MEDIUM" : "LOW";

  let gamblingPct = hasGachaOrLoot || hasPayToWin ? clamp(riskScore - 15, 35, 80) : riskLevel === "MEDIUM" ? 15 : 0;
  let cosmeticPct = hasCosmeticPass ? 45 : riskLevel === "HIGH" ? 18 : riskLevel === "MEDIUM" ? 35 : 10;
  if (gamblingPct + cosmeticPct > 92) {
    cosmeticPct = 92 - gamblingPct;
  }
  const skillPct = Math.max(5, 100 - gamblingPct - cosmeticPct);

  const resolvedTitle = title.trim() || (isHindi ? "कस्टम गेम ऑडिट" : "Custom Game Audit");

  return {
    gameTitle: resolvedTitle,
    riskScore,
    riskLevel,
    breakdown: {
      skillPct,
      cosmeticPct,
      gamblingPct,
    },
    detectedPatterns: patterns,
    gamerAlert:
      riskLevel === "HIGH"
        ? isHindi
          ? "चेतावनी: इस गेम में उच्च-जोखिम वाले RNG मैकेनिक हैं। असली पैसे खर्च करने से पहले ड्रॉप रेट और असली लागत की गणना करें।"
          : "Watch out: Core rewards use casino-style probability loops. Check the true cost per rare pull before spending real money."
        : riskLevel === "MEDIUM"
          ? isHindi
            ? "सावधानी: शॉप टाइमर आपको जल्दी खरीदने के लिए उकसा सकते हैं। केवल तय बजट में रहें और रैंडम पैक से बचें।"
            : "Stay mindful: Rotating shops use urgency to nudge impulse buys. Stick to guaranteed items and set a strict monthly cap."
          : isHindi
            ? "सुरक्षित: इसमें कोई जुए जैसा मैकेनिक नहीं मिला। आपकी जीत पूरी तरह आपके कौशल पर निर्भर करती है।"
            : "Clear play: No predatory gambling loops detected. Your progression stays 100% driven by skill and creativity.",
    parentAlert:
      riskLevel === "HIGH"
        ? isHindi
          ? "अभिभावक सलाह: इस गेम में बच्चों के लिए छिपे हुए खर्च और अनिश्चित इनाम का जोखिम है। 1-क्लिक पेमेंट तुरंत बंद करें।"
          : "Parent Guidance: High exposure to variable-ratio spending traps. Disable 1-click payments and require a password for every store purchase."
        : riskLevel === "MEDIUM"
          ? isHindi
            ? "अभिभावक सलाह: गेमिंग निष्पक्ष है, लेकिन कॉस्मेटिक शॉप में FOMO दबाव है। प्रीपेड गिफ्ट कार्ड या साप्ताहिक सीमा तय करें।"
            : "Parent Guidance: Gameplay itself is fair, though rotating cosmetic shops encourage FOMO. Set a clear monthly allowance together."
          : isHindi
            ? "अभिभावक सलाह: यह एक सुरक्षित और पारदर्शी गेम है जिसमें अनचाहे माइक्रोट्रांजेक्शन का खतरा नहीं है।"
            : "Parent Guidance: Low financial risk. One-time or transparent model makes this suitable for uninterrupted, safe play.",
    summary:
      riskLevel === "HIGH"
        ? isHindi
          ? `${resolvedTitle} में कई जुए जैसे डार्क पैटर्न पाए गए हैं जो बार-बार खर्च करने की आदत डाल सकते हैं।`
          : `${resolvedTitle} combines opaque random drop odds with urgency triggers that mirror gambling mechanics.`
        : riskLevel === "MEDIUM"
          ? isHindi
            ? `${resolvedTitle} मुख्य रूप से कौशल और कॉस्मेटिक पर आधारित है, लेकिन इसमें FOMO आधारित शॉप दबाव मौजूद है।`
            : `${resolvedTitle} avoids pay-to-win RNG but uses time-limited cosmetic storefronts to drive repeat spending.`
          : isHindi
            ? `${resolvedTitle} एक स्वस्थ, कौशल-प्रथम अनुभव प्रदान करता है जिसमें कोई संदिग्ध RNG मुद्रीकरण नहीं है।`
            : `${resolvedTitle} maintains clean, player-first monetization with transparent progression and zero gambling loops.`,
    analysisSource: "heuristic",
  };
}

async function analyzeWithGemini(
  title: string,
  description: string,
  language: "en" | "hi"
): Promise<RiskAnalysisResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return analyzeHeuristically(title, description, language);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const langInstruction =
      language === "hi"
        ? "Respond in natural, clear Hindi (Devanagari script) for all human-readable text fields (name, psychologyHook, explanation, gamerAlert, parentAlert, summary). Keep riskLevel strictly as LOW, MEDIUM, or HIGH."
        : "Respond in plain, accessible English suitable for young gamers and non-technical parents.";

    const prompt = `Analyze the following video game and/or monetization description for predatory gambling-like mechanics and dark patterns.
Game Title: ${title || "Unspecified Game"}
Monetization / Shop Details: ${description || "No description provided—infer carefully from the game title or standard industry patterns if well-known, otherwise note limited info."}

Evaluate:
1. Predatory riskScore from 0 to 100 (0 = completely ethical/one-time purchase, 100 = extreme pay-to-win gacha/loot box casino).
2. riskLevel: LOW (0-31), MEDIUM (32-64), or HIGH (65-100).
3. breakdown percentages (skillPct, cosmeticPct, gamblingPct) that sum cleanly to 100.
4. 2 to 4 specific detectedPatterns (e.g., FOMO Timers, Dual-Currency Obfuscation, Variable-Ratio Rewards, Near-Miss Animations, Pay-to-Win RNG, or Transparent Skill-First Design if safe).
5. Concise gamerAlert, parentAlert, and 1-sentence summary.
${langInstruction}`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction:
          "You are FairPlay Lens, a consumer protection and behavioral game design analyst helping families distinguish skill-based gaming from gambling-like dark patterns.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gameTitle: { type: Type.STRING },
            riskScore: { type: Type.INTEGER },
            riskLevel: { type: Type.STRING },
            breakdown: {
              type: Type.OBJECT,
              properties: {
                skillPct: { type: Type.INTEGER },
                cosmeticPct: { type: Type.INTEGER },
                gamblingPct: { type: Type.INTEGER },
              },
              required: ["skillPct", "cosmeticPct", "gamblingPct"],
            },
            detectedPatterns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  psychologyHook: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["name", "severity", "psychologyHook", "explanation"],
              },
            },
            gamerAlert: { type: Type.STRING },
            parentAlert: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: [
            "gameTitle",
            "riskScore",
            "riskLevel",
            "breakdown",
            "detectedPatterns",
            "gamerAlert",
            "parentAlert",
            "summary",
          ],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return analyzeHeuristically(title, description, language);
    }

    const parsed = JSON.parse(rawText) as Omit<RiskAnalysisResponse, "analysisSource">;
    const riskScore = clamp(Number(parsed.riskScore) || 50, 0, 100);
    const riskLevel: "LOW" | "MEDIUM" | "HIGH" =
      parsed.riskLevel === "LOW" || parsed.riskLevel === "MEDIUM" || parsed.riskLevel === "HIGH"
        ? parsed.riskLevel
        : riskScore >= 65
          ? "HIGH"
          : riskScore >= 32
            ? "MEDIUM"
            : "LOW";

    const s = clamp(Number(parsed.breakdown?.skillPct) || 0, 0, 100);
    const c = clamp(Number(parsed.breakdown?.cosmeticPct) || 0, 0, 100);
    const g = clamp(Number(parsed.breakdown?.gamblingPct) || 0, 0, 100);
    const total = s + c + g || 100;
    const skillPct = Math.round((s / total) * 100);
    const cosmeticPct = Math.round((c / total) * 100);
    const gamblingPct = Math.max(0, 100 - skillPct - cosmeticPct);

    return {
      gameTitle: parsed.gameTitle || title || "Analyzed Game",
      riskScore,
      riskLevel,
      breakdown: { skillPct, cosmeticPct, gamblingPct },
      detectedPatterns: Array.isArray(parsed.detectedPatterns)
        ? parsed.detectedPatterns.slice(0, 5).map((p) => ({
            name: p.name || "Detected Pattern",
            severity:
              p.severity === "LOW" || p.severity === "MEDIUM" || p.severity === "HIGH"
                ? p.severity
                : riskLevel,
            psychologyHook: p.psychologyHook || "Behavioral Trigger",
            explanation: p.explanation || "",
          }))
        : [],
      gamerAlert: parsed.gamerAlert || "",
      parentAlert: parsed.parentAlert || "",
      summary: parsed.summary || "",
      analysisSource: "gemini",
    };
  } catch (err) {
    console.warn("Gemini analyze fallback triggered:", err instanceof Error ? err.message : err);
    return analyzeHeuristically(title, description, language);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post("/api/analyze", async (req: Request, res: Response) => {
    const body = req.body as { title?: unknown; description?: unknown; language?: unknown };
    const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
    const description =
      typeof body.description === "string" ? body.description.slice(0, 4000) : "";
    const language: "en" | "hi" = body.language === "hi" ? "hi" : "en";

    if (!title.trim() && !description.trim()) {
      res.status(400).json({ error: "Please provide a game title or monetization description." });
      return;
    }

    const result = await analyzeWithGemini(title, description, language);
    res.json(result);
  });

  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`FairPlay Lens server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
