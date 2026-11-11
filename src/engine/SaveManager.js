// ============================================================
//  SaveManager — lưu/mở dự án trong trình duyệt (localStorage) và xuất/nhập tệp .json.
//  Trước khi lưu: kiểm tra tính nhất quán → có lỗi thì KHÔNG lưu.
//  Khi mở/nhập: migrate theo version → sửa lỗi có thể sửa → kiểm tra lại.
// ============================================================
import { serialize, deserialize, validate } from './schema.js';

const INDEX_KEY = 'ctao.studio.index';
const PREFIX = 'ctao.studio.p.';

function readIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}
function writeIndex(list) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export const listSaves = () => readIndex().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));

export function saveProject(doc, sim) {
  const errs = validate(doc, sim);
  if (errs.length) return { ok: false, error: `Dữ liệu không nhất quán, chưa lưu: ${errs[0]}` };
  const file = serialize({ ...doc, meta: { ...doc.meta, updatedAt: new Date().toISOString() } }, { ...sim, running: false, assign: undefined });
  const text = JSON.stringify(file);
  try {
    localStorage.setItem(PREFIX + doc.id, text);
    const idx = readIndex().filter((e) => e.id !== doc.id);
    idx.push({ id: doc.id, name: doc.meta.name, category: doc.meta.category, savedAt: file.savedAt, objects: Object.keys(doc.nodes).length, day: sim.day, size: text.length });
    writeIndex(idx);
    return { ok: true, size: text.length };
  } catch (e) {
    return { ok: false, error: `Bộ nhớ trình duyệt đầy hoặc bị chặn (${e.name}). Hãy dùng “Xuất tệp”.` };
  }
}

export function loadProject(id) {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(PREFIX + id) || 'null');
  } catch {
    return { errors: ['Dữ liệu lưu bị hỏng (JSON không đọc được)'] };
  }
  if (!raw) return { errors: ['Không tìm thấy bản lưu'] };
  return deserialize(raw);
}

export function deleteSave(id) {
  try {
    localStorage.removeItem(PREFIX + id);
    writeIndex(readIndex().filter((e) => e.id !== id));
  } catch {
    /* bỏ qua */
  }
}

export function exportFile(doc, sim) {
  const blob = new Blob([JSON.stringify(serialize(doc, { ...sim, running: false, assign: undefined }), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.meta.name.replace(/[^\p{L}\p{N}]+/gu, '_')}.ctao.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function importFile(file) {
  try {
    return deserialize(JSON.parse(await file.text()));
  } catch {
    return { errors: ['Tệp không phải JSON hợp lệ'] };
  }
}
