const crypto = require('crypto');
const { getEnv } = require('../config/env');

const resolveKey = () => {
  const raw = process.env.CAMERA_CREDENTIAL_ENCRYPTION_KEY || getEnv().jwtSecret || 'smartppe_default_aes256_secret_key';
  return crypto.createHash('sha256').update(String(raw)).digest();
};

/**
 * Encrypt sensitive RTSP / IP camera stream credentials at rest using AES-256-GCM.
 */
const encryptCameraCredentials = (plaintext) => {
  if (!plaintext) return null;
  const key = resolveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypt AES-256-GCM encrypted camera stream credentials.
 */
const decryptCameraCredentials = (ciphertext) => {
  if (!ciphertext) return null;
  const parts = String(ciphertext).split(':');
  if (parts.length !== 3) return null;
  const [ivHex, tagHex, encHex] = parts;
  const key = resolveKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};

module.exports = {
  encryptCameraCredentials,
  decryptCameraCredentials,
};
