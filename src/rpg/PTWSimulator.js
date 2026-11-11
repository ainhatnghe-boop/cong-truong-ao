// ============================================================
//  PTWSimulator — giấy phép làm việc MÔ PHỎNG (học tập/gameplay), KHÔNG phải hệ thống cấp phép thực.
//  Người chơi phải chọn đúng tất cả điều kiện an toàn (và không chọn điều kiện sai) mới được cấp.
//  Người xác nhận: chính người chơi nếu nghề có quyền approve, nếu không là NPC HSE (ghi rõ "mô phỏng").
//  Thời hạn tính theo thời gian chơi (profile.playTime, giây).
// ============================================================
import { DATA } from './data.js';
import { canApprovePermit } from './RoleManagementSystem.js';

export const permitType = (id) => DATA.permitById[id] ?? null;

/** Chấm phiếu: selected = tập chỉ số điều kiện người chơi đánh dấu */
export function gradePermit(typeId, selected) {
  const t = permitType(typeId);
  if (!t) return { ok: false, wrong: ['Loại giấy phép không tồn tại'] };
  const wrong = [];
  t.conditions.forEach((c, i) => {
    const on = selected.includes(i);
    if (c.correct && !on) wrong.push(`Thiếu: ${c.text}`);
    if (!c.correct && on) wrong.push(`Không được chấp nhận: ${c.text}`);
  });
  return { ok: wrong.length === 0, wrong };
}

export function issuePermit(siteProgress, { typeId, zoneId = null, roleId, mode, playTime, seq }) {
  const t = permitType(typeId);
  const self = canApprovePermit(roleId, typeId, mode);
  const permit = {
    id: `PTW-${String(seq).padStart(3, '0')}`,
    type: typeId,
    zoneId,
    issuedAt: playTime,
    expiresAt: playTime + t.validityMin * 60,
    status: 'active',
    approvedBy: self ? 'Tự xác nhận theo thẩm quyền nghề (mô phỏng)' : 'NPC HSE (mô phỏng)',
  };
  return { ...siteProgress, permits: [...siteProgress.permits.filter((p) => !(p.type === typeId && p.status === 'active')), permit] };
}

export function activePermit(siteProgress, typeId, playTime) {
  return (siteProgress?.permits ?? []).find((p) => p.type === typeId && p.status === 'active' && p.expiresAt > playTime) ?? null;
}

/** Đánh dấu giấy phép hết hạn */
export function expirePermits(siteProgress, playTime) {
  let changed = false;
  const permits = siteProgress.permits.map((p) => {
    if (p.status === 'active' && p.expiresAt <= playTime) {
      changed = true;
      return { ...p, status: 'expired' };
    }
    return p;
  });
  return changed ? { ...siteProgress, permits } : siteProgress;
}
