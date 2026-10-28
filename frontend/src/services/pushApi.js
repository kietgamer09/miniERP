import { request } from './http';

export function pushSupported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
function applicationKey(value) {
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(encoded + '='.repeat((4 - encoded.length % 4) % 4)), char => char.charCodeAt(0));
}
export async function browserPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration?.pushManager.getSubscription() || null;
}
export async function enablePush() {
  if (!pushSupported()) throw new Error('Trình duyệt chưa hỗ trợ Web Push hoặc trang chưa dùng HTTPS/localhost.');
  // Phải yêu cầu quyền trực tiếp từ thao tác bấm nút, trước các request bất đồng bộ.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Chưa được cấp quyền thông báo. Bạn có thể cấp lại trong cài đặt của trang.');
  const config = await request('/api/push/config');
  if (!config.enabled || !config.publicKey) throw new Error('Backend chưa cấu hình Web Push.');
  await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(config.publicKey) });
  try { await request('/api/push/subscriptions', { method: 'POST', body: subscription.toJSON() }); }
  catch (error) { await subscription.unsubscribe(); throw error; }
}
export async function disablePush() {
  const subscription = await browserPushSubscription();
  if (!subscription) return;
  try { await request('/api/push/subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } }); }
  finally { await subscription.unsubscribe(); }
}
export async function testPush() {
  const subscription = await browserPushSubscription();
  if (!subscription) throw new Error('Trình duyệt chưa đăng ký nhận thông báo.');
  await request('/api/push/test', { method: 'POST', body: { endpoint: subscription.endpoint } });
}
export async function stopBrowserPush() {
  const subscription = await browserPushSubscription();
  if (subscription) await subscription.unsubscribe();
}
