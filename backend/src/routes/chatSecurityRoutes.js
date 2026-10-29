import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import prisma from '../config/prisma.js';
import { chatKey, chatSigningKey } from '../services/chatCrypto.js';

const router = express.Router();
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

export function chatDay(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return { day, expires: Math.floor((Date.parse(`${day}T00:00:00+07:00`) + 86400000) / 1000) };
}

const authDigest = req => createHash('sha256').update(req.get('Authorization') || '').digest('hex');

export function validChatGrant(req, version, now = new Date()) {
  try {
    const token = jwt.verify(req.get('X-Chat-Unlock') || '', chatSigningKey(), { algorithms: ['HS256'], clockTimestamp: Math.floor(now.getTime() / 1000), audience: 'miniERP-chat' });
    return token.purpose === 'chat-unlock' && token.user_id === req.user.user_id
      && token.employee_id === req.employee.employee_id && token.version === version
      && token.day === chatDay(now).day && token.session === authDigest(req) ? token : null;
  } catch { return null; }
}

function grant(req, version) {
  const { day, expires } = chatDay();
  const exp = Math.min(expires, req.user.exp || expires);
  return {
    token: jwt.sign({ purpose: 'chat-unlock', user_id: req.user.user_id, employee_id: req.employee.employee_id,
      version, day, session: authDigest(req), exp }, chatSigningKey(), { algorithm: 'HS256', audience: 'miniERP-chat' }),
    expires_at: new Date(exp * 1000).toISOString(),
  };
}

export const requireChatUnlock = (req, res, next) => {
  Promise.resolve().then(async () => {
    chatKey();
    const rows = await prisma.$queryRaw`SELECT version FROM work_chat_security WHERE employee_id = ${req.employee.employee_id}`;
    if (!rows.length || !validChatGrant(req, rows[0].version)) {
      return res.status(423).json({ code: 'CHAT_LOCKED', error: 'Trò chuyện đã khóa. Nhập mã cá nhân hoặc mật khẩu tài khoản để mở trong ngày hôm nay.' });
    }
    next();
  }).catch(next);
};

router.get('/', handle(async (req, res) => {
  chatKey();
  const rows = await prisma.$queryRaw`SELECT pin_hash IS NOT NULL AS has_pin, version FROM work_chat_security WHERE employee_id = ${req.employee.employee_id}`;
  const token = validChatGrant(req, rows[0]?.version ?? 0);
  res.json({ has_pin: Boolean(rows[0]?.has_pin), unlocked: Boolean(token), expires_at: token ? new Date(token.exp * 1000).toISOString() : null });
}));

async function authenticate(req, changePin = false) {
  const { method, credential, pin } = req.body || {};
  if (!['pin', 'password'].includes(method) || typeof credential !== 'string' || !credential || Buffer.byteLength(credential, 'utf8') > 72) {
    return { status: 400, error: 'Nhập mã hoặc mật khẩu hợp lệ (tối đa 72 byte).' };
  }
  if (changePin && (method !== 'password' || typeof pin !== 'string' || !/^\d{6,12}$/.test(pin))) {
    return { status: 400, error: 'Dùng mật khẩu tài khoản để đặt mã cá nhân gồm 6–12 chữ số.' };
  }
  chatKey();
  return prisma.$transaction(async db => {
    const id = req.employee.employee_id;
    await db.$executeRaw`INSERT INTO work_chat_security(employee_id) VALUES (${id}) ON CONFLICT DO NOTHING`;
    const [security] = await db.$queryRaw`SELECT *, blocked_until > now() AS is_blocked FROM work_chat_security WHERE employee_id = ${id} FOR UPDATE`;
    if (security.is_blocked) {
      return { status: 429, error: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' };
    }
    const user = await db.users.findUnique({ where: { user_id: req.user.user_id }, select: { password: true } });
    const hash = method === 'password' ? user?.password : security.pin_hash;
    const matched = typeof hash === 'string' && await bcrypt.compare(credential, hash);
    if (!matched) {
      const attempts = security.blocked_until ? 1 : security.failed_attempts + 1;
      const blocked = attempts >= 5;
      await db.$executeRaw`UPDATE work_chat_security SET failed_attempts = ${attempts},
        blocked_until = CASE WHEN ${blocked} THEN now() + interval '15 minutes' ELSE NULL END WHERE employee_id = ${id}`;
      return { status: blocked ? 429 : 403, error: blocked ? 'Nhập sai 5 lần. Trò chuyện tạm khóa trong 15 phút.' : 'Mã cá nhân hoặc mật khẩu không đúng.' };
    }
    if (changePin) {
      const pinHash = await bcrypt.hash(pin, 12);
      await db.$executeRaw`UPDATE work_chat_security SET pin_hash = ${pinHash}, version = version + 1 WHERE employee_id = ${id}`;
    }
    await db.$executeRaw`UPDATE work_chat_security SET failed_attempts = 0, blocked_until = NULL WHERE employee_id = ${id}`;
    return { version: security.version + (changePin ? 1 : 0) };
  });
}

router.post('/unlock', handle(async (req, res) => {
  const result = await authenticate(req);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(grant(req, result.version));
}));

router.put('/pin', handle(async (req, res) => {
  const result = await authenticate(req, true);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(grant(req, result.version));
}));

export default router;
