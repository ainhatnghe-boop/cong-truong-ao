// ============================================================
//  useCharacterEditor — trạng thái chỉnh nhân vật dùng chung cho màn hình tạo nhân vật & tủ đồ trong game.
//  mode: 'new'   — chưa có hồ sơ: bản nháp tự lưu (AvatarSaveAdapter), PPE cơ bản coi như đã cấp
//        'edit'  — đã có hồ sơ, ngoài công trường: tự lưu vào hồ sơ (session.updateCharacter)
//        'world' — đang ở công trường (menu ESC): như 'edit' + KHÔNG tháo được PPE bắt buộc
//  PPE: món đã cấp → mặc/tháo thật (gameplay); món chưa cấp → chỉ XEM THỬ (không bao giờ được công nhận).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { session } from '../session.js';
import { DATA } from '../../rpg/data.js';
import { defaultCharacter, sanitizeCharacter } from '../../rpg/AvatarCustomizationSystem.js';
import { loadDraft, saveDraft } from '../../rpg/AvatarSaveAdapter.js';
import { conflictsWith, unequip as unequipFn, helmetColorRule } from '../../rpg/PPEManagementSystem.js';
import { getAsset } from '../../rpg/CharacterAssetRegistry.js';
import { lockedFields } from '../../rpg/AppearanceSystem.js';

const PREFS_KEY = 'ctao.rpg.creatorPrefs';
const BASIC = DATA.ppe.filter((p) => p.basic).map((p) => p.id);
export const DEV = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev');

function readPrefs() {
  const s = session.profile?.settings;
  let local = {};
  try {
    local = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') ?? {};
  } catch {
    /* bỏ qua */
  }
  return {
    rendererId: getAsset(s?.characterRenderer ?? local.rendererId).id,
    preset: s?.lightPreset ?? local.preset ?? 'industrial',
    quality: s?.creatorQuality ?? local.quality ?? 'medium',
  };
}

/** Thêm `id` vào danh sách, bỏ các món xung đột */
const wearInto = (list, id) => [...list.filter((x) => !conflictsWith(list, id).includes(x)), id];

export function useCharacterEditor(mode = 'new') {
  const hasProfile = mode !== 'new' && !!session.profile;
  const [character, setCharacterState] = useState(() => (hasProfile ? sanitizeCharacter(session.profile.character) : loadDraft() ?? defaultCharacter('male')));
  const [localEquip, setLocalEquip] = useState(BASIC);
  const [preview, setPreview] = useState([]);
  const [prefs, setPrefsState] = useState(readPrefs);
  const [savedAt, setSavedAt] = useState(null);
  const [assetStatus, setAssetStatus] = useState(null);
  const timer = useRef(null);
  const pending = useRef(null);

  // ---------- tự lưu (debounce) ----------
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const c = pending.current;
    pending.current = null;
    if (!c) return;
    if (hasProfile) session.updateCharacter(c);
    else saveDraft(c);
    setSavedAt(Date.now());
  }, [hasProfile]);
  useEffect(() => () => flush(), [flush]);

  const setCharacter = useCallback(
    (next) => {
      setCharacterState((prev) => {
        const raw = typeof next === 'function' ? next(prev) : next;
        // giữ nguyên tên đang gõ (khoảng trắng cuối) — khi lưu sẽ được chuẩn hoá
        const c = { ...sanitizeCharacter(raw), name: String(raw?.name ?? '').slice(0, 24) };
        pending.current = c;
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 350);
        return c;
      });
    },
    [flush],
  );
  const patch = useCallback((key, value) => setCharacter((c) => ({ ...c, [key]: typeof value === 'function' ? value(c[key]) : value })), [setCharacter]);

  // ---------- tuỳ chọn hiển thị ----------
  const setPref = useCallback((k, v) => {
    setPrefsState((p) => {
      const n = { ...p, [k]: v };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(n));
      } catch {
        /* bỏ qua */
      }
      if (session.profile) session.setSettings({ characterRenderer: n.rendererId, lightPreset: n.preset, creatorQuality: n.quality });
      return n;
    });
    if (k === 'rendererId') setAssetStatus(null);
  }, []);

  // ---------- PPE ----------
  const profile = hasProfile ? session.profile : null;
  const owned = profile ? profile.ppe.owned : BASIC;
  const equippedOwn = profile ? profile.ppe.equipped.filter((id) => profile.ppe.owned.includes(id)) : localEquip;
  const required = mode === 'world' && session.world ? session.requiredPPE() : [];
  const wearing = useMemo(() => preview.reduce((list, id) => wearInto(list, id), equippedOwn), [equippedOwn, preview]);
  const hiddenByPreview = equippedOwn.filter((id) => !wearing.includes(id));

  const lockReason = (id) => {
    if (!profile || !required.length || !equippedOwn.includes(id)) return null;
    return unequipFn(profile, id, required).error ?? null;
  };

  const togglePPE = (id) => {
    const isOwned = owned.includes(id);
    const on = wearing.includes(id);
    if (!isOwned) {
      setPreview((p) => (p.includes(id) ? p.filter((x) => x !== id) : wearInto(p, id)));
      return;
    }
    setPreview((p) => p.filter((x) => x !== id && !conflictsWith([id], x).length && !conflictsWith([x], id).length));
    if (on) {
      if (profile) session.unequip(id);
      else setLocalEquip((l) => l.filter((x) => x !== id));
    } else if (profile) session.equip(id);
    else setLocalEquip((l) => wearInto(l, id));
  };
  const clearPreview = () => setPreview([]);

  // ---------- bộ dựng & khoá tuỳ chọn ----------
  const asset = getAsset(prefs.rendererId);
  const caps = asset.capabilities;
  const locked = useMemo(() => lockedFields(caps), [caps]);
  const helmetRule = mode === 'world' && session.world ? helmetColorRule(session.world.site, session.roleId) : null;

  const reset = () => {
    setCharacter((c) => ({ ...defaultCharacter(c.appearance.bodyFrame, c.name), code: c.code }));
    setPreview([]);
    setLocalEquip(BASIC);
  };

  return {
    mode,
    character,
    setCharacter,
    patch,
    flush,
    savedAt,
    prefs,
    setPref,
    asset,
    caps,
    locked,
    assetStatus,
    setAssetStatus,
    ppe: { owned, equippedOwn, preview, wearing, hiddenByPreview, required, toggle: togglePPE, clearPreview, lockReason },
    helmetRule,
    reset,
  };
}
