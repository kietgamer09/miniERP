import express from 'express';
import prisma from '../config/prisma.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { attachEmployee } from '../middlewares/employeeMiddleware.js';
import { pushConfig, validSubscription } from '../services/webPush.js';
import webpush from 'web-push';
const router = express.Router();
router.use(verifyToken, attachEmployee);
router.get('/config', (req, res) => res.json({ enabled: Boolean(pushConfig().publicKey && pushConfig().privateKey), publicKey: pushConfig().publicKey || null }));
router.post('/subscriptions', async (req, res, next) => {
  try {
    if (!pushConfig().publicKey || !pushConfig().privateKey) return res.status(503).json({ error: 'Backend chưa cấu hình Web Push' });
    if (!validSubscription(req.body)) return res.status(400).json({ error: 'Đăng ký Web Push không hợp lệ hoặc dịch vụ push chưa được hỗ trợ' });
    const { endpoint, keys } = req.body;
    const employeeId = req.employee.employee_id;
    const [result] = await prisma.$queryRaw`
      INSERT INTO work_push_subscriptions(employee_id, endpoint, p256dh, auth)
      SELECT ${employeeId}, ${endpoint}, ${keys.p256dh}, ${keys.auth}
      WHERE (SELECT count(*) FROM work_push_subscriptions WHERE employee_id = ${employeeId}) < 10
        OR EXISTS (SELECT 1 FROM work_push_subscriptions WHERE endpoint = ${endpoint})
      ON CONFLICT (endpoint) DO UPDATE SET employee_id = EXCLUDED.employee_id,
        p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
        created_at = CASE WHEN work_push_subscriptions.employee_id = EXCLUDED.employee_id
          THEN work_push_subscriptions.created_at ELSE now() END
      RETURNING id`;
    if (!result) return res.status(400).json({ error: 'Mỗi tài khoản tối đa 10 thiết bị nhận thông báo' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});
router.delete('/subscriptions', async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || endpoint.length > 2048) return res.status(400).json({ error: 'Đăng ký không hợp lệ' });
    await prisma.$executeRaw`DELETE FROM work_push_subscriptions WHERE endpoint = ${endpoint} AND employee_id = ${req.employee.employee_id}`;
    res.sendStatus(204);
  } catch (error) { next(error); }
});
router.post('/test', async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || endpoint.length > 2048) return res.status(400).json({ error: 'Đăng ký không hợp lệ' });
    const [row] = await prisma.$queryRaw`SELECT * FROM work_push_subscriptions WHERE employee_id = ${req.employee.employee_id} AND endpoint = ${endpoint}`;
    if (!row) return res.status(404).json({ error: 'Trình duyệt này chưa đăng ký nhận thông báo' });
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({
      title: 'miniERP · Thông báo thử', body: 'Web Push đã hoạt động. Bạn có thể nhận bình luận mới khi đóng tab miniERP.', tag: 'minierp-push-test', path: '/',
    }), { vapidDetails: pushConfig(), TTL: 300, timeout: 10000 });
    res.sendStatus(204);
  } catch (error) {
    if (error.statusCode) return res.status(502).json({ error: 'Dịch vụ push chưa nhận được thông báo thử. Hãy thử lại hoặc tắt/bật đăng ký.' });
    next(error);
  }
});
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Web Push subscription:', error.code || error.name);
  res.status(500).json({ error: 'Không lưu được Web Push. Kiểm tra npm run setup:web-push tại backend.' });
});
export default router;
