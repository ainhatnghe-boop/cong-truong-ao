// ============================================================
//  Định dạng dữ liệu dự án (có version) + kiểm tra tính nhất quán + sửa lỗi + migration.
//
//  ProjectDoc (phần THIẾT KẾ — có Undo/Redo):
//  { schema:'ctao.project', version, id, seq,
//    meta: { name, company, category, mode, budget, targetDays, createdAt, updatedAt },
//    site: { width, depth, shape, boundary:[[x,z]…], terrain:{ type, cell, nx, nz, heights, base, water } },
//    nodes: { [id]: { id, type, name, parentId, order, t:{ p:[x,y,z], ry }, params, locked, hidden } } }
//
//  SimState (phần VẬN HÀNH — không đi vào Undo/Redo):
//  { day, money, xp, running, speed, crews:{skill:n},
//    nodes: { [id]: { started, order, done:[tổ-ngày đã làm theo hoạt động], spent, complete, mobilized } },
//    missions:{ id:true }, log:[{ day, text, tone }] }
// ============================================================
import { getType, sanitizeParams } from './ObjectRegistry.js';
import { SKILLS } from './materials.js';

export const SCHEMA_ID = 'ctao.project';
export const SCHEMA_VERSION = 1;

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(finite);

export function emptySim(money) {
  return { day: 0, money, xp: 0, running: false, speed: 1, crews: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0])), nodes: {}, missions: {}, log: [] };
}

/** Kiểm tra tính nhất quán. Trả về danh sách lỗi (chuỗi). Rỗng = hợp lệ. */
export function validate(doc, sim) {
  const e = [];
  if (!doc || doc.schema !== SCHEMA_ID) return ['Không phải tệp dự án Công trường ảo'];
  if (doc.version !== SCHEMA_VERSION) e.push(`Phiên bản dữ liệu ${doc.version} khác ${SCHEMA_VERSION}`);
  if (!doc.meta?.name?.trim()) e.push('Thiếu tên dự án');
  const s = doc.site;
  if (!s || !finite(s.width) || !finite(s.depth) || s.width < 50 || s.depth < 50 || s.width > 4000 || s.depth > 4000) e.push('Kích thước bản đồ phải trong 50–4000 m');
  const t = s?.terrain;
  if (!t || !t.heights || t.heights.length !== (t.nx + 1) * (t.nz + 1)) e.push('Lưới cao độ địa hình không khớp kích thước');
  else if (t.base?.length !== t.heights.length) e.push('Địa hình gốc không khớp lưới cao độ');
  const nodes = doc.nodes ?? {};
  let maxSeq = 0;
  for (const [key, n] of Object.entries(nodes)) {
    if (n.id !== key) e.push(`Nút "${key}" có id lệch "${n.id}"`);
    const num = Number(String(n.id).split('-')[1]);
    if (Number.isFinite(num)) maxSeq = Math.max(maxSeq, num);
    const T = getType(n.type);
    if (!T) {
      e.push(`${n.id}: loại "${n.type}" không có trong ObjectRegistry`);
      continue;
    }
    if (n.parentId != null) {
      const p = nodes[n.parentId];
      if (!p) e.push(`${n.id}: nút cha ${n.parentId} không tồn tại`);
      else if (!getType(p.type)?.container) e.push(`${n.id}: nút cha ${n.parentId} không phải nút phân cấp`);
    }
    if (!isVec3(n.t?.p) || !finite(n.t?.ry)) e.push(`${n.id}: transform không hợp lệ`);
    const clean = sanitizeParams(n.type, n.params);
    for (const k of Object.keys(clean)) if (clean[k] !== n.params?.[k]) e.push(`${n.id}: tham số ${k} = ${JSON.stringify(n.params?.[k])} ngoài khoảng cho phép`);
  }
  // chu trình cha–con
  for (const n of Object.values(nodes)) {
    const seen = new Set();
    for (let c = n; c?.parentId != null; c = nodes[c.parentId]) {
      if (seen.has(c.id)) {
        e.push(`${n.id}: phân cấp bị vòng lặp`);
        break;
      }
      seen.add(c.id);
    }
  }
  if (!finite(doc.seq) || doc.seq < maxSeq) e.push(`Bộ đếm id (${doc.seq}) nhỏ hơn id lớn nhất (${maxSeq})`);
  if (sim) {
    if (!finite(sim.money)) e.push('Tiền không hợp lệ');
    if (!finite(sim.day) || sim.day < 0) e.push('Ngày mô phỏng không hợp lệ');
    for (const [k, v] of Object.entries(sim.crews ?? {})) if (!SKILLS[k] || !Number.isInteger(v) || v < 0) e.push(`Tổ đội ${k} = ${v} không hợp lệ`);
    for (const [id, st] of Object.entries(sim.nodes ?? {})) {
      if (!nodes[id]) e.push(`Mô phỏng: ${id} không còn trong dự án`);
      if (st.done && (!Array.isArray(st.done) || st.done.some((v) => !finite(v) || v < 0))) e.push(`Mô phỏng: ${id}.done không hợp lệ`);
    }
  }
  return e;
}

/** Sửa những lỗi có thể sửa; trả về { doc, sim, fixes:[mô tả] } */
export function repair(doc, sim) {
  const fixes = [];
  const nodes = {};
  for (const [key, n0] of Object.entries(doc.nodes ?? {})) {
    if (!getType(n0?.type)) {
      fixes.push(`Bỏ ${key}: loại "${n0?.type}" không hỗ trợ`);
      continue;
    }
    const n = { ...n0, id: key };
    const p = isVec3(n.t?.p) ? n.t.p : [0, 0, 0];
    const ry = finite(n.t?.ry) ? n.t.ry : 0;
    if (p !== n.t?.p || ry !== n.t?.ry) fixes.push(`${key}: đặt lại transform`);
    n.t = { p, ry };
    const params = sanitizeParams(n.type, n.params);
    if (JSON.stringify(params) !== JSON.stringify(n.params ?? {})) fixes.push(`${key}: đưa tham số về khoảng cho phép`);
    n.params = params;
    n.name = n.name || getType(n.type).label;
    n.order = finite(n.order) ? n.order : 0;
    n.locked = !!n.locked;
    n.hidden = !!n.hidden;
    nodes[key] = n;
  }
  for (const n of Object.values(nodes)) {
    if (n.parentId != null && (!nodes[n.parentId] || !getType(nodes[n.parentId].type).container)) {
      fixes.push(`${n.id}: nút cha không hợp lệ → đưa lên gốc`);
      n.parentId = null;
    }
  }
  for (const n of Object.values(nodes)) {
    const seen = new Set([n.id]);
    for (let c = nodes[n.parentId]; c; c = nodes[c.parentId]) {
      if (seen.has(c.id)) {
        fixes.push(`${n.id}: cắt vòng lặp phân cấp`);
        n.parentId = null;
        break;
      }
      seen.add(c.id);
    }
  }
  const maxSeq = Math.max(0, ...Object.keys(nodes).map((k) => Number(k.split('-')[1]) || 0));
  const seq = Math.max(doc.seq || 0, maxSeq);
  if (seq !== doc.seq) fixes.push('Cập nhật bộ đếm id');
  const out = { ...doc, nodes, seq };
  let s = sim;
  if (s) {
    s = { ...s, nodes: {} };
    for (const [id, st] of Object.entries(sim.nodes ?? {})) {
      if (!nodes[id]) {
        fixes.push(`Mô phỏng: bỏ trạng thái của ${id} (đối tượng đã xoá)`);
        continue;
      }
      s.nodes[id] = { ...st, done: (st.done ?? []).map((v) => (finite(v) && v > 0 ? v : 0)) };
    }
    if (!finite(s.money)) {
      s.money = doc.meta?.budget ?? 0;
      fixes.push('Đặt lại tiền về ngân sách');
    }
    s.crews = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, Math.max(0, Math.round(sim.crews?.[k] ?? 0))]));
  }
  return { doc: out, sim: s, fixes };
}

// ---------------- Lưu trữ (serialize) & migration ----------------
export function serialize(doc, sim) {
  const t = doc.site.terrain;
  const r2 = (a) => Array.from(a, (v) => Math.round(v * 100) / 100);
  return {
    schema: SCHEMA_ID,
    version: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    project: { ...doc, site: { ...doc.site, terrain: { ...t, heights: r2(t.heights), base: r2(t.base) } } },
    sim,
  };
}

/** Chuỗi migration: MIGRATIONS[v] chuyển dữ liệu từ version v sang v+1 */
const MIGRATIONS = {
  // v0 (bản nháp nội bộ): nodes là mảng, transform là position/rotationY rời
  0: (f) => {
    const p = f.project;
    const nodes = {};
    for (const n of Array.isArray(p.nodes) ? p.nodes : Object.values(p.nodes ?? {})) {
      nodes[n.id] = { ...n, t: n.t ?? { p: n.position ?? [0, 0, 0], ry: n.rotationY ?? 0 } };
      delete nodes[n.id].position;
      delete nodes[n.id].rotationY;
    }
    return { ...f, version: 1, project: { ...p, version: 1, nodes } };
  },
};

/** Đọc tệp đã lưu → { doc, sim, fixes, errors } (đã migrate & sửa) */
export function deserialize(file) {
  if (!file || file.schema !== SCHEMA_ID) return { errors: ['Không phải tệp dự án Công trường ảo (schema khác)'] };
  let f = file;
  const fixes = [];
  let v = Number(f.version ?? 0);
  if (v > SCHEMA_VERSION) return { errors: [`Tệp tạo bởi phiên bản mới hơn (v${v}). Hãy cập nhật ứng dụng.`] };
  while (v < SCHEMA_VERSION) {
    if (!MIGRATIONS[v]) return { errors: [`Không có migration từ v${v}`] };
    f = MIGRATIONS[v](f);
    fixes.push(`Nâng cấp dữ liệu v${v} → v${v + 1}`);
    v++;
  }
  const p = f.project;
  const t = p.site?.terrain;
  if (!t?.heights) return { errors: ['Tệp thiếu dữ liệu địa hình'] };
  const doc = { ...p, schema: SCHEMA_ID, version: SCHEMA_VERSION, site: { ...p.site, terrain: { ...t, heights: Float32Array.from(t.heights), base: Float32Array.from(t.base ?? t.heights) } } };
  const sim = { ...emptySim(p.meta?.budget ?? 0), ...(f.sim ?? {}), running: false };
  const r = repair(doc, sim);
  const errors = validate(r.doc, r.sim);
  return { doc: r.doc, sim: r.sim, fixes: [...fixes, ...r.fixes], errors };
}
