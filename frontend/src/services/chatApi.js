import { request } from './http';

const base = '/api/chat';
const storageKey = 'miniErpChatUnlock:v1';
export const CHAT_LOCKED = 'miniERP:chat-locked';
let memorySession = null;
function storedSession() {
  if (memorySession) return memorySession;
  try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { return null; }
}
export function getChatSession(userId) {
  const session = storedSession();
  return session?.userId === userId && typeof session.token === 'string' && Date.parse(session.expires_at) > Date.now() ? session : null;
}
export function saveChatSession(userId, session) {
  const value = { ...session, userId };
  memorySession = value;
  try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Vẫn mở chat trong bộ nhớ tab. */ }
  return value;
}
export function clearChatSession() {
  memorySession = null;
  try { sessionStorage.removeItem(storageKey); } catch { /* Bộ nhớ tab có thể đã bị trình duyệt chặn. */ }
}
async function chatRequest(path, options) {
  const token = storedSession()?.token;
  try { return await request(`${base}${path}`, { ...options, chatUnlock: token }); }
  catch (error) {
    if (error.code === 'CHAT_LOCKED' && token === storedSession()?.token) {
      clearChatSession(); window.dispatchEvent(new Event(CHAT_LOCKED));
    }
    throw error;
  }
}
export const getChatSecurity = () => chatRequest('/security');
export const unlockChat = body => chatRequest('/security/unlock', { method: 'POST', body });
export const setChatPin = body => chatRequest('/security/pin', { method: 'PUT', body: { ...body, method: 'password' } });
export const listChats = () => chatRequest('/conversations');
export const listChatPeople = () => chatRequest('/people');
export const createChat = body => chatRequest('/conversations', { method: 'POST', body });
export const addChatMembers = (id, employeeIds) => chatRequest(`/conversations/${id}/members`, { method: 'POST', body: { employee_ids: employeeIds } });
export const listMessages = (id, params) => chatRequest(`/conversations/${id}/messages`, { params });
export const sendMessage = (id, content) => chatRequest(`/conversations/${id}/messages`, { method: 'POST', body: { content } });
export const sendChatFile = (id, file) => chatRequest(`/conversations/${id}/files`, { method: 'POST', file });
export const downloadChatFile = (id, messageId) => chatRequest(`/conversations/${id}/files/${messageId}`, { download: true });
export const readChat = (id, messageId) => chatRequest(`/conversations/${id}/read`, { method: 'PATCH', body: { message_id: messageId } });
export const getChatDraft = id => chatRequest(`/conversations/${id}/draft`);
export const saveChatDraft = (id, content) => chatRequest(`/conversations/${id}/draft`, { method: 'PUT', body: { content } });
