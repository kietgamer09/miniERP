// Chỉ ghi địa chỉ các trang trong ứng dụng, không lưu dữ liệu form hay token.
// sessionStorage theo từng tab giúp F5 vẫn giữ được nhánh Back/Forward hiện tại.
const snapshots = new Map();
const listeners = new Set();
const MAX_ENTRIES = 8; // Trang hiện tại và tối đa 7 trang để quay lại.

function limitHistory(entries, currentIndex) {
  const position = entries.findIndex(item => item.index === currentIndex);
  if (position < 0) return entries.slice(-MAX_ENTRIES);
  const start = Math.min(Math.max(0, position - MAX_ENTRIES + 1), Math.max(0, entries.length - MAX_ENTRIES));
  return entries.slice(start, start + MAX_ENTRIES);
}

function persistHistory(storageKey, entries) {
  try { window.sessionStorage.setItem(storageKey, JSON.stringify(entries)); } catch { /* Dùng bản trong bộ nhớ. */ }
}

export function subscribeHistory(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHistory(storageKey) {
  if (!snapshots.has(storageKey)) {
    let entries = [];
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) entries = saved.filter(item => Number.isInteger(item?.index)
        && item.index >= 0 && typeof item.key === 'string' && typeof item.path === 'string'
        && item.path.startsWith('/') && !item.path.startsWith('//'));
    } catch { /* Nếu bộ nhớ bị chặn, vẫn dùng lịch sử trong phiên đang mở. */ }
    entries = limitHistory(entries, window.history.state?.idx);
    snapshots.set(storageKey, entries);
    persistHistory(storageKey, entries);
  }
  return snapshots.get(storageKey);
}

export function recordNavigation(storageKey, entry, action) {
  const previous = getHistory(storageKey);
  const current = previous.find(item => item.index === entry.index);
  if (current?.key === entry.key && current.path === entry.path) return;

  // PUSH bỏ nhánh tiến lên, REPLACE giữ nhánh đó, POP dùng lịch sử có sẵn.
  // POP không khớp có thể là một lịch sử trình duyệt mới: không dùng nhầm dữ liệu cũ.
  const base = action === 'PUSH' ? previous.filter(item => item.index < entry.index)
    : action === 'POP' && current && (current.key !== entry.key || current.path !== entry.path) ? [] : previous;
  const next = limitHistory([...base.filter(item => item.index !== entry.index), entry]
    .sort((a, b) => a.index - b.index), entry.index);
  snapshots.set(storageKey, next);
  persistHistory(storageKey, next);
  listeners.forEach(listener => listener());
}
