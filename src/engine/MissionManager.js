// ============================================================
//  MissionManager — nhiệm vụ dùng điều kiện CHUNG trên dữ liệu (không gắn với 1 loại dự án).
//  check(ctx) với ctx = { doc, sim, nodes, completed:[node], level }
// ============================================================
import { getType } from './ObjectRegistry.js';
import { levelOf } from './EconomyManager.js';

export const MISSIONS = [
  { id: 'M01', title: 'Đặt công trình đầu tiên lên công trường', reward: { xp: 20 }, check: (c) => c.nodes.some((n) => getType(n.type)?.gen) },
  { id: 'M02', title: 'Tuyển tổ đội đầu tiên', reward: { xp: 20 }, check: (c) => Object.values(c.sim.crews).some((v) => v > 0) },
  { id: 'M03', title: 'Điều động một máy nâng (cẩu) tới công trường', reward: { xp: 30 }, check: (c) => c.nodes.some((n) => getType(n.type)?.equip?.lift) },
  { id: 'M04', title: 'Bàn giao hạng mục đầu tiên', reward: { money: 300, xp: 50 }, check: (c) => c.completed.length >= 1 },
  { id: 'M05', title: 'Hoàn thành công trình cao ≥ 10 tầng', reward: { money: 1500, xp: 150 }, check: (c) => c.completed.some((n) => (n.params.floors ?? 0) >= 10) },
  { id: 'M06', title: 'Hoàn thành nhà khung thép ≥ 3 nhịp', reward: { money: 1000, xp: 120 }, check: (c) => c.completed.some((n) => n.type === 'asm.steelShed' && n.params.length / n.params.bay >= 3) },
  { id: 'M07', title: 'Bàn giao 5 đối tượng', reward: { xp: 100 }, check: (c) => c.completed.length >= 5 },
  { id: 'M08', title: 'Đạt cấp 3', reward: { money: 2000 }, check: (c) => levelOf(c.sim.xp) >= 3 },
];

/** Trả về sim mới đã cộng thưởng cho các nhiệm vụ vừa đạt */
export function checkMissions(doc, sim) {
  const nodes = Object.values(doc.nodes);
  const completed = nodes.filter((n) => sim.nodes[n.id]?.complete);
  let s = sim;
  for (const m of MISSIONS) {
    if (s.missions[m.id]) continue;
    if (!m.check({ doc, sim: s, nodes, completed })) continue;
    s = {
      ...s,
      money: s.money + (m.reward.money ?? 0),
      xp: s.xp + (m.reward.xp ?? 0),
      missions: { ...s.missions, [m.id]: s.day || true },
      log: [{ day: s.day, text: `★ Nhiệm vụ: ${m.title} (+${m.reward.money ? `${m.reward.money} tr ` : ''}${m.reward.xp ? `${m.reward.xp} XP` : ''})`, tone: 'ok' }, ...s.log].slice(0, 80),
    };
  }
  return s;
}
