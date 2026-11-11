// ============================================================
//  PPEManagementSystem (PPE Equipment System) — kho PPE, mặc/tháo, xung đột, PPE bắt buộc.
//  PHÂN BIỆT RÕ:
//   - PPE ĐƯỢC CÔNG NHẬN trong gameplay = đã được cấp (owned) + đang mặc (equipped) → recognizedPPE()
//   - Xem thử trong màn hình tạo nhân vật (preview) = chỉ hình ảnh, KHÔNG bao giờ được công nhận
//   - Màu/kiểu mũ, áo, giày (ppeStyle) và phụ kiện = chỉ ngoại hình
//   - Huấn luyện, quyền vào vùng, PTW là điều kiện RIÊNG, PPE không thay thế được
//  PPE bắt buộc KHÔNG thể tháo khi đang ở trong công trường (trừ khi món khác vẫn đáp ứng yêu cầu).
// ============================================================
import { DATA } from './data.js';
import { getRole } from './RoleManagementSystem.js';

export const ppeDef = (id) => DATA.ppeById[id] ?? null;

/** PPE bắt buộc của người chơi tại công trường: entry của site ∪ PPE theo nghề (id yêu cầu) */
export function requiredPPE(site, roleId) {
  return [...new Set([...(site?.entry?.ppe ?? []), ...(getRole(roleId)?.ppe ?? [])])];
}

/** Tập yêu cầu được đáp ứng bởi danh sách món (chỉ món PPE hợp lệ) */
export function satisfiedBy(items) {
  const out = new Set();
  for (const id of items) for (const s of ppeDef(id)?.satisfies ?? []) out.add(s);
  return out;
}

/** PPE được công nhận: chỉ món đã cấp VÀ đang mặc */
export function recognizedPPE(profile) {
  return [...satisfiedBy(profile.ppe.equipped.filter((id) => profile.ppe.owned.includes(id)))];
}

export const missingPPE = (profile, required) => {
  const ok = satisfiedBy(profile.ppe.equipped.filter((id) => profile.ppe.owned.includes(id)));
  return required.filter((id) => !ok.has(id));
};

/** Các món đang mặc sẽ bị tháo ra khi mặc `id` (cùng slot hoặc khai báo xung đột) */
export function conflictsWith(equipped, id) {
  const d = ppeDef(id);
  if (!d) return [];
  return equipped.filter((x) => {
    if (x === id) return false;
    const o = ppeDef(x);
    return o && (o.slot === d.slot || d.conflicts?.includes(x) || o.conflicts?.includes(id));
  });
}

/** Món kế tiếp để cấp cho 1 yêu cầu: ưu tiên món cùng id, rồi món cơ bản đáp ứng */
function itemFor(reqId) {
  if (ppeDef(reqId)?.satisfies.includes(reqId)) return reqId;
  return DATA.ppe.find((p) => p.satisfies.includes(reqId))?.id ?? null;
}

/** Cấp phát vào kho cá nhân (chưa mặc). Chấp nhận id món hoặc id yêu cầu. */
export function issuePPE(profile, items) {
  const add = items.map((x) => (ppeDef(x) ? x : itemFor(x))).filter(Boolean);
  return { ...profile, ppe: { ...profile.ppe, owned: [...new Set([...profile.ppe.owned, ...add])] } };
}

/**
 * Mặc 1 món. Tự tháo món xung đột. lockedRequired: yêu cầu bắt buộc phải luôn được đáp ứng (đang ở công trường).
 * Trả về { profile, removed:[], error? }
 */
export function equip(profile, id, lockedRequired = []) {
  if (!ppeDef(id)) return { profile, error: 'Trang bị không tồn tại' };
  if (!profile.ppe.owned.includes(id)) return { profile, error: `${ppeDef(id).label} chưa được cấp — chỉ có thể xem thử` };
  if (profile.ppe.equipped.includes(id)) return { profile, removed: [] };
  const removed = conflictsWith(profile.ppe.equipped, id);
  const next = [...profile.ppe.equipped.filter((x) => !removed.includes(x)), id];
  const lost = lockedRequired.filter((r) => !satisfiedBy(next.filter((x) => profile.ppe.owned.includes(x))).has(r));
  if (lost.length) return { profile, error: `Không thể thay: ${removed.map((x) => ppeDef(x).label).join(', ')} đang đáp ứng PPE bắt buộc` };
  return { profile: { ...profile, ppe: { ...profile.ppe, equipped: next } }, removed };
}

/** Tháo PPE. Bị chặn nếu làm mất một yêu cầu bắt buộc (khi đang ở công trường). */
export function unequip(profile, id, lockedRequired = []) {
  const next = profile.ppe.equipped.filter((x) => x !== id);
  const ok = satisfiedBy(next.filter((x) => profile.ppe.owned.includes(x)));
  const lost = lockedRequired.filter((r) => !ok.has(r));
  if (lost.length) return { profile, error: `Không thể tháo ${ppeDef(id)?.label ?? id}: bắt buộc khi ở trong công trường` };
  return { profile: { ...profile, ppe: { ...profile.ppe, equipped: next } } };
}

/** Cấp & mặc các YÊU CẦU còn thiếu (ki-ốt / kho) */
export function issueAndEquip(profile, required) {
  let p = profile;
  for (const req of missingPPE(p, required)) {
    const id = itemFor(req);
    if (!id) continue;
    p = issuePPE(p, [id]);
    p = equip(p, id).profile;
  }
  return p;
}

/** Kiểm tra danh sách đang mặc không có xung đột (dùng khi kiểm tra tính nhất quán hồ sơ) */
export function hasConflicts(equipped) {
  return equipped.some((id) => conflictsWith(equipped, id).length > 0);
}

// ---------------- quy định PPE theo dự án (cấu hình, không gán cứng theo nghề) ----------------
/** Màu mũ bắt buộc theo dự án (sites.json → ppePolicy.helmetColors byRole / byGroup). null = tự do */
export function helmetColorRule(site, roleId) {
  const pol = site?.ppePolicy?.helmetColors;
  if (!pol) return null;
  const r = getRole(roleId);
  return pol.byRole?.[roleId] ?? (r ? pol.byGroup?.[r.group] : null) ?? null;
}
