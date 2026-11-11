// ============================================================
//  Mô phỏng công trường: nhân lực đi thi công / kiểm tra / họp / nghỉ ca, nói chuyện,
//  cập nhật tiến độ công việc, phát sinh quan sát HSE và yêu cầu giấy phép làm việc (PTW).
//  Quyền ghi dữ liệu của mô phỏng: xem docs/01 RULE AGENTS.md mục B4.
// ============================================================
import { db } from './db.js';
import { ui, logActivity } from './ui.js';
import { dialogues } from '../data/index.js';
import { runtime, sendTo, isIdle } from '../scene/runtime.js';
import { spotIn, walkPath } from '../scene/layout.js';
import { plannedOf } from './metrics.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fill = (tpl, map) => tpl.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');
const todayISO = () => new Date().toISOString().slice(0, 10);
const MAX_AUTO_RECORDS = 30; // giới hạn bản ghi do mô phỏng tự tạo (tránh phình localStorage)
let autoCreated = 0;

const zoneOfKind = (kind) => db.list('zones').find((z) => z.kind === kind);
const buildZones = () => db.list('zones', (z) => !z.support);

function currentTask(workerId) {
  return (
    db.list('tasks', (t) => t.assigneeId === workerId && t.status === 'doing')[0] ||
    db.list('tasks', (t) => t.assigneeId === workerId && t.status !== 'done')[0] ||
    null
  );
}

function setDoing(id, text) {
  ui.set((s) => ({ doing: { ...s.doing, [id]: text } }));
}

export function say(id, text, ms = 4200) {
  ui.set((s) => ({ bubbles: { ...s.bubbles, [id]: text } }));
  setTimeout(() => {
    ui.set((s) => {
      if (s.bubbles[id] !== text) return {};
      const b = { ...s.bubbles };
      delete b[id];
      return { bubbles: b };
    });
  }, ms);
}

/** Đưa 1 người tới hạng mục đích theo hành vi */
function moveWorker(w, behavior) {
  const r = runtime.workers[w.id];
  if (!r) return;
  const fromZone = r.zoneId ? db.get(r.zoneId) : null;
  let target = null;
  let mode = 'stand';
  let text = '';
  if (behavior === 'work') {
    target = db.get(w.zoneId);
    mode = target.support ? 'stand' : 'work';
    const t = currentTask(w.id);
    text = fill(pick(dialogues.behaviors.work), { task: t ? t.title : 'công việc được giao' });
  } else if (behavior === 'inspect') {
    target = pick(buildZones());
    text = fill(pick(dialogues.behaviors.inspect), { zone: target.name });
  } else if (behavior === 'office') {
    target = zoneOfKind('office');
    text = pick(dialogues.behaviors.office);
  } else if (behavior === 'break') {
    target = zoneOfKind('canteen');
    mode = 'sit';
    text = pick(dialogues.behaviors.break);
  }
  if (!target) return;
  if (fromZone?.id === target.id && behavior !== 'inspect') return;
  const spot = spotIn(target);
  sendTo(w.id, walkPath(r, fromZone, target, spot), { mode, zoneId: target.id, faceTo: target.kind === 'canteen' ? [spot.x, target.center[1]] : target.center });
  setDoing(w.id, text);
  if (behavior === 'inspect') {
    logActivity(w.id, `${w.title} đi kiểm tra ${target.name}`);
    maybeObserve(w, target);
  }
}

/** Cán bộ HSE khi đi kiểm tra có thể ghi nhận 1 quan sát an toàn mới */
function maybeObserve(w, zone) {
  if (w.roleId !== 'ROLE-05' || Math.random() > 0.3 || autoCreated >= MAX_AUTO_RECORDS) return;
  const tpl = pick(dialogues.hseAuto);
  const id = db.create('HSE', {
    type: tpl.type,
    severity: tpl.severity,
    title: fill(tpl.title, { zone: zone.name }),
    zoneId: zone.id,
    reporterId: w.id,
    date: todayISO(),
    status: tpl.type === 'good-practice' ? 'closed' : 'open',
    action: tpl.type === 'good-practice' ? 'Ghi nhận, tuyên dương' : 'Chờ chỉ huy trưởng khắc phục',
  });
  autoCreated++;
  logActivity(w.id, `${w.title} ghi nhận ${id}: ${db.get(id).title}`);
}

/** Thợ cần PTW (theo chức danh) gửi yêu cầu giấy phép — chỉ người dùng mới duyệt */
function maybeRequestPermit() {
  if (autoCreated >= MAX_AUTO_RECORDS) return;
  if (db.list('permits', (p) => p.status === 'requested').length >= 4) return;
  const cands = db.list('workers', (w) => dialogues.ptwAuto[w.roleId] && runtime.workers[w.id]?.zoneId === w.zoneId);
  if (!cands.length) return;
  const w = pick(cands);
  const zone = db.get(w.zoneId);
  if (zone.support) return;
  if (db.list('permits', (p) => p.holderId === w.id && (p.status === 'requested' || p.status === 'active')).length) return;
  const tpl = dialogues.ptwAuto[w.roleId];
  const approver = pick(db.list('workers', (x) => x.roleId === 'ROLE-05'));
  const id = db.create('PTW', {
    type: tpl.type,
    title: fill(tpl.title, { zone: zone.name }),
    zoneId: zone.id,
    holderId: w.id,
    approverId: approver?.id ?? null,
    status: 'requested',
    date: todayISO(),
    validTo: todayISO(),
  });
  autoCreated++;
  logActivity(w.id, `${w.title} gửi yêu cầu ${id} (${db.get(id).title}) chờ duyệt`);
  say(w.id, 'Em đã gửi PTW, nhờ HSE duyệt giúp ạ!');
}

function progressTick() {
  // việc đã tới ngày bắt đầu mà chưa khởi công → chuyển sang "đang thi công"
  for (const t of db.list('tasks', (x) => x.status === 'todo' && plannedOf(x) > 0)) {
    db.update(t.id, { status: 'doing' });
    logActivity(t.assigneeId, `Khởi công “${t.title}”`);
  }
  const doing = db.list('tasks', (t) => t.status === 'doing');
  if (!doing.length) return;
  const t = pick(doing);
  const w = db.get(t.assigneeId);
  const progress = Math.min(100, t.progress + 2 + Math.floor(Math.random() * 4));
  if (progress >= 100) {
    db.update(t.id, { progress: 100, status: 'review' });
    logActivity(w.id, `${w.title} hoàn thành “${t.title}”, mời TVGS nghiệm thu`);
    say(w.id, 'Xong hạng mục rồi, mời TVGS nghiệm thu ạ!');
  } else {
    db.update(t.id, { progress });
    logActivity(w.id, `“${t.title}” đạt ${progress}%`);
  }
}

let timers = [];
export function startSim() {
  stopSim();
  const live = () => !ui.get().paused;
  timers.push(
    setInterval(() => {
      if (!live()) return;
      const ws = db.list('workers', (w) => w.status === 'on-site' && isIdle(w.id));
      if (!ws.length) return;
      const w = pick(ws);
      const r = runtime.workers[w.id];
      const away = r.zoneId !== w.zoneId;
      const behavior = away && Math.random() < 0.6 ? 'work' : pick(w.routine);
      moveWorker(w, behavior);
    }, 1800),
    setInterval(() => {
      if (!live()) return;
      const w = pick(db.list('workers', (x) => x.status === 'on-site'));
      const lines = dialogues.byWorker[w.id];
      if (lines) say(w.id, pick(lines));
    }, 4800),
    setInterval(() => live() && progressTick(), 7000),
    setInterval(() => live() && maybeRequestPermit(), 23000),
  );
  for (const w of db.list('workers')) {
    const t = currentTask(w.id);
    setDoing(w.id, t ? `Đang thi công: ${t.title}` : db.get(w.zoneId)?.name ?? 'Có mặt');
  }
}

export function stopSim() {
  timers.forEach(clearInterval);
  timers = [];
}
