// ============================================================
//  ResourceManager — tổ đội (theo kỹ năng) và máy móc (đối tượng eq.* đặt trên công trường).
//  Máy KHÔNG gắn cứng với công trình: máy tác động lên mọi hoạt động nằm trong bán kính `range`
//  và có kỹ năng nằm trong `boost`. Máy có `lift` (cẩu) cần cho cấu kiện cao > LIFT_HEIGHT.
// ============================================================
import { SKILLS } from './materials.js';
import { getType } from './ObjectRegistry.js';

export const LIFT_HEIGHT = 12; // m — cao hơn mức này cần cẩu trong phạm vi
export const NO_LIFT_FACTOR = 0.35;

export function hireCrew(sim, skill, n = 1) {
  const S = SKILLS[skill];
  if (!S) return { sim, error: 'Kỹ năng không tồn tại' };
  const fee = S.hire * n;
  if (sim.money < fee) return { sim, error: `Không đủ tiền tuyển (cần ${fee} tr)` };
  return {
    sim: { ...sim, money: sim.money - fee, crews: { ...sim.crews, [skill]: sim.crews[skill] + n }, log: [{ day: sim.day, text: `Tuyển ${n} tổ ${S.label} (−${fee} tr)` }, ...sim.log].slice(0, 80) },
  };
}

export function releaseCrew(sim, skill, n = 1) {
  if (!SKILLS[skill] || sim.crews[skill] < n) return { sim, error: 'Không còn tổ để cho nghỉ' };
  return { sim: { ...sim, crews: { ...sim.crews, [skill]: sim.crews[skill] - n }, log: [{ day: sim.day, text: `Cho nghỉ ${n} tổ ${SKILLS[skill].label}` }, ...sim.log].slice(0, 80) } };
}

/** Danh sách máy đang có trên công trường kèm vị trí thế giới */
export function equipmentOnSite(doc, worlds) {
  return Object.values(doc.nodes)
    .filter((n) => getType(n.type)?.equip && !n.hidden)
    .map((n) => ({ node: n, spec: getType(n.type).equip, p: worlds[n.id].p }));
}

/** Hệ số năng suất của máy cho 1 hoạt động tại vị trí pos */
export function equipmentFactor(eqs, pos, skill, needsLift) {
  let f = 1;
  let lift = false;
  const used = [];
  for (const e of eqs) {
    const d = Math.hypot(e.p[0] - pos[0], e.p[2] - pos[2]);
    if (d > e.spec.range) continue;
    if (e.spec.boost[skill]) {
      f += e.spec.boost[skill];
      used.push(e.node.id);
    }
    if (e.spec.lift) lift = true;
  }
  if (needsLift && !lift) f *= NO_LIFT_FACTOR;
  return { factor: f, used, liftMissing: needsLift && !lift };
}

export const dailyWages = (sim) => Object.entries(sim.crews).reduce((s, [k, n]) => s + n * (SKILLS[k]?.wage ?? 0), 0);
