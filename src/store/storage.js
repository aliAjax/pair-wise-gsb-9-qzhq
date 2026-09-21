// 持久化层：文献、配额、投稿包三个互相隔离的命名空间
// 各自独立读写、独立容错，刷新后互不串台

import { seedLibrary, seedPackages } from '../domain/seed.js';
import { DEFAULT_QUOTA } from '../domain/model.js';

const NS = 'citation-desk.v1';
export const KEYS = {
  library: `${NS}.library`,
  quota: `${NS}.quota`,
  packages: `${NS}.packages`,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback; // 单个命名空间损坏不波及其他
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储不可用时保持内存态，不影响其余命名空间 */
  }
}

export const loadLibrary = () => {
  const v = read(KEYS.library, null);
  return Array.isArray(v) ? v : seedLibrary();
};
export const saveLibrary = (items) => write(KEYS.library, items);

export const loadQuota = () => {
  const q = { ...DEFAULT_QUOTA, ...(read(KEYS.quota, null) ?? {}) };
  const n = Number(q.maxPendingSupport);
  return { maxPendingSupport: Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_QUOTA.maxPendingSupport };
};
export const saveQuota = (q) => write(KEYS.quota, q);

export const loadPackages = () => {
  const v = read(KEYS.packages, null);
  return Array.isArray(v) ? v : seedPackages();
};
export const savePackages = (pkgs) => write(KEYS.packages, pkgs);
