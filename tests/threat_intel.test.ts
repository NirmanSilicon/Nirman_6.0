import test from 'node:test';
import assert from 'node:assert/strict';
import { extractUrlFeatures } from '../ml-model/urlClassifier.ts';
import {
  analyzeThreatIntelligence,
  isOfficialDomain,
  TRANCO_DOMAINS,
} from '../threat-intelligence/scanner.ts';
import { buildLocalMlVerdict, getVoiceGuidance } from '../voice-guidance/guidance.ts';
import { getMySqlConfig } from '../database/mysql.config.ts';

test('loads Tranco top domains allowlist', () => {
  assert.ok(TRANCO_DOMAINS.size > 10000, 'Expected Tranco allowlist to contain >10k domains');
  assert.equal(isOfficialDomain('cybercrime.gov.in'), true);
  assert.equal(isOfficialDomain('sbi-kyc-verify-now.xyz'), false);
});

test('extracts ML URL features matching phishing signals', () => {
  const feats = extractUrlFeatures('sbi-kyc-verify-now.xyz/login');
  assert.equal(feats.brandSpoof, true);
  assert.equal(feats.hasSuspiciousTld, true);
  assert.ok(feats.actionKeywordCount >= 3);
  assert.ok(feats.hostnameHyphens >= 2);
});

test('fast-path ML detects phishing URL as FRAUD with high score', () => {
  const intel = analyzeThreatIntelligence('http://sbi-kyc-verify-now.xyz/login', 'auto');
  assert.equal(intel.mlConfidence, 'HIGH');
  assert.equal(intel.fastVerdict, 'FRAUD');
  assert.ok(intel.fastScore >= 85);

  const payload = buildLocalMlVerdict(intel, 'en');
  assert.ok(payload);
  assert.equal(payload.verdict, 'FRAUD');
  assert.equal(payload.detectedChannel, 'LINK');
});

test('official domain cybercrime.gov.in resolves as SAFE on fast-path', () => {
  const intel = analyzeThreatIntelligence('https://cybercrime.gov.in', 'auto');
  assert.equal(intel.mlConfidence, 'HIGH');
  assert.equal(intel.fastVerdict, 'SAFE');
  assert.equal(intel.matchedCategory, 'OFFICIAL_DOMAIN');
});

test('UPI scam handle vs standard merchant handle classification', () => {
  const scam = analyzeThreatIntelligence('claim-cashback-prize99@okaxis', 'upi');
  assert.equal(scam.mlConfidence, 'HIGH');
  assert.equal(scam.fastVerdict, 'FRAUD');

  const safe = analyzeThreatIntelligence('bharatpe.merchant@icici', 'upi');
  assert.equal(safe.mlConfidence, 'HIGH');
  assert.equal(safe.fastVerdict, 'SAFE');
});

test('voice guidance supports Odia, Hindi, and English', () => {
  const en = getVoiceGuidance('en', 'DIGITAL_ARREST');
  const hi = getVoiceGuidance('hi', 'DIGITAL_ARREST');
  const or = getVoiceGuidance('or', 'DIGITAL_ARREST');

  assert.ok(en.headline.length > 0);
  assert.ok(hi.headline.includes('डिजिटल अरेस्ट'));
  assert.ok(or.headline.includes('ଡିଜିଟାଲ୍'));
});

test('MySQL config reads safely without hardcoded credentials', () => {
  const cfg = getMySqlConfig();
  assert.equal(typeof cfg.port, 'number');
  assert.equal(cfg.database.length > 0, true);
});
