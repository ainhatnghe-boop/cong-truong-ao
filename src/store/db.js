// ============================================================
//  Kho dữ liệu runtime: dữ liệu gốc (JSON) + bản vá (patch) lưu localStorage
//  API chính:
//    db.get('WK-05')                → bản ghi theo id (đã áp patch)
//    db.list('tasks', t => ...)     → danh sách theo bảng
//    db.update('TSK-001', {...})    → cập nhật & lưu patch
//    db.resolve('TSK-001')          → bản ghi + các tham chiếu đã giải id
//  React: useDB(selector) để re-render khi dữ liệu đổi.
// ============================================================
import { useSyncExternalStore } from 'react';
import { SCHEMA, prefixOf } from '../data/index.js';

const STORAGE_KEY = 'ctao.patches.v1';

function loadPatches() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}
function savePatches(p) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* bỏ qua: trình duyệt chặn storage */
  }
}

function build(patches) {
  const byId = new Map();
  const tables = {};
  for (const [prefix, s] of Object.entries(SCHEMA)) {
    const rows = s.rows.map((row) => (patches[row.id] ? { ...row, ...patches[row.id] } : row));
    // bản ghi tạo mới khi chạy (lưu trong patches, đánh dấu __new)
    for (const [id, p] of Object.entries(patches)) if (p.__new && prefixOf(id) === prefix) rows.push(p);
    for (const rec of rows) byId.set(rec.id, rec);
    tables[s.table] = rows;
  }
  return { byId, tables, version: Date.now() };
}

let patches = loadPatches();
let state = build(patches);
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export const db = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  snapshot: () => state,
  get: (id) => state.byId.get(id) ?? null,
  getMany: (ids = []) => ids.map((id) => state.byId.get(id)).filter(Boolean),
  list: (table, pred) => (pred ? (state.tables[table] ?? []).filter(pred) : state.tables[table] ?? []),
  update(id, patch) {
    if (!state.byId.has(id)) return console.warn('[db] Không tìm thấy id', id);
    patches = { ...patches, [id]: { ...(patches[id] || {}), ...patch, updatedAt: new Date().toISOString() } };
    savePatches(patches);
    state = build(patches);
    emit();
  },
  /** Id kế tiếp của một bảng, vd nextId('TSK') → 'TSK-025' */
  nextId(prefix) {
    const s = SCHEMA[prefix];
    const nums = (state.tables[s.table] ?? []).map((r) => Number(r.id.split('-')[1]) || 0);
    const width = s.rows[0]?.id.split('-')[1]?.length ?? 3;
    return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(width, '0')}`;
  },
  /** Tạo bản ghi mới (lưu localStorage như bản vá). Trả về id. */
  create(prefix, rec) {
    const id = rec.id ?? db.nextId(prefix);
    patches = { ...patches, [id]: { ...rec, id, __new: true, createdAt: new Date().toISOString() } };
    savePatches(patches);
    state = build(patches);
    emit();
    return id;
  },
  /** Bản ghi + các trường tham chiếu đã giải (vd assigneeId → assignee) */
  resolve(id) {
    const rec = db.get(id);
    if (!rec) return null;
    const refs = SCHEMA[prefixOf(id)]?.refs ?? {};
    const out = { ...rec };
    for (const field of Object.keys(refs)) {
      if (rec[field]) out[field.replace(/Id$/, '')] = db.get(rec[field]);
    }
    return out;
  },
  /** Các bản ghi ở bảng khác đang trỏ tới id này */
  backlinks(id) {
    const res = [];
    for (const s of Object.values(SCHEMA)) {
      for (const [field] of Object.entries(s.refs)) {
        for (const row of state.tables[s.table]) if (row[field] === id) res.push({ table: s.table, field, id: row.id });
      }
    }
    return res;
  },
  patchedIds: () => Object.keys(patches),
  reset() {
    patches = {};
    savePatches(patches);
    state = build(patches);
    emit();
  },
};

/** Hook: selector nhận snapshot, trả về giá trị dùng để render */
export function useDB(selector = (s) => s) {
  const snap = useSyncExternalStore(db.subscribe, db.snapshot);
  return selector(snap);
}
