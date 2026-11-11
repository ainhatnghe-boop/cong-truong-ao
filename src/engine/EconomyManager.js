// ============================================================
//  EconomyManager — cấp độ, thưởng, định dạng tiền. Đơn vị tiền: triệu đồng (tr).
//  Số liệu gameplay, không phải dự toán thực tế.
// ============================================================
export const levelOf = (xp) => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 150));
export const xpForLevel = (lv) => 150 * (lv - 1) ** 2;

/** Thanh toán theo đợt: xong mỗi hoạt động được trả chi phí vật tư của hoạt động × (1 + lợi nhuận);
 *  bàn giao cả đối tượng được thêm thưởng hoàn thành. */
export const PROFIT = 0.3;
export const actPayment = (act) => Math.round(act.cost * (1 + PROFIT));
export const completionBonus = (geo) => Math.round(geo.totals.cost * 0.05 + 20);
export const completionXp = (geo) => Math.round(20 + Math.sqrt(geo.totals.cost) * 2);

export function fmtMoney(tr) {
  if (!Number.isFinite(tr)) return '—';
  const a = Math.abs(tr);
  if (a >= 1000) return `${(tr / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  return `${tr.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
}

export const fmtDays = (d) => (Number.isFinite(d) ? `${Math.ceil(d).toLocaleString('vi-VN')} ngày` : '—');
