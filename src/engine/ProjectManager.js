// ============================================================
//  ProjectManager — kho dữ liệu dự án đang mở + các LỆNH chỉnh sửa + Undo/Redo.
//  - Mọi thay đổi THIẾT KẾ đi qua apply(): kiểm tra tính nhất quán (schema.validate) TRƯỚC khi nhận;
//    lỗi → từ chối, không ghi lịch sử. Lịch sử lưu ảnh chụp bất biến (structural sharing).
//  - Trạng thái VẬN HÀNH (tiền, ngày, tiến độ…) đi qua setSim(): không vào Undo/Redo.
//  UI chỉ gọi các hàm ở đây, không sửa trực tiếp doc/sim.
// ============================================================
import { useSyncExternalStore } from 'react';
import { validate, emptySim, SCHEMA_ID, SCHEMA_VERSION } from './schema.js';
import { defaultParams, sanitizeParams, getType } from './ObjectRegistry.js';
import { generateTerrain, boundaryFor, sample } from './TerrainEngine.js';
import { worldOf, toLocal, rotY } from './PlacementSystem.js';

const HISTORY_LIMIT = 150;
const COALESCE_MS = 1200;

let state = { doc: null, sim: null, past: [], future: [], dirty: false, coalesce: null, notice: null };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

function notify(text, tone = 'info') {
  state = { ...state, notice: { text, tone, at: Date.now() } };
}

export const project = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => state,
  doc: () => state.doc,
  sim: () => state.sim,

  load(doc, sim) {
    state = { doc, sim: sim ?? emptySim(doc.meta.budget), past: [], future: [], dirty: false, coalesce: null, notice: null };
    emit();
  },
  close() {
    state = { doc: null, sim: null, past: [], future: [], dirty: false, coalesce: null, notice: null };
    emit();
  },
  markSaved() {
    state = { ...state, dirty: false };
    emit();
  },
  notify(text, tone) {
    notify(text, tone);
    emit();
  },

  /** Nhận 1 bản thiết kế mới (đã kiểm tra). coalesce: gộp các bước liên tiếp cùng khoá (kéo thanh trượt, vẽ địa hình) */
  apply(label, next, { coalesce } = {}) {
    if (!state.doc || next === state.doc) return false;
    const errs = validate(next);
    if (errs.length) {
      notify(`Không thực hiện “${label}”: ${errs[0]}`, 'bad');
      console.warn('[ProjectManager] từ chối', label, errs);
      emit();
      return false;
    }
    const now = Date.now();
    const merge = coalesce && state.coalesce?.key === coalesce && now - state.coalesce.at < COALESCE_MS;
    const past = merge ? state.past : [...state.past, { doc: state.doc, label }].slice(-HISTORY_LIMIT);
    state = { ...state, doc: next, past, future: [], dirty: true, coalesce: coalesce ? { key: coalesce, at: now } : null };
    emit();
    return true;
  },
  undo() {
    const prev = state.past[state.past.length - 1];
    if (!prev) return;
    state = { ...state, doc: prev.doc, past: state.past.slice(0, -1), future: [{ doc: state.doc, label: prev.label }, ...state.future], dirty: true, coalesce: null };
    notify(`Hoàn tác: ${prev.label}`);
    emit();
  },
  redo() {
    const nx = state.future[0];
    if (!nx) return;
    state = { ...state, doc: nx.doc, future: state.future.slice(1), past: [...state.past, { doc: state.doc, label: nx.label }], dirty: true, coalesce: null };
    notify(`Làm lại: ${nx.label}`);
    emit();
  },

  setSim(sim) {
    state = { ...state, sim, dirty: true };
    emit();
  },
  updateSim(fn) {
    project.setSim(fn(state.sim));
  },
};

export function useProject(selector = (s) => s) {
  return selector(useSyncExternalStore(project.subscribe, project.get));
}

// ---------------- Tạo dự án ----------------
export const PROJECT_CATEGORIES = [
  'Xây dựng dân dụng',
  'Xây dựng công nghiệp',
  'Công trình giao thông',
  'Hạ tầng kỹ thuật',
  'Công trình năng lượng',
  'Công trình dầu khí',
  'Công trình thuỷ lợi',
  'Công trình cảng biển',
  'Công trình ngầm',
  'Dự án hỗn hợp',
  'Tuỳ chỉnh hoàn toàn',
];

export function createProject({ name, company, category, width, depth, shape, terrain, budget, targetDays, mode, seed = Math.floor(Math.random() * 1e6) }) {
  const t = generateTerrain({ width, depth, type: terrain, seed });
  const now = new Date().toISOString();
  const doc = {
    schema: SCHEMA_ID,
    version: SCHEMA_VERSION,
    id: `PRJ-${Date.now().toString(36).toUpperCase()}`,
    seq: 0,
    meta: { name, company, category, mode, budget, targetDays, createdAt: now, updatedAt: now, seed },
    site: { width, depth, shape, boundary: boundaryFor(shape, width, depth), terrain: t },
    nodes: {},
  };
  return { doc, sim: emptySim(budget) };
}

// ---------------- Lệnh chỉnh sửa (thuần: doc → doc) ----------------
const prefixFor = (type) => (getType(type)?.container ? 'GRP' : getType(type)?.equip ? 'EQ' : 'OBJ');

function withNodes(doc, nodes, seq = doc.seq) {
  return { ...doc, nodes, seq };
}

function nextOrder(doc, parentId) {
  return Math.max(0, ...Object.values(doc.nodes).filter((n) => n.parentId === parentId).map((n) => n.order + 1));
}

/** Thêm 1 đối tượng tại vị trí thế giới; y mặc định = cao độ địa hình */
export function addNode(type, { world, parentId = null, params, name } = {}) {
  const doc = state.doc;
  const T = getType(type);
  if (!T) return null;
  const seq = doc.seq + 1;
  const id = `${prefixFor(type)}-${String(seq).padStart(4, '0')}`;
  const w = world ?? { p: [0, 0, 0], ry: 0 };
  const y = world?.p?.[1] ?? sample(doc.site.terrain, w.p[0], w.p[2]);
  const local = toLocal(doc, parentId, { p: [w.p[0], y, w.p[2]], ry: w.ry ?? 0 });
  const node = { id, type, name: name ?? `${T.label} ${seq}`, parentId, order: nextOrder(doc, parentId), t: local, params: sanitizeParams(type, { ...defaultParams(type), ...params }), locked: false, hidden: false };
  return project.apply(`Thêm ${T.label}`, withNodes(doc, { ...doc.nodes, [id]: node }, seq)) ? id : null;
}

/** Sửa 1 nút: patch có thể gồm name, params (một phần), t, locked, hidden */
export function updateNode(id, patch, { coalesce, label } = {}) {
  const doc = state.doc;
  const n = doc.nodes[id];
  if (!n) return false;
  if (n.locked && (patch.t || patch.params)) {
    project.notify(`${n.name} đang bị khoá`, 'warn');
    return false;
  }
  const next = { ...n, ...patch };
  if (patch.params) next.params = sanitizeParams(n.type, { ...n.params, ...patch.params });
  if (patch.t) next.t = { p: patch.t.p ?? n.t.p, ry: patch.t.ry ?? n.t.ry };
  return project.apply(label ?? `Sửa ${n.name}`, withNodes(doc, { ...doc.nodes, [id]: next }), { coalesce: coalesce ?? `upd:${id}` });
}

/** Đặt transform THẾ GIỚI cho 1 nút (dùng cho gizmo kéo thả) */
export function setWorld(id, world, opts) {
  const doc = state.doc;
  const n = doc.nodes[id];
  if (!n) return false;
  return updateNode(id, { t: toLocal(doc, n.parentId, world) }, opts);
}

function subtree(doc, ids) {
  const out = new Set();
  const add = (id) => {
    if (out.has(id)) return;
    out.add(id);
    for (const c of Object.values(doc.nodes)) if (c.parentId === id) add(c.id);
  };
  ids.forEach(add);
  return out;
}

export function deleteNodes(ids) {
  const doc = state.doc;
  const locked = ids.filter((id) => doc.nodes[id]?.locked);
  if (locked.length) {
    project.notify(`Không xoá được: ${locked.length} đối tượng đang khoá`, 'warn');
    return false;
  }
  const all = subtree(doc, ids);
  const nodes = { ...doc.nodes };
  all.forEach((id) => delete nodes[id]);
  return project.apply(`Xoá ${all.size} đối tượng`, withNodes(doc, nodes));
}

/** Nhân bản (cả cây con), dịch vị trí offset (m) theo phương X/Z thế giới */
export function duplicateNodes(ids, offset = [3, 0, 3]) {
  const doc = state.doc;
  const roots = ids.filter((id) => !ids.some((o) => o !== id && subtree(doc, [o]).has(id)));
  let seq = doc.seq;
  const nodes = { ...doc.nodes };
  const map = {};
  const newIds = [];
  for (const id of subtree(doc, roots)) {
    seq++;
    map[id] = `${prefixFor(doc.nodes[id].type)}-${String(seq).padStart(4, '0')}`;
  }
  for (const [oldId, newId] of Object.entries(map)) {
    const o = doc.nodes[oldId];
    const isRoot = roots.includes(oldId);
    let t = o.t;
    if (isRoot) {
      const par = o.parentId != null ? worldOf(doc, o.parentId) : { ry: 0 };
      const [dx, dz] = rotY(offset[0], offset[2], -par.ry);
      t = { p: [o.t.p[0] + dx, o.t.p[1] + offset[1], o.t.p[2] + dz], ry: o.t.ry };
    }
    nodes[newId] = { ...o, id: newId, name: isRoot ? `${o.name} (bản sao)` : o.name, parentId: isRoot ? o.parentId : map[o.parentId], t, locked: false, order: isRoot ? nextOrder(doc, o.parentId) + newIds.length : o.order };
    if (isRoot) newIds.push(newId);
  }
  return project.apply(`Nhân bản ${roots.length} đối tượng`, withNodes(doc, nodes, seq)) ? newIds : [];
}

/** Gom các nút cùng cha thành 1 nút phân cấp mới đặt tại trọng tâm */
export function groupNodes(ids, level = 'group', name) {
  const doc = state.doc;
  if (!ids.length) return null;
  const parentId = doc.nodes[ids[0]].parentId;
  if (ids.some((id) => doc.nodes[id].parentId !== parentId)) {
    project.notify('Chỉ nhóm được các đối tượng cùng cấp (cùng nút cha)', 'warn');
    return null;
  }
  const cx = ids.reduce((s, id) => s + doc.nodes[id].t.p[0], 0) / ids.length;
  const cz = ids.reduce((s, id) => s + doc.nodes[id].t.p[2], 0) / ids.length;
  const cy = Math.min(...ids.map((id) => doc.nodes[id].t.p[1]));
  const seq = doc.seq + 1;
  const gid = `GRP-${String(seq).padStart(4, '0')}`;
  const nodes = { ...doc.nodes };
  nodes[gid] = { id: gid, type: 'container', name: name ?? `Nhóm ${seq}`, parentId, order: nextOrder(doc, parentId), t: { p: [cx, cy, cz], ry: 0 }, params: sanitizeParams('container', { level }), locked: false, hidden: false };
  ids.forEach((id, i) => {
    const n = doc.nodes[id];
    nodes[id] = { ...n, parentId: gid, order: i, t: { p: [n.t.p[0] - cx, n.t.p[1] - cy, n.t.p[2] - cz], ry: n.t.ry } };
  });
  return project.apply(`Nhóm ${ids.length} đối tượng`, withNodes(doc, nodes, seq)) ? gid : null;
}

/** Bỏ nhóm: con được đưa lên nút cha của nhóm, giữ nguyên vị trí thế giới */
export function ungroup(gid) {
  const doc = state.doc;
  const g = doc.nodes[gid];
  if (!g || !getType(g.type).container) return false;
  const nodes = { ...doc.nodes };
  for (const c of Object.values(doc.nodes).filter((c) => c.parentId === gid)) {
    const [x, z] = rotY(c.t.p[0], c.t.p[2], g.t.ry);
    nodes[c.id] = { ...c, parentId: g.parentId, t: { p: [g.t.p[0] + x, g.t.p[1] + c.t.p[1], g.t.p[2] + z], ry: g.t.ry + c.t.ry } };
  }
  delete nodes[gid];
  return project.apply(`Bỏ nhóm ${g.name}`, withNodes(doc, nodes));
}

/** Chuyển nút sang nút cha khác (giữ vị trí thế giới); chặn vòng lặp */
export function reparent(id, parentId) {
  const doc = state.doc;
  const n = doc.nodes[id];
  if (!n || n.parentId === parentId) return false;
  if (parentId != null && subtree(doc, [id]).has(parentId)) {
    project.notify('Không thể đưa một nút vào bên trong chính nó', 'warn');
    return false;
  }
  const t = toLocal(doc, parentId, worldOf(doc, id));
  return project.apply(`Chuyển ${n.name}`, withNodes(doc, { ...doc.nodes, [id]: { ...n, parentId, t, order: nextOrder(doc, parentId) } }));
}

/** Ghi địa hình mới (sau một nét bút). heights là mảng MỚI (không dùng chung với bản cũ) */
export function setTerrainHeights(heights, label = 'Chỉnh địa hình') {
  const doc = state.doc;
  return project.apply(label, { ...doc, site: { ...doc.site, terrain: { ...doc.site.terrain, heights } } });
}

export function updateMeta(patch) {
  const doc = state.doc;
  return project.apply('Sửa thông tin dự án', { ...doc, meta: { ...doc.meta, ...patch } }, { coalesce: 'meta' });
}
