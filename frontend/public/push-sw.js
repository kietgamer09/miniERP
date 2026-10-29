/* global self */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Hiện nội dung dự phòng. */ }
  let path = '/';
  try {
    const url = new URL(data.path || '/', self.location.origin);
    if (url.origin === self.location.origin && /^\/du-an\/\d+(?:\?|$)/.test(url.pathname + url.search)) path = url.pathname + url.search;
  } catch { /* Không mở URL không hợp lệ trong thông báo. */ }
  event.waitUntil(self.registration.showNotification(data.title || 'miniERP', {
    body: data.body || 'Bạn có thông báo mới trong miniERP.',
    tag: data.tag || 'minierp-comment',
    data: { path },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.path || '/', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url.href); return existing.focus(); }
    return self.clients.openWindow(url.href);
  })());
});
