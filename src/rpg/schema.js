// ============================================================
//  Hồ sơ người chơi (schema 'ctao.rpg', có version + migration + kiểm tra nhất quán)
//  v2 (từ v0.4):
//  { schema, version, id, createdAt, updatedAt, playTime,
//    character: { name, code, appearance{…}, outfit{ id, top, bottom, logo{enabled,text} },
//                 ppeStyle{ helmetColor, helmetStyle, vestColor, bootsColor }, accessories:[] },
//    ppe: { owned:[], equipped:[] },          (PPE được công nhận = owned ∩ equipped)
//    career: { roleId, xp, roleXp:{ roleId: xp } },
//    currentSite, sites:{ [siteKey]: SiteProgress }, trainings:[], claimed:{}, flow:[],
//    tutorial: { seen:{}, controlsDone, history:[] },
//    settings: { cameraSpeed, mouseSensitivity, mouseLook, beginner, explore, characterRenderer, lightPreset, creatorQuality } }
//  v1 → v2: character.appearance phẳng (gồm outfit/helmet/boots/vest/face) được TÁCH thành appearance/outfit/
//  ppeStyle/accessories; tên, nghề, XP, công trường, nhiệm vụ, PPE giữ nguyên.
// ============================================================
import { DATA } from './data.js';
import { sanitizeCharacter, characterFromV1, defaultCharacter } from './AvatarCustomizationSystem.js';
import { hasConflicts } from './PPEManagementSystem.js';

export const RPG_SCHEMA = 'ctao.rpg';
export const RPG_VERSION = 2;

export const DEFAULT_SETTINGS = { cameraSpeed: 1, mouseSensitivity: 1, mouseLook: true, beginner: true, explore: false, characterRenderer: 'procedural-v2', lightPreset: 'industrial', creatorQuality: 'medium', graphicsQuality: 'medium' };

/** newProfile(character) — hoặc newProfile(name, appearanceV1) (API cũ) */
export function newProfile(nameOrCharacter, appearanceV1) {
  const now = new Date().toISOString();
  const basic = DATA.ppe.filter((p) => p.basic).map((p) => p.id);
  const character = typeof nameOrCharacter === 'object' && nameOrCharacter ? sanitizeCharacter(nameOrCharacter) : appearanceV1 && !appearanceV1.appearance ? characterFromV1(String(nameOrCharacter ?? ''), appearanceV1) : sanitizeCharacter({ ...(appearanceV1 ?? defaultCharacter()), name: nameOrCharacter });
  return {
    schema: RPG_SCHEMA,
    version: RPG_VERSION,
    id: `P-${Date.now().toString(36).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    playTime: 0,
    character,
    ppe: { owned: basic, equipped: basic },
    career: { roleId: null, xp: 0, roleXp: {} },
    currentSite: null,
    sites: {},
    trainings: [],
    claimed: {},
    tutorial: { seen: {}, controlsDone: false, history: [] },
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function emptySiteProgress() {
  return { joined: null, onboarding: { index: 0, done: {} }, trainings: [], permits: [], task: { current: null, seq: 0, done: 0 }, pos: null, delta: {}, ppeChecked: false };
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

export function validateProfile(p) {
  const e = [];
  if (!p || p.schema !== RPG_SCHEMA) return ['Không phải hồ sơ người chơi'];
  if (p.version !== RPG_VERSION) e.push(`Phiên bản hồ sơ ${p.version} khác ${RPG_VERSION}`);
  if (!p.character?.name?.trim()) e.push('Thiếu tên nhân vật');
  if (p.character?.name?.length > 24) e.push('Tên nhân vật quá 24 ký tự');
  if (JSON.stringify(sanitizeCharacter(p.character)) !== JSON.stringify(p.character)) e.push('Cấu hình nhân vật có giá trị không hợp lệ');
  for (const id of p.ppe?.owned ?? []) if (!DATA.ppeById[id]) e.push(`PPE lạ: ${id}`);
  for (const id of p.ppe?.equipped ?? []) if (!p.ppe.owned.includes(id)) e.push(`Đang mặc PPE chưa được cấp: ${id}`);
  if (hasConflicts(p.ppe?.equipped ?? [])) e.push('Đang mặc các PPE xung đột nhau');
  if (p.career?.roleId != null && !DATA.roleById[p.career.roleId]) e.push(`Nghề không tồn tại: ${p.career.roleId}`);
  if (!finite(p.career?.xp) || p.career.xp < 0) e.push('XP không hợp lệ');
  for (const [k, v] of Object.entries(p.career?.roleXp ?? {})) if (!DATA.roleById[k] || !finite(v) || v < 0) e.push(`XP nghề ${k} không hợp lệ`);
  if (!finite(p.playTime) || p.playTime < 0) e.push('Thời gian chơi không hợp lệ');
  for (const [k, s] of Object.entries(p.sites ?? {})) {
    if (s.joined && !DATA.roleById[s.joined.roleId]) e.push(`${k}: vị trí đăng ký không tồn tại`);
    if (!finite(s.onboarding?.index)) e.push(`${k}: tiến trình nhập môn hỏng`);
  }
  return e;
}

/** Sửa lỗi có thể sửa (dữ liệu cũ / hỏng nhẹ) — KHÔNG đụng tới tên, nghề, XP, tiến trình hợp lệ */
export function repairProfile(p0) {
  const fixes = [];
  const p = { ...newProfile(p0.character ?? { name: 'Kỹ sư mới' }), ...p0 };
  const name = String(p0.character?.name || 'Kỹ sư mới').trim().slice(0, 24);
  p.character = sanitizeCharacter({ ...(p0.character ?? {}), name });
  if (JSON.stringify(p.character) !== JSON.stringify(p0.character)) fixes.push('Chuẩn hoá cấu hình nhân vật');
  const owned = (p0.ppe?.owned ?? []).filter((id) => DATA.ppeById[id]);
  const basic = DATA.ppe.filter((x) => x.basic).map((x) => x.id);
  p.ppe = { owned: [...new Set([...basic, ...owned])], equipped: (p0.ppe?.equipped ?? basic).filter((id) => DATA.ppeById[id]) };
  p.ppe.equipped = p.ppe.equipped.filter((id) => p.ppe.owned.includes(id));
  // bỏ món xung đột (giữ món mặc trước)
  const keep = [];
  for (const id of p.ppe.equipped) if (!hasConflicts([...keep, id])) keep.push(id);
  if (keep.length !== p.ppe.equipped.length) fixes.push('Tháo PPE xung đột');
  p.ppe.equipped = keep;
  const roleXp = Object.fromEntries(Object.entries(p0.career?.roleXp ?? {}).filter(([k, v]) => DATA.roleById[k] && finite(v) && v >= 0));
  p.career = { roleId: DATA.roleById[p0.career?.roleId] ? p0.career.roleId : null, xp: finite(p0.career?.xp) ? Math.max(0, p0.career.xp) : 0, roleXp };
  if (p0.career?.roleId && !p.career.roleId) fixes.push('Bỏ nghề không còn tồn tại');
  p.playTime = finite(p0.playTime) ? Math.max(0, p0.playTime) : 0;
  p.settings = { ...DEFAULT_SETTINGS, ...(p0.settings ?? {}) };
  if (!DATA.characterAssetById[p.settings.characterRenderer]) p.settings.characterRenderer = DEFAULT_SETTINGS.characterRenderer;
  p.tutorial = { seen: {}, controlsDone: false, history: [], ...(p0.tutorial ?? {}) };
  p.sites = {};
  for (const [k, s] of Object.entries(p0.sites ?? {})) {
    const base = emptySiteProgress();
    const fixed = { ...base, ...s, onboarding: { ...base.onboarding, ...(s.onboarding ?? {}) }, task: { ...base.task, ...(s.task ?? {}) } };
    if (fixed.joined && !DATA.roleById[fixed.joined.roleId]) {
      fixed.joined = null;
      fixes.push(`${k}: huỷ đăng ký vị trí không còn tồn tại`);
    }
    if (!finite(fixed.onboarding.index)) fixed.onboarding.index = 0;
    p.sites[k] = fixed;
  }
  p.schema = RPG_SCHEMA;
  p.version = RPG_VERSION;
  return { profile: p, fixes };
}

/** Migration: MIGRATIONS[v] chuyển v → v+1 */
const MIGRATIONS = {
  // v0 (bản nháp): { name, look:{…}, role, xp } phẳng
  0: (raw) => ({
    schema: RPG_SCHEMA,
    version: 1,
    character: { name: raw.name ?? raw.character?.name, appearance: raw.look ?? raw.character?.appearance },
    career: { roleId: raw.role ?? null, xp: raw.xp ?? 0, roleXp: raw.role ? { [raw.role]: raw.xp ?? 0 } : {} },
    sites: {},
  }),
  // v1 (v0.3): character.appearance phẳng → tách appearance / outfit / ppeStyle / accessories
  1: (raw) => {
    const a = raw.character?.appearance ?? {};
    const character = characterFromV1(raw.character?.name ?? '', a);
    let ppe = raw.ppe ? { owned: [...(raw.ppe.owned ?? [])], equipped: [...(raw.ppe.equipped ?? [])] } : undefined;
    // ủng cao su v1 là kiểu giày → nay là món PPE "Ủng bảo hộ" (vẫn đáp ứng yêu cầu giày bảo hộ)
    if (a.boots === 'rubber' && ppe) {
      ppe = { owned: [...new Set([...ppe.owned, 'rubber-boots'])], equipped: ppe.equipped.map((x) => (x === 'boots' ? 'rubber-boots' : x)) };
    }
    return { ...raw, version: 2, character, ...(ppe ? { ppe } : {}) };
  },
};

export function migrateProfile(raw) {
  if (!raw || (raw.schema && raw.schema !== RPG_SCHEMA)) return { errors: ['Không phải hồ sơ người chơi'] };
  let r = raw;
  let v = Number(r.version ?? 0);
  const fixes = [];
  if (v > RPG_VERSION) return { errors: [`Hồ sơ tạo bởi phiên bản mới hơn (v${v})`] };
  while (v < RPG_VERSION) {
    r = MIGRATIONS[v](r);
    fixes.push(`Nâng cấp hồ sơ v${v} → v${v + 1}`);
    v++;
  }
  const rep = repairProfile(r);
  const errors = validateProfile(rep.profile);
  return { profile: rep.profile, fixes: [...fixes, ...rep.fixes], errors };
}
