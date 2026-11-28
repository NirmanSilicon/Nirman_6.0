import { flaggedUPIs } from "../data/flaggedUPIs";

const TRUSTED_RECIPIENTS = [
  "grocery@upi",
  "pharmacy@upi",
  "electricity@upi",
  "son@upi"
];

const URGENT_KEYWORDS = [
  "kyc",
  "urgent",
  "blocked",
  "expire",
  "lottery",
  "refund",
  "collect",
  "penalty"
];

const SENSITIVITY_LIMITS = {
  high: 30, 
  medium: 50,
  low: 75 
};

export function analyzeRisk(transaction = {}, sensitivity = "high") {
  let score = 0;
  const reasons = [];

  const upiId = (transaction.upiId || "").trim().toLowerCase();
  const amount = Number(transaction.amount) || 0;
  const note = (transaction.note || "").toLowerCase();

  const flagged = flaggedUPIs.find(
    item => item.upiId.toLowerCase() === upiId
  );
  if (flagged) {
    score += 60;
    reasons.push(flagged.reason);
  }


  const isNewPerson = !TRUSTED_RECIPIENTS.includes(upiId);
  if (isNewPerson && !flagged) {
    score += 30;
    reasons.push("First-time payment to a new recipient");
  }


  if (isNewPerson && amount >= 2000) {
    score += 35;
    reasons.push(`Large first-time transfer (₹${amount})`);
  }

  if (transaction.isInContacts) {
  score = Math.max(0, score - 25);
  reasons.push("Saved in phone contacts (lower risk)");
  }

  
  const foundUrgentWord = URGENT_KEYWORDS.find(word => note.includes(word));
  if (foundUrgentWord) {
    score += 40;
    reasons.push(`Urgent keyword detected ("${foundUrgentWord}")`);
  }

  
  if (transaction.isOnCall) {
    score += 40;
    reasons.push("Active phone call during payment");
  }

  
  if (!transaction.receiverName?.trim()) {
    score += 10;
    reasons.push("Receiver name is missing");
  }

  score = Math.min(score, 100);

  let riskLevel = "LOW";
  if (score >= 60) {
    riskLevel = "HIGH";
  } else if (score >= 30) {
    riskLevel = "MEDIUM";
  }

  const pauseLimit = SENSITIVITY_LIMITS[sensitivity] || 50;
  const shouldPause = score >= pauseLimit;

  return {
    score,
    riskLevel,
    shouldPause,
    reasons
  };
}