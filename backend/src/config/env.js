import 'dotenv/config';

const jwtSecret = typeof process.env.JWT_SECRET === 'string' ? process.env.JWT_SECRET.trim() : '';
const hasStrongRandomFormat = /^[a-f\d]{64,}$/i.test(jwtSecret) || /^[A-Za-z0-9_-]{43,}$/.test(jwtSecret);
const hasEnoughEntropy = jwtSecret.length >= 32 && new Set(jwtSecret).size >= 12;

if (!hasStrongRandomFormat || !hasEnoughEntropy) {
  throw new Error('JWT_SECRET thiếu hoặc yếu. Hãy tạo secret ngẫu nhiên tối thiểu 64 ký tự hex hoặc 43 ký tự base64url.');
}

export const JWT_SECRET = jwtSecret;
