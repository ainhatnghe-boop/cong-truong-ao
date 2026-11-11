// ============================================================
//  ConstructionSimulationEngine — engine thi công CHUNG cho mọi loại đối tượng.
//  Mỗi đối tượng có các hoạt động (plan) do ParametricGeometryEngine tính từ cấu kiện:
//    work (tổ-ngày), cost (vật tư), skill. Hoạt động thực hiện TUẦN TỰ trong một đối tượng.
//  Mỗi ngày mô phỏng (tick):
//    1. Lấy các hoạt động đang mở của đối tượng đã khởi công (theo thứ tự ưu tiên khởi công)
//    2. Phân bổ tổ đội theo kỹ năng (tối đa MAX_CREWS_PER_ACT tổ / hoạt động)
//    3. Năng suất = số tổ × hệ số máy trong phạm vi (thiếu cẩu cho cấu kiện cao → giảm mạnh)
//    4. Ghi nhận chi phí vật tư theo % khối lượng + lương tổ đội + chi phí máy
//    5. Xong hoạt động → thanh toán đợt; bàn giao đối tượng → thưởng + XP; kiểm tra nhiệm vụ
//  Hàm thuần: tick(doc, sim) → sim mới. Không phụ thuộc UI.
// ============================================================
import { build, actTopY } from './ParametricGeometryEngine.js';
import { getType, isBuildable } from './ObjectRegistry.js';
import { worldMap } from './PlacementSystem.js';
import { equipmentOnSite, equipmentFactor, LIFT_HEIGHT, dailyWages, hireCrew } from './ResourceManager.js';
import { actPayment, completionBonus, completionXp, levelOf } from './EconomyManager.js';
import { checkMissions } from './MissionManager.js';
import { SKILLS } from './materials.js';

const MAX_CREWS_PER_ACT = 4;

const log = (s, text, tone) => ({ ...s, log: [{ day: s.day, text, tone }, ...s.log].slice(0, 80) });

/** Trạng thái thi công của 1 đối tượng: { status, k (hoạt động hiện tại), frac[] , overall } */
export function progressOf(node, st) {
  const geo = build(node);
  if (!geo) return null;
  const done = st?.done ?? [];
  const frac = geo.plan.map((a, k) => Math.min(1, (done[k] ?? 0) / a.work));
  const overall = geo.totals.work ? geo.plan.reduce((s, a, k) => s + a.work * frac[k], 0) / geo.totals.work : 0;
  const k = frac.findIndex((f) => f < 1);
  const status = st?.complete ? 'done' : st?.started ? 'active' : 'planned';
  return { geo, frac, overall, k: k < 0 ? geo.plan.length : k, status };
}

export function startNodes(doc, sim, ids) {
  let order = Math.max(0, ...Object.values(sim.nodes).map((s) => s.order ?? 0)) + 1;
  const nodes = { ...sim.nodes };
  let n = 0;
  for (const id of ids) {
    const node = doc.nodes[id];
    if (!node || !isBuildable(node.type) || nodes[id]?.started) continue;
    nodes[id] = { ...(nodes[id] ?? {}), started: true, order: order++, done: nodes[id]?.done ?? [], spent: nodes[id]?.spent ?? 0, startedDay: sim.day };
    n++;
  }
  return n ? log({ ...sim, nodes }, `Khởi công ${n} đối tượng`) : sim;
}

/** Chế độ Đơn giản: thiếu tổ cho kỹ năng nào đang cần thì tự tuyển 1 tổ (nếu đủ tiền) */
export function autoHire(doc, sim) {
  const need = new Set();
  for (const [id, st] of Object.entries(sim.nodes)) {
    if (!st.started || st.complete || !doc.nodes[id]) continue;
    const pr = progressOf(doc.nodes[id], st);
    const act = pr?.geo.plan[pr.k];
    if (act) need.add(act.skill);
  }
  let s = sim;
  for (const k of need) if (!s.crews[k]) s = hireCrew(s, k, 1).sim;
  return s;
}

export function tick(doc, sim0) {
  let sim = { ...sim0, day: sim0.day + 1, nodes: { ...sim0.nodes } };
  const worlds = worldMap(doc);
  const eqs = equipmentOnSite(doc, worlds);
  // chi phí huy động máy (một lần) & chi phí ngày
  let cost = dailyWages(sim);
  for (const e of eqs) {
    const st = sim.nodes[e.node.id];
    if (!st?.mobilized) {
      cost += e.spec.mobilize;
      sim.nodes[e.node.id] = { ...(st ?? {}), mobilized: true };
      sim = log(sim, `Huy động ${e.node.name} (−${e.spec.mobilize} tr)`);
    }
    cost += e.spec.daily;
  }
  // hoạt động đang mở
  const active = [];
  for (const [id, st] of Object.entries(sim.nodes)) {
    const node = doc.nodes[id];
    if (!node || !st.started || st.complete || node.hidden) continue;
    const pr = progressOf(node, st);
    if (!pr) continue;
    const act = pr.geo.plan[pr.k];
    if (!act) continue;
    const w = worlds[id];
    const needsLift = actTopY(pr.geo, pr.k) > LIFT_HEIGHT; // chiều cao cấu kiện so với chân công trình
    const eq = equipmentFactor(eqs, w.p, act.skill, needsLift);
    active.push({ id, node, st, pr, act, eq });
  }
  active.sort((a, b) => (a.st.order ?? 0) - (b.st.order ?? 0));
  const avail = { ...sim.crews };
  const assign = {};
  for (const a of active) {
    const remain = a.act.work - (a.st.done[a.pr.k] ?? 0);
    const want = Math.min(MAX_CREWS_PER_ACT, Math.max(1, Math.ceil(remain / 12)));
    const give = Math.min(want, avail[a.act.skill] ?? 0);
    avail[a.act.skill] -= give;
    assign[a.id] = { skill: a.act.skill, crews: give, k: a.pr.k, factor: a.eq.factor, liftMissing: a.eq.liftMissing, equipment: a.eq.used };
    if (!give) continue;
    const done = [...a.st.done];
    const before = done[a.pr.k] ?? 0;
    const after = Math.min(a.act.work, before + give * a.eq.factor);
    done[a.pr.k] = after;
    const matCost = (a.act.cost * (after - before)) / a.act.work;
    cost += matCost;
    let st = { ...a.st, done, spent: (a.st.spent ?? 0) + matCost };
    if (after >= a.act.work - 1e-6) {
      const pay0 = actPayment(a.act);
      sim = log({ ...sim, money: sim.money + pay0 }, `${a.node.name}: nghiệm thu “${a.act.label}”, thanh toán +${pay0} tr`);
      if (a.pr.k === a.pr.geo.plan.length - 1) {
        const pay = completionBonus(a.pr.geo);
        const xp = completionXp(a.pr.geo);
        const lv0 = levelOf(sim.xp);
        st = { ...st, complete: true, completedDay: sim.day };
        sim = log({ ...sim, money: sim.money + pay, xp: sim.xp + xp }, `✔ Bàn giao ${a.node.name}: thưởng +${pay} tr, +${xp} XP`, 'ok');
        if (levelOf(sim.xp) > lv0) sim = log(sim, `▲ Lên cấp ${levelOf(sim.xp)} — mở khoá thêm hạng mục & máy móc`, 'ok');
      }
    }
    sim.nodes[a.id] = st;
  }
  // nhắc khi thiếu tổ đội / thiếu cẩu (mỗi 10 ngày một lần để không làm ngập nhật ký)
  if (sim.day % 10 === 0) {
    const missing = [...new Set(active.filter((a) => !assign[a.id].crews).map((a) => SKILLS[a.act.skill].label))];
    if (missing.length) sim = log(sim, `Thiếu tổ đội: ${missing.join(', ')}`, 'warn');
    const lift = active.filter((a) => assign[a.id].liftMissing).map((a) => a.node.name);
    if (lift.length) sim = log(sim, `Cấu kiện cao > ${LIFT_HEIGHT} m chưa có cẩu trong phạm vi: ${lift.join(', ')}`, 'warn');
  }
  sim = { ...sim, money: sim.money - cost, assign, lastCost: cost };
  if (sim.money < 0) sim = log({ ...sim, running: false }, 'Hết tiền: tạm dừng thi công. Cho nghỉ bớt tổ đội hoặc giải phóng máy.', 'bad');
  return checkMissions(doc, sim);
}

/** Ước tính thời gian (ngày) với số tổ hiện có, bỏ qua tranh chấp tổ đội — để hiển thị */
export function estimateDays(node, crews = 1) {
  const geo = build(node);
  if (!geo) return 0;
  return geo.plan.reduce((s, a) => s + a.work / Math.max(1, Math.min(MAX_CREWS_PER_ACT, crews)), 0);
}

export const isTyped = (node) => !!getType(node.type);
