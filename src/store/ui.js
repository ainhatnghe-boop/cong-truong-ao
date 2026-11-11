// Trạng thái giao diện (không lưu vào DB): chọn đối tượng, bộ lọc, modal, bong bóng lời nói, ca ngày/đêm...
import { useSyncExternalStore } from 'react';

function createStore(initial) {
  let state = initial;
  const ls = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      ls.forEach((l) => l());
    },
    subscribe(fn) {
      ls.add(fn);
      return () => ls.delete(fn);
    },
  };
}

const read = (k, d) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* trình duyệt chặn storage */
  }
};

export const ui = createStore({
  selection: null, // { id: 'ZONE-03', at } — loại suy ra từ tiền tố id
  packageFilter: 'ALL',
  modal: null, // 'schedule' | 'safety' | 'data' | null
  dock: 'zones',
  theme: read('ctao.theme', 'auto'),
  night: read('ctao.night', '0') === '1',
  labels: read('ctao.labels', '0') === '1',
  tour: false,
  bubbles: {}, // workerId → câu nói
  doing: {}, // workerId → mô tả hành vi hiện tại
  activities: [], // { id, time, actorId, text }
  paused: false,
});

export const select = (id) => ui.set({ selection: id ? { id, at: Date.now() } : null });
export const openModal = (modal) => ui.set({ modal });
export const setTheme = (theme) => {
  write('ctao.theme', theme);
  ui.set({ theme });
};
export const toggleNight = () => {
  const night = !ui.get().night;
  write('ctao.night', night ? '1' : '0');
  ui.set({ night });
};
export const toggleLabels = () => {
  const labels = !ui.get().labels;
  write('ctao.labels', labels ? '1' : '0');
  ui.set({ labels });
};

let actSeq = 0;
export function logActivity(actorId, text) {
  const item = { id: `ACT-${++actSeq}`, time: new Date(), actorId, text };
  ui.set((s) => ({ activities: [item, ...s.activities].slice(0, 50) }));
}

export function useUI(selector) {
  return useSyncExternalStore(ui.subscribe, () => selector(ui.get()));
}
