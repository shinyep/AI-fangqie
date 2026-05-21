import CryptoJS from 'crypto-js';

const KEY = CryptoJS.enc.Utf8.parse('chloefuckityoall');
const IV = CryptoJS.enc.Utf8.parse('9311019310287172');

export function decryptPayload(encoded) {
  const decrypted = CryptoJS.AES.decrypt(encoded, KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString(CryptoJS.enc.Utf8);

  try {
    return JSON.parse(decrypted);
  } catch {
    return decrypted;
  }
}
