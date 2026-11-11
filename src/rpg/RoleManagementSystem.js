// ============================================================
//  RoleManagementSystem — nghề nghiệp (data-driven), XP theo nghề, đổi nghề, kiểm tra năng lực, quyền truy cập.
//  Đổi nghề KHÔNG xoá nhân vật, KHÔNG xoá XP (XP tổng và XP từng nghề được giữ).
// ============================================================
import { DATA } from './data.js';

export const levelOf = (xp) => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 100));
export const xpForLevel = (lv) => 100 * (lv - 1) ** 2;

export const getRole = (id) => DATA.roleById[id] ?? null;
export const rolesByGroup = () => DATA.roleGroups.map((g) => ({ ...g, roles: DATA.roles.filter((r) => r.group === g.id) }));

/** Kiểm tra năng lực: cấp nhân vật ≥ minLevel. Không đạt → chỉ được vào chế độ thực tập */
export function competency(profile, roleId) {
  const r = getRole(roleId);
  if (!r) return { ok: false, reason: 'Nghề không tồn tại' };
  const lv = levelOf(profile.career.xp);
  if (lv < (r.minLevel ?? 1)) return { ok: false, intern: true, reason: `Cần cấp ${r.minLevel} (hiện cấp ${lv}) — có thể tham gia ở chế độ thực tập` };
  return { ok: true };
}

/** Chọn / đổi nghề. Trả về hồ sơ mới. */
export function chooseRole(profile, roleId) {
  if (!getRole(roleId)) return { profile, error: 'Nghề không tồn tại' };
  const roleXp = { ...profile.career.roleXp };
  if (roleXp[roleId] == null) roleXp[roleId] = 0;
  return { profile: { ...profile, career: { ...profile.career, roleId, roleXp } } };
}

export function addXp(profile, amount, roleId = profile.career.roleId) {
  if (!amount) return profile;
  const roleXp = { ...profile.career.roleXp };
  if (roleId) roleXp[roleId] = (roleXp[roleId] ?? 0) + amount;
  return { ...profile, career: { ...profile.career, xp: profile.career.xp + amount, roleXp } };
}

/**
 * Quyền truy cập vùng theo nghề: zone.roles (ai được phép) + role.access (loại & mức vùng nghề được vào).
 * mode 'intern' chỉ vào được vùng hạn chế (restricted).
 */
export function roleAllowedInZone(roleId, zone, mode = 'member') {
  const r = getRole(roleId);
  if (!r) return false;
  if (zone.level === 'safe') return true;
  if (zone.level === 'forbidden') return false;
  const roleOk = (zone.roles ?? ['*']).some((x) => x === '*' || x === r.id || x === r.group);
  const kindOk = r.access.zones.includes('*') || r.access.zones.includes(zone.kind);
  const levelOk = r.access.levels.includes(zone.level) && (mode !== 'intern' || zone.level === 'restricted');
  return roleOk && kindOk && levelOk;
}

export const canEditConstruction = (roleId, mode) => !!getRole(roleId)?.access.edit && mode !== 'intern';
export const canApprovePermit = (roleId, type, mode) => mode !== 'intern' && !!getRole(roleId)?.access.approve.includes(type);
