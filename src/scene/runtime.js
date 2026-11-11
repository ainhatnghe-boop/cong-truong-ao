// Trạng thái chuyển động — đối tượng mutable, đọc/ghi trong useFrame (không gây re-render React)
import { db } from '../store/db.js';
import { spotIn } from './layout.js';

export const runtime = { workers: {}, vehicles: {} };

export function initRuntime() {
  for (const w of db.list('workers')) {
    if (runtime.workers[w.id]) continue;
    const zone = db.get(w.zoneId);
    const s = spotIn(zone);
    runtime.workers[w.id] = {
      x: s.x,
      z: s.z,
      rot: Math.random() * Math.PI * 2,
      mode: zone.support ? 'stand' : 'work', // 'walk' | 'work' | 'stand' | 'sit'
      path: [],
      zoneId: zone.id,
      arrive: null,
      faceTo: zone.center,
    };
  }
  return runtime;
}

export function sendTo(workerId, path, arrive) {
  const r = runtime.workers[workerId];
  if (!r) return;
  r.path = path.map((p) => ({ ...p }));
  r.mode = 'walk';
  r.arrive = arrive;
  r.zoneId = null;
}

export const isIdle = (id) => runtime.workers[id] && runtime.workers[id].mode !== 'walk';
