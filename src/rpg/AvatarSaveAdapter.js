// ============================================================
//  AvatarSaveAdapter — lưu nhân vật:
//   - Bản nháp khi CHƯA có hồ sơ (màn hình tạo nhân vật): localStorage 'ctao.rpg.characterDraft'
//     → không bao giờ ghi đè hồ sơ đang có.
//   - Khi đã có hồ sơ: ghi vào profile.character (qua GameSession.updateCharacter → SaveSystem).
// ============================================================
import { sanitizeCharacter } from './AvatarCustomizationSystem.js';

export const DRAFT_KEY = 'ctao.rpg.characterDraft';
const store = (s) => s ?? (typeof localStorage !== 'undefined' ? localStorage : null);

export function loadDraft(storage) {
  try {
    const raw = JSON.parse(store(storage)?.getItem(DRAFT_KEY) || 'null');
    return raw ? sanitizeCharacter(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(character, storage) {
  try {
    store(storage)?.setItem(DRAFT_KEY, JSON.stringify(sanitizeCharacter(character)));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(storage) {
  try {
    store(storage)?.removeItem(DRAFT_KEY);
  } catch {
    /* bỏ qua */
  }
}
