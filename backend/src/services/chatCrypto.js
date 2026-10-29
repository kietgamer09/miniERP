import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const magic = Buffer.from('MERPCHAT1');
export function chatKey() {
  const value = process.env.CHAT_ENCRYPTION_KEY || '';
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) {
    throw Object.assign(new Error('Chưa cấu hình khóa mã hóa chat. Chạy npm run setup:chat rồi khởi động lại backend.'), { status: 503 });
  }
  return key;
}

export function chatSigningKey() {
  return createHmac('sha256', chatKey()).update('miniERP:chat-unlock:v1').digest();
}

export function encryptChatBytes(value, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', chatKey(), iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptChatBytes(value, context) {
  if (value.length < magic.length + 28 || !value.subarray(0, magic.length).equals(magic)) throw new Error('Dữ liệu chat chưa được mã hóa hoặc bị hỏng.');
  const offset = magic.length;
  const decipher = createDecipheriv('aes-256-gcm', chatKey(), value.subarray(offset, offset + 12), { authTagLength: 16 });
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(value.subarray(offset + 12, offset + 28));
  return Buffer.concat([decipher.update(value.subarray(offset + 28)), decipher.final()]);
}

export const encryptChatText = (value, context) => value == null ? null : encryptChatBytes(Buffer.from(value, 'utf8'), context).toString('base64');
export const decryptChatText = (value, context) => value == null ? null : decryptChatBytes(Buffer.from(value, 'base64'), context).toString('utf8');

export function decodeChatMessage(row) {
  if (row.encryption_version !== 1) throw Object.assign(new Error('Lịch sử chat chưa được chuyển sang mã hóa. Chạy npm run setup:chat.'), { status: 503 });
  const { encryption_version, ...message } = row;
  return { ...message, content: decryptChatText(row.content, `chat:${row.chat_id}:content`), file_name: decryptChatText(row.file_name, `chat:${row.chat_id}:filename`) };
}
