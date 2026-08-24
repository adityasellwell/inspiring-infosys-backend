// Self-hosted text captcha — generates a short code and signs it with an
// HMAC so it can be verified statelessly (no DB/session storage needed).
import crypto from 'crypto';

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
const CODE_LENGTH = 6;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSecret() {
  return process.env.CAPTCHA_SECRET || process.env.JWT_SECRET || 'inspiring-infosys-captcha-fallback';
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function issueCaptcha() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CAPTCHA_CHARS[crypto.randomInt(CAPTCHA_CHARS.length)];
  }
  const expires = Date.now() + TTL_MS;
  const payload = `${code}.${expires}`;
  const token = Buffer.from(`${payload}.${sign(payload)}`).toString('base64');
  return { code, token };
}

export function verifyCaptcha(token, answer) {
  if (!token || !answer) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [code, expires, signature] = decoded.split('.');
    if (!code || !expires || !signature) return false;
    if (Date.now() > Number(expires)) return false;
    if (sign(`${code}.${expires}`) !== signature) return false;
    return code.toUpperCase() === String(answer).trim().toUpperCase();
  } catch {
    return false;
  }
}
