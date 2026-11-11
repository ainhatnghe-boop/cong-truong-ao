// ============================================================
//  DynamicWorkflowEngine — MỘT engine cho mọi loại công việc; mỗi mẫu (workflows.json) có bộ bước riêng.
//  Trạng thái bước: locked → ready → done | failed | skipped ; bước optional bắt đầu 'dormant'.
//  - after: nhiều bước tiên quyết → chạy SONG SONG các bước cùng sẵn sàng
//  - requires: chờ điều kiện (PPE / PTW / huấn luyện) — bước 'ready' nhưng bị chặn tới khi đủ
//  - decision: rẽ nhánh (next → kích hoạt bước optional; skip → bỏ qua)
//  - inspect: không đạt → onFail (làm lại) → retry mở lại bước kiểm tra
//  Quy trình đơn giản hoá cho gameplay, KHÔNG phải biện pháp thi công được phê duyệt.
// ============================================================
import { DATA } from './data.js';
import { getType, isBuildable } from '../engine/ObjectRegistry.js';
import { build } from '../engine/ParametricGeometryEngine.js';
import { progressOf } from '../engine/ConstructionSimulationEngine.js';
import { getRole } from './RoleManagementSystem.js';
import { activePermit } from './PTWSimulator.js';

export const template = (id) => DATA.workflows.templates[id] ?? null;

/** Mẫu quy trình cho nghề + đối tượng (nghề 'work' → theo hoạt động thi công hiện tại của đối tượng) */
export function workflowFor(roleId, node, actSkill) {
  const r = getRole(roleId);
  if (!r) return null;
  if (r.workflow !== 'work') return r.workflow;
  const rule = DATA.workflows.workMap.find((m) => m.skill === actSkill && (!m.types || m.types.includes(node.type)));
  return rule?.workflow ?? 'wf.field';
}

function seeded(seed, salt) {
  let h = 2166136261 ^ salt;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (Math.abs(h) % 1000) / 1000;
}

export function createInstance(templateId, { id, objectId, actIndex, seed }) {
  const tpl = template(templateId);
  if (!tpl) throw new Error(`Không có mẫu quy trình ${templateId}`);
  const status = {};
  for (const s of tpl.steps) status[s.id] = s.optional ? 'dormant' : s.after?.length ? 'locked' : 'ready';
  return { id, templateId, objectId, actIndex, seed: seed ?? id, status, attempts: {}, log: [] };
}

function refresh(inst) {
  const tpl = template(inst.templateId);
  const status = { ...inst.status };
  let changed = true;
  while (changed) {
    changed = false;
    for (const s of tpl.steps) {
      if (status[s.id] !== 'locked') continue;
      if ((s.after ?? []).every((a) => status[a] === 'done' || status[a] === 'skipped')) {
        status[s.id] = 'ready';
        changed = true;
      }
    }
  }
  return { ...inst, status };
}

export const stepDef = (inst, stepId) => template(inst.templateId).steps.find((s) => s.id === stepId);
export const readySteps = (inst) => template(inst.templateId).steps.filter((s) => inst.status[s.id] === 'ready');
export const isDone = (inst) => template(inst.templateId).steps.every((s) => ['done', 'skipped', 'dormant'].includes(inst.status[s.id]));

/** Điều kiện chưa đạt của 1 bước (ctx: { equipped, siteProgress, playTime, trainings }) */
export function blockers(step, ctx) {
  const out = [];
  const req = step.requires ?? {};
  for (const p of req.ppe ?? []) if (!ctx.equipped.includes(p)) out.push(`Cần mặc ${DATA.ppeById[p]?.label ?? p}`);
  if (req.permit && !activePermit(ctx.siteProgress, req.permit, ctx.playTime)) out.push(`Cần giấy phép ${DATA.permitById[req.permit]?.label} còn hiệu lực (mô phỏng)`);
  for (const t of req.training ?? []) if (!ctx.trainings.includes(t)) out.push(`Cần hoàn thành ${DATA.trainingById[t]?.label ?? t}`);
  return out;
}

/** Kết quả kiểm tra (inspect): lần đầu có thể phát hiện khuyết tật (tất định theo seed), sau khi làm lại thì đạt */
export function inspectionFindings(inst, step) {
  const n = inst.attempts[step.id] ?? 0;
  const defect = n === 0 && seeded(inst.seed, step.id.length * 7 + 3) < 0.5;
  return { defect, findings: defect ? [step.defects[Math.floor(seeded(inst.seed, 11) * step.defects.length)]] : ['Không phát hiện sai lỗi so với yêu cầu'] };
}

/**
 * Hoàn thành 1 bước. outcome: { pass?:bool, option?:index }
 * Trả về { inst, completed: bool, branch?: 'rework' }
 */
export function completeStep(inst0, stepId, outcome = {}) {
  const step = stepDef(inst0, stepId);
  if (!step || inst0.status[stepId] !== 'ready') return { inst: inst0, completed: false };
  const inst = { ...inst0, status: { ...inst0.status }, attempts: { ...inst0.attempts, [stepId]: (inst0.attempts[stepId] ?? 0) + 1 }, log: [...inst0.log, { step: stepId, outcome }] };
  if (step.kind === 'inspect' && outcome.pass === false && step.onFail) {
    inst.status[stepId] = 'failed';
    inst.status[step.onFail] = 'ready';
    return { inst: refresh(inst), completed: false, branch: 'rework' };
  }
  inst.status[stepId] = 'done';
  if (step.kind === 'decision' && step.options?.[outcome.option]) {
    const opt = step.options[outcome.option];
    if (opt.next && inst.status[opt.next] === 'dormant') inst.status[opt.next] = 'ready';
    for (const s of opt.skip ?? []) if (inst.status[s] !== 'done') inst.status[s] = 'skipped';
  }
  if (step.retry) {
    inst.status[step.retry] = 'ready';
    // bước làm lại có thể được dùng lại nếu kiểm tra lần nữa không đạt
    inst.status[stepId] = 'dormant';
  }
  return { inst: refresh(inst), completed: true };
}

// ---------------- câu hỏi sinh từ DỮ LIỆU ENGINE (không viết cứng đáp án) ----------------
function shuffle(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed, i * 13) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function numQuiz(q, value, fmt, seed, factors = [0.6, 1.45]) {
  const opts = shuffle([value, value * factors[0], value * factors[1]], seed);
  return { q, options: opts.map(fmt), answer: opts.indexOf(value) };
}

/** Sinh câu hỏi theo khoá quizGen từ đối tượng, tiến độ & vùng thực tế */
export function generateQuiz(kind, { node, sim, zone, seed }) {
  if (kind === 'quantity' && node) {
    const geo = build(node);
    const pr = progressOf(node, sim.nodes[node.id]);
    const act = geo.plan[Math.min(pr.k, geo.plan.length - 1)];
    const v = Math.max(1, Math.round(act.volume));
    return numQuiz(`Khối lượng hình học (mô phỏng) của hoạt động “${act.label}” thuộc ${node.name} là bao nhiêu?`, v, (x) => `${Math.round(x).toLocaleString('vi-VN')} m³`, seed);
  }
  if (kind === 'progress' && node) {
    const pr = progressOf(node, sim.nodes[node.id]);
    const v = Math.max(1, Math.round(pr.overall * 100));
    const alt = [Math.min(100, v + 25), Math.max(0, v - 20)].map((x) => (x === v ? x + 7 : x));
    const opts = shuffle([v, ...alt], seed);
    return { q: `Quan sát hiện trường: ${node.name} đã hoàn thành khoảng bao nhiêu %?`, options: opts.map((x) => `${x}%`), answer: opts.indexOf(v) };
  }
  if (kind === 'dimension' && node) {
    const T = getType(node.type);
    const p = T.params.find((x) => x.type === 'number' || x.type === 'int');
    if (p) {
      const v = node.params[p.key];
      return numQuiz(`Theo mô hình, “${p.label}” của ${node.name} là bao nhiêu?`, v, (x) => `${p.type === 'int' ? Math.round(x) : Math.round(x * 10) / 10} ${p.unit ?? ''}`.trim(), seed, [0.75, 1.3]);
    }
  }
  if (kind === 'hazard' && zone) {
    const kinds = DATA.safety.kinds;
    const others = shuffle(Object.keys(kinds).filter((k) => !['general', 'walkway', zone.kind].includes(k)), seed).slice(0, 2);
    const opts = shuffle([zone.kind, ...others], seed + 1);
    return { q: `Khu vực bạn đang tuần tra (${zone.name}) có mối nguy chính là gì?`, options: opts.map((k) => kinds[k]), answer: opts.indexOf(zone.kind) };
  }
  return { q: 'Bạn đã sẵn sàng thực hiện bước này?', options: ['Sẵn sàng', 'Chưa'], answer: 0 };
}

/** Chọn đối tượng giao việc phù hợp nghề (chưa hoàn thành; nghề thi công → đúng kỹ năng hoạt động hiện tại) */
export function pickTaskObject(doc, sim, roleId, reachable = () => true) {
  const r = getRole(roleId);
  const cands = Object.values(doc.nodes)
    .filter((n) => isBuildable(n.type) && !n.hidden)
    .map((n) => {
      const pr = progressOf(n, sim.nodes[n.id]);
      const act = pr.geo.plan[Math.min(pr.k, pr.geo.plan.length - 1)];
      return { n, pr, act };
    })
    .filter((c) => c.pr.status !== 'done');
  const prefer = (c) => {
    let s = 0;
    if (r.workflow === 'work' && r.workSkills?.includes(c.act.skill)) s += 10;
    if (['electrical-engineer', 'mechanical-engineer', 'mep-engineer'].includes(r.id) && c.n.type.startsWith('process.')) s += 6;
    if (c.pr.status === 'active') s += 2;
    return s;
  };
  const sorted = cands.sort((a, b) => prefer(b) - prefer(a));
  return sorted.find((c) => reachable(c.n)) ?? sorted[0] ?? null;
}
