// ============================================================
//  SaveSystem — lưu hồ sơ nhập vai cùng quy ước với SaveManager của Studio (localStorage,
//  có version, kiểm tra trước khi lưu, migrate + sửa khi mở). Có thể truyền storage khác (kiểm thử).
// ============================================================
import { validateProfile, migrateProfile } from './schema.js';

export const PROFILE_KEY = 'ctao.rpg.profile';

const defaultStorage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

export function saveProfile(profile, storage = defaultStorage()) {
  const errs = validateProfile(profile);
  if (errs.length) return { ok: false, error: `Hồ sơ không nhất quán, chưa lưu: ${errs[0]}` };
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Không lưu được (${e.name})` };
  }
}

export function loadProfile(storage = defaultStorage()) {
  let raw;
  try {
    raw = JSON.parse(storage?.getItem(PROFILE_KEY) || 'null');
  } catch {
    return { errors: ['Hồ sơ lưu bị hỏng (JSON)'] };
  }
  if (!raw) return { profile: null, fixes: [], errors: [] };
  return migrateProfile(raw);
}

export function deleteProfile(storage = defaultStorage()) {
  try {
    storage.removeItem(PROFILE_KEY);
  } catch {
    /* bỏ qua */
  }
}

/** Bộ nhớ giả cho kiểm thử Node */
export function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
