// Kiểm tra toàn vẹn dữ liệu: id trùng, sai tiền tố, tham chiếu gãy, ràng buộc nghiệp vụ.
// Đọc cấu trúc từ src/data/schema.json (cùng nguồn với ứng dụng) → không phải khai báo 2 nơi.
// Chạy: npm run check:data   (bắt buộc sau mọi thay đổi trong src/data/)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const load = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const { tables: SCHEMA } = load('schema.json');

const errors = [];
const warns = [];
const all = new Map();
const T = {};
for (const [prefix, s] of Object.entries(SCHEMA)) {
  const file = `${s.table}.json`;
  if (!existsSync(join(dir, file))) {
    errors.push(`schema.json: thiếu file ${file} cho tiền tố ${prefix}`);
    continue;
  }
  T[prefix] = load(file);
  for (const row of T[prefix]) {
    if (!new RegExp(`^${prefix}-[0-9]{2,3}$`).test(row.id)) errors.push(`${file}: id "${row.id}" sai định dạng ${prefix}-NN`);
    if (all.has(row.id)) errors.push(`${file}: id trùng "${row.id}"`);
    all.set(row.id, row);
  }
}
const ref = (file, row, field, target, v) => {
  if (v == null) return;
  if (typeof v !== 'string' || !v.startsWith(`${target}-`) || !all.has(v)) errors.push(`${file}: ${row.id}.${field} = "${v}" không tồn tại trong bảng ${target}`);
};
for (const [prefix, s] of Object.entries(SCHEMA)) {
  const file = `${s.table}.json`;
  for (const row of T[prefix] ?? []) {
    for (const [field, target] of Object.entries(s.refs ?? {})) ref(file, row, field, target, row[field]);
    for (const [field, target] of Object.entries(s.listRefs ?? {})) for (const v of row[field] ?? []) ref(file, row, field, target, v);
  }
}

// ---- ràng buộc nghiệp vụ ----
const KINDS = ['tank', 'hall', 'hrsg', 'substation', 'jetty', 'piperack', 'tower', 'office', 'canteen', 'laydown', 'gate', 'batching'];
const EQ_KINDS = ['towerCrane', 'crawlerCrane', 'excavator', 'bargeCrane', 'truck', 'mixer'];
const ROUTINE = ['work', 'inspect', 'office', 'break'];
const routePts = new Set((T.RT ?? []).flatMap((r) => r.points.map((p) => p.join(','))));
for (const z of T.ZONE ?? []) {
  if (!KINDS.includes(z.kind)) errors.push(`zones.json: ${z.id}.kind = "${z.kind}" chưa có bộ dựng trong src/scene/Structures.jsx`);
  if (!Array.isArray(z.center) || !Array.isArray(z.size) || !Array.isArray(z.access)) errors.push(`zones.json: ${z.id} thiếu center/size/access`);
  else if (!routePts.has(z.access.join(','))) warns.push(`zones.json: ${z.id}.access ${z.access} không trùng điểm nào của routes.json (sẽ được chiếu lên đường gần nhất)`);
  if (!z.support && !(T.TSK ?? []).some((t) => t.zoneId === z.id)) errors.push(`zones.json: ${z.id} là hạng mục thi công nhưng chưa có công việc nào trong tasks.json`);
}
for (const t of T.TSK ?? []) {
  if (new Date(t.finish) <= new Date(t.start)) errors.push(`tasks.json: ${t.id} finish phải sau start`);
  if (t.progress < 0 || t.progress > 100) errors.push(`tasks.json: ${t.id}.progress ngoài 0..100`);
  if (t.status === 'done' && t.progress !== 100) errors.push(`tasks.json: ${t.id} đã nghiệm thu nhưng progress ≠ 100`);
}
for (const w of T.WK ?? []) {
  for (const b of w.routine ?? []) if (!ROUTINE.includes(b)) errors.push(`workers.json: ${w.id}.routine có hành vi lạ "${b}"`);
  if (!w.look?.shirt || !w.look?.skin) errors.push(`workers.json: ${w.id}.look thiếu shirt/skin`);
}
for (const e of T.EQ ?? []) {
  if (!EQ_KINDS.includes(e.kind)) errors.push(`equipment.json: ${e.id}.kind = "${e.kind}" chưa có mô hình trong src/scene/Equipment.jsx`);
  const moving = e.kind === 'truck' || e.kind === 'mixer';
  if (moving && !e.routeId) errors.push(`equipment.json: ${e.id} là xe nhưng thiếu routeId`);
  if (!moving && !e.pos) errors.push(`equipment.json: ${e.id} thiếu pos [x, z]`);
}
const dlg = load('dialogues.json');
for (const id of Object.keys(dlg.byWorker)) if (!all.has(id)) errors.push(`dialogues.json: byWorker có id lạ "${id}"`);
for (const id of Object.keys(dlg.ptwAuto)) if (!all.has(id)) errors.push(`dialogues.json: ptwAuto có chức danh lạ "${id}"`);

warns.forEach((w) => console.warn(`! ${w}`));
if (errors.length) {
  console.error(`✗ ${errors.length} lỗi dữ liệu:\n - ` + errors.join('\n - '));
  process.exit(1);
}
console.log(`✓ Dữ liệu hợp lệ: ${all.size} bản ghi / ${Object.keys(SCHEMA).length} bảng`);
