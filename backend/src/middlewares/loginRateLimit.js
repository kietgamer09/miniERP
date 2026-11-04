import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const windowMs = 15 * 60 * 1000;
const response = {
  code: 'LOGIN_RATE_LIMITED',
  error: 'Đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
};

export const loginIpRateLimit = rateLimit({
  windowMs,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: response,
});

export const loginAccountRateLimit = rateLimit({
  windowMs,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.username || '').trim().toLowerCase()}`,
  message: response,
});
