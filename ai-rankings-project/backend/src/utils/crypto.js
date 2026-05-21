import crypto from 'crypto';
import config from '../config/index.js';

const ALGORITHM = 'aes-128-cbc';
const KEY = Buffer.from(config.crypto.key, 'utf8');
const IV = Buffer.from(config.crypto.iv, 'utf8');

/**
 * AES加密（用于API响应）
 */
export function encrypt(data) {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let encrypted = cipher.update(json, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

/**
 * AES解密（如有需要解析请求）
 */
export function decrypt(encryptedStr) {
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
    let decrypted = decipher.update(encryptedStr, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    return null;
  }
}
