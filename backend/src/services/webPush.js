import webpush from 'web-push';
import prisma from '../config/prisma.js';

export function pushConfig() {
  return {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || 'https://minierp.local',
  };
}
export function validSubscription(value) {
  try {
    const url = new URL(value?.endpoint);
    const host = url.hostname;
    const known = ['fcm.googleapis.com', 'android.googleapis.com', 'web.push.apple.com'].includes(host)
      || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com');
    return known && url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && value.endpoint.length <= 2048 && /^[A-Za-z0-9_-]{86,88}$/.test(value.keys?.p256dh || '')
      && /^[A-Za-z0-9_-]{22,24}$/.test(value.keys?.auth || '');
  } catch { return false; }
}

export async function pendingPush(db = prisma) {
  return db.$queryRaw`
    WITH comments AS (
      SELECT 'task'::text kind, c.id comment_id, t.project_id, t.id task_id, c.author_id,
        c.created_at AT TIME ZONE current_setting('TimeZone') created_at
      FROM task_comments c JOIN tasks t ON t.id = c.task_id
      UNION ALL
      SELECT 'project', c.id, c.project_id, NULL::integer, c.author_id, c.created_at FROM work_project_comments c
    )
    SELECT s.*, c.kind, c.comment_id, c.project_id, c.task_id
    FROM comments c JOIN projects p ON p.id = c.project_id
    JOIN work_push_subscriptions s ON s.created_at <= c.created_at AND s.employee_id <> c.author_id
    JOIN employees e ON e.employee_id = s.employee_id AND e.status = 'dang_lam_viec'
    LEFT JOIN work_push_deliveries d ON d.subscription_id = s.id AND d.kind = c.kind AND d.comment_id = c.comment_id
    LEFT JOIN work_comment_reads r ON r.employee_id = s.employee_id AND r.kind = c.kind AND r.comment_id = c.comment_id
    WHERE c.created_at > now() - interval '24 hours' AND r.comment_id IS NULL
      AND (d.subscription_id IS NULL OR (d.delivered_at IS NULL AND d.attempts < 5 AND d.next_attempt_at <= now()))
      AND (p.manager_id = s.employee_id OR EXISTS (
        SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.employee_id = s.employee_id
      )) ORDER BY c.created_at ASC, s.id LIMIT 100`;
}
export async function deliverPush(row, db = prisma, send = webpush.sendNotification.bind(webpush)) {
  const claims = await db.$queryRaw`
    INSERT INTO work_push_deliveries(subscription_id, kind, comment_id, attempts, next_attempt_at)
    VALUES (${row.id}, ${row.kind}, ${row.comment_id}, 1, now() + interval '60 seconds')
    ON CONFLICT (subscription_id, kind, comment_id) DO UPDATE SET
      attempts = work_push_deliveries.attempts + 1, next_attempt_at = now() + interval '60 seconds'
    WHERE work_push_deliveries.delivered_at IS NULL AND work_push_deliveries.attempts < 5
      AND work_push_deliveries.next_attempt_at <= now() RETURNING subscription_id`;
  if (!claims.length) return;
  try {
    await send({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({
      title: 'miniERP · Bình luận mới',
      body: 'Có bình luận mới trong dự án hoặc công việc bạn tham gia. Bấm để xem chi tiết.',
      tag: `comment:${row.kind}:${row.comment_id}`,
      path: `/du-an/${row.project_id}${row.task_id ? `?task=${row.task_id}` : '?discussion=1'}`,
    }), { vapidDetails: pushConfig(), TTL: 3600, urgency: 'normal', timeout: 10000 });
    await db.$executeRaw`UPDATE work_push_deliveries SET delivered_at = now() WHERE subscription_id = ${row.id} AND kind = ${row.kind} AND comment_id = ${row.comment_id}`;
  } catch (error) {
    if ([404, 410].includes(error.statusCode)) await db.$executeRaw`DELETE FROM work_push_subscriptions WHERE id = ${row.id}`;
    else console.error('Web Push chưa gửi được:', error.statusCode || error.code || error.name);
  }
}
export function startPushWorker() {
  if (!pushConfig().publicKey || !pushConfig().privateKey) return;
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const rows = await pendingPush();
      for (let i = 0; i < rows.length; i += 5) await Promise.allSettled(rows.slice(i, i + 5).map(row => deliverPush(row)));
    } catch (error) { console.error('Web Push worker:', error.code || error.name); }
    finally { busy = false; }
  };
  tick();
  const timer = setInterval(tick, 15000);
  timer.unref();
  return () => clearInterval(timer);
}
