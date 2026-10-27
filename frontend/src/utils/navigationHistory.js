// Chỉ ghi địa chỉ các trang trong ứng dụng, không lưu dữ liệu form hay token.
// sessionStorage theo từng tab giúp F5 vẫn giữ được nhánh Back/Forward hiện tại.
const snapshots = new Map();
const listeners = new Set();

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
        && item.path.startsWith('/') && !item.path.startsWith('//')).slice(-500);
    } catch { /* Nếu bộ nhớ bị chặn, vẫn dùng lịch sử trong phiên đang mở. */ }
    snapshots.set(storageKey, entries);
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
  const next = [...base.filter(item => item.index !== entry.index), entry]
    .sort((a, b) => a.index - b.index).slice(-500);
  snapshots.set(storageKey, next);
  try { window.sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Dùng bản trong bộ nhớ. */ }
  listeners.forEach(listener => listener());
}
