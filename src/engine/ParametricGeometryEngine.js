// ============================================================
//  ParametricGeometryEngine — từ (type, params) sinh ra:
//    parts   : danh sách cấu kiện hình học (cục bộ)
//    plan    : các hoạt động thi công kèm khối lượng, chi phí vật tư, công (tổ-ngày), chỉ số cấu kiện
//    bbox    : hộp bao cục bộ (dùng cho bắt dính, khung chọn, cắt cao độ)
//  Engine CHUNG cho mọi loại công trình: không có logic riêng theo loại ở đây.
//  Kết quả được cache theo đối tượng params (bất biến) → sửa tham số = tính lại.
// ============================================================
import { getType } from './ObjectRegistry.js';
import { MATERIALS } from './materials.js';

const cache = new WeakMap();

export function partVolume(pt) {
  const [a, b, c] = pt.s;
  if (pt.g === 'b') return a * b * c;
  if (pt.g === 'c') return (Math.PI / 4) * a * a * b;
  return (Math.PI / 12) * a * a * b; // nón
}

/** Bán kính bao theo phương ngang của một part (có xét xoay) — xấp xỉ bảo thủ */
function partExtent(pt) {
  const [sx, sy, sz] = pt.s;
  if (!pt.r) return [sx / 2, sy / 2, sz / 2];
  const m = Math.hypot(sx, sy, sz) / 2;
  return [pt.r[2] || pt.r[1] ? m : sx / 2, m, pt.r[0] || pt.r[1] ? m : sz / 2];
}

export function build(node) {
  const t = getType(node.type);
  if (!t?.gen) return null;
  const hit = cache.get(node.params);
  if (hit && hit.type === node.type) return hit;
  const { parts, acts } = t.gen(node.params);
  // sắp xếp ổn định: theo hoạt động, rồi đáy từ thấp lên cao (thứ tự hiện ra khi thi công)
  const order = parts.map((p, i) => i);
  order.sort((i, j) => parts[i].a - parts[j].a || parts[i].p[1] - parts[i].s[1] / 2 - (parts[j].p[1] - parts[j].s[1] / 2) || i - j);
  const sorted = order.map((i) => parts[i]);
  const plan = acts.map((a, k) => ({ ...a, idx: [], volume: 0, cost: 0, work: 0 }));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  sorted.forEach((pt, i) => {
    const act = plan[pt.a];
    const mat = MATERIALS[pt.m];
    const v = partVolume(pt);
    if (act) {
      act.idx.push(i);
      act.volume += v;
      act.cost += v * (mat?.price ?? 0);
      act.work += v * (mat?.labor ?? 0);
    }
    const e = partExtent(pt);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pt.p[k] - e[k]);
      max[k] = Math.max(max[k], pt.p[k] + e[k]);
    }
  });
  for (const a of plan) a.work = Math.max(0.5, a.work);
  const res = {
    type: node.type,
    parts: sorted,
    plan,
    bbox: { min, max },
    totals: {
      cost: plan.reduce((s, a) => s + a.cost, 0),
      work: plan.reduce((s, a) => s + a.work, 0),
      volume: plan.reduce((s, a) => s + a.volume, 0),
      parts: sorted.length,
    },
  };
  cache.set(node.params, res);
  return res;
}

/** Hộp bao cục bộ cho mọi đối tượng (kể cả thiết bị không có generator) */
export function localBox(node) {
  const t = getType(node.type);
  if (t?.equip) {
    const [w, d] = t.equip.footprint;
    return { min: [-w / 2, 0, -d / 2], max: [w / 2, 3, d / 2] };
  }
  return build(node)?.bbox ?? null;
}

/** Chiều cao lớn nhất của cấu kiện thuộc một hoạt động (để biết có cần cẩu) */
export function actTopY(geo, k) {
  let top = 0;
  for (const i of geo.plan[k]?.idx ?? []) {
    const pt = geo.parts[i];
    top = Math.max(top, pt.p[1] + pt.s[1] / 2);
  }
  return top;
}
