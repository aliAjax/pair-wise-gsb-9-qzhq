// 持久化层：按切片命名空间隔离存储
// 文献 library、配额 quota、冻结包 packages 各自独立读写，
// 任一切片缺失或损坏都会回退到种子数据，不串台。
const NS = 'citation-console:v1';
const key = slice => `${NS}:${slice}`;

export function loadSlice(slice, fallback) {
  try {
    const raw = localStorage.getItem(key(slice));
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveSlice(slice, value) {
  try {
    localStorage.setItem(key(slice), JSON.stringify(value));
  } catch {
    // 存储不可用（满额/隐私模式）时静默失败，不影响其他切片
  }
}
