// ============================================================
//  Trạng thái TRÌNH CHỈNH SỬA (không thuộc dữ liệu dự án): lựa chọn, công cụ, lưới, bắt dính,
//  chế độ xem, cắt cao độ, lớp hiển thị, bút địa hình, bố cục panel, chất lượng đồ hoạ.
//  Bố cục & tuỳ chọn được lưu localStorage (ctao.studio.layout) — "Lưu bố cục giao diện".
// ============================================================
import { useSyncExternalStore } from 'react';
import { CATEGORIES } from '../engine/ObjectRegistry.js';

const LAYOUT_KEY = 'ctao.studio.layout';
const PERSIST = ['panels', 'quality', 'grid', 'gridSize', 'snapGrid', 'snapObject', 'snapGround', 'leftTab', 'bottomTab', 'night'];

function loadLayout() {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
  } catch {
    return {};
  }
}

let state = {
  screen: 'start', // 'start' | 'editor'
  selection: [],
  tool: 'select', // 'select' | 'place' | 'terrain'
  gizmo: 'translate', // 'translate' | 'rotate'
  placeType: null,
  grid: true,
  gridSize: 1,
  snapGrid: true,
  snapObject: true,
  snapGround: true,
  view: 'persp', // 'persp' | 'plan'
  cut: { on: false, y: 30 },
  layers: Object.fromEntries(CATEGORIES.map((c) => [c.id, true])),
  brush: { mode: 'raise', radius: 12, strength: 0.6 },
  panels: { left: true, right: true, bottom: true },
  leftTab: 'tree',
  bottomTab: 'tools',
  quality: 'medium',
  mode: 'edit', // 'edit' | 'play'
  night: false,
  search: '',
  filterCat: 'all',
  dialog: null, // 'new' | 'open' | null
  focusAt: 0,
  ...loadLayout(),
};
state.screen = 'start';
state.dialog = null;
const listeners = new Set();

export const editor = {
  get: () => state,
  set(patch) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    if (Object.keys(typeof patch === 'function' ? {} : patch).some((k) => PERSIST.includes(k)) || typeof patch === 'function') {
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(Object.fromEntries(PERSIST.map((k) => [k, state[k]]))));
      } catch {
        /* bỏ qua */
      }
    }
    listeners.forEach((l) => l());
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useEditor(selector) {
  return useSyncExternalStore(editor.subscribe, () => selector(state));
}

export function select(id, additive = false) {
  if (!id) return editor.set({ selection: [] });
  const cur = state.selection;
  if (additive) editor.set({ selection: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  else editor.set({ selection: [id] });
}

export const setTool = (tool, extra = {}) => editor.set({ tool, ...extra });
export const togglePanel = (k) => editor.set({ panels: { ...state.panels, [k]: !state.panels[k] } });

/** Thời điểm gizmo vừa thả chuột — để click xuyên xuống mặt đất không bỏ chọn nhầm */
export const gizmoClock = { until: 0 };

export const QUALITY = {
  low: { label: 'Thấp', shadows: false, shadowMap: 1024, dpr: [1, 1] },
  medium: { label: 'Trung bình', shadows: true, shadowMap: 2048, dpr: [1, 1.5] },
  high: { label: 'Cao', shadows: true, shadowMap: 4096, dpr: [1, 2] },
};
