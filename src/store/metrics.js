// ============================================================
//  Chỉ số suy ra (KHÔNG lưu vào DB): tiến độ thực tế / kế hoạch theo hạng mục, gói thầu, dự án.
//  Nguồn sự thật duy nhất là tasks.json (progress, weight, start, finish).
//  -> Sửa % của TSK-xxx thì mô hình 3D của hạng mục tương ứng tự "mọc" theo.
// ============================================================
import { db } from './db.js';

const DAY = 86400000;
export const today = () => new Date(new Date().toDateString());

/** % kế hoạch của 1 công việc tại ngày hôm nay (tuyến tính giữa start và finish) */
export function plannedOf(t, now = today()) {
  const s = new Date(t.start).getTime();
  const f = new Date(t.finish).getTime();
  if (now.getTime() <= s) return 0;
  if (now.getTime() >= f) return 100;
  return Math.round(((now.getTime() - s) / (f - s)) * 100);
}

function weighted(tasks, key) {
  const W = tasks.reduce((a, t) => a + (t.weight || 1), 0);
  if (!W) return null;
  return tasks.reduce((a, t) => a + (t.weight || 1) * (key === 'plan' ? plannedOf(t) : t.progress), 0) / W;
}

/** { actual, planned, spi } của 1 hạng mục; null nếu hạng mục không có công việc (công trình phụ trợ) */
export function zoneMetrics(zoneId) {
  const tasks = db.list('tasks', (t) => t.zoneId === zoneId);
  if (!tasks.length) return null;
  const actual = weighted(tasks, 'actual');
  const planned = weighted(tasks, 'plan');
  return { actual: Math.round(actual), planned: Math.round(planned), spi: planned ? actual / planned : 1, tasks: tasks.length };
}

export function packageMetrics(pkgId) {
  const zoneIds = new Set(db.list('zones', (z) => z.packageId === pkgId).map((z) => z.id));
  const tasks = db.list('tasks', (t) => zoneIds.has(t.zoneId));
  if (!tasks.length) return null;
  const actual = weighted(tasks, 'actual');
  const planned = weighted(tasks, 'plan');
  return { actual: Math.round(actual), planned: Math.round(planned), spi: planned ? actual / planned : 1 };
}

/** Tiến độ dự án = trung bình các gói thầu theo giá trị hợp đồng */
export function projectMetrics() {
  let V = 0;
  let a = 0;
  let p = 0;
  for (const pkg of db.list('packages')) {
    const m = packageMetrics(pkg.id);
    if (!m) continue;
    V += pkg.value;
    a += pkg.value * m.actual;
    p += pkg.value * m.planned;
  }
  if (!V) return { actual: 0, planned: 0, spi: 1 };
  return { actual: Math.round((a / V) * 10) / 10, planned: Math.round((p / V) * 10) / 10, spi: p ? a / p : 1 };
}

export const daysSince = (date) => Math.max(0, Math.floor((today().getTime() - new Date(date).getTime()) / DAY));
export const isLate = (t) => t.status !== 'done' && t.progress < plannedOf(t) - 5;
export const isOverdue = (rec) => rec.status !== 'closed' && rec.due && new Date(rec.due) < today();

/** Màu theo SPI: dùng chung cho biển hạng mục, dock, panel */
export const spiTone = (spi) => (spi >= 0.98 ? 'ok' : spi >= 0.9 ? 'warn' : 'bad');
