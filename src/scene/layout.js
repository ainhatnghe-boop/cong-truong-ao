// ============================================================
//  Bố trí mặt bằng: mạng đường nội bộ (routes.json) → đồ thị tìm đường,
//  điểm làm việc trong hạng mục, hình học tuyến xe chạy.
//  Quy tắc đi lại: hạng mục → điểm "access" (nằm trên đường) → theo đường → access đích → điểm làm việc.
// ============================================================
import { db } from '../store/db.js';

const key = (p) => `${p[0]},${p[1]}`;
let graphCache = null;

/** Đồ thị: đỉnh = điểm của các tuyến (điểm trùng toạ độ được nối với nhau) */
function graph() {
  if (graphCache) return graphCache;
  const nodes = new Map(); // key → { p, nb: Map(key → dist) }
  const edges = [];
  const add = (p) => {
    const k = key(p);
    if (!nodes.has(k)) nodes.set(k, { p, nb: new Map() });
    return k;
  };
  const link = (a, b) => {
    const ka = add(a);
    const kb = add(b);
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    nodes.get(ka).nb.set(kb, d);
    nodes.get(kb).nb.set(ka, d);
    edges.push([a, b]);
  };
  for (const r of db.list('routes')) {
    const pts = r.points;
    for (let i = 0; i < pts.length - 1; i++) link(pts[i], pts[i + 1]);
    if (r.loop) link(pts[pts.length - 1], pts[0]);
  }
  graphCache = { nodes, edges };
  return graphCache;
}

/** Hình chiếu gần nhất của p lên mạng đường */
function snap(p) {
  let best = null;
  for (const [a, b] of graph().edges) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2));
    const q = [a[0] + dx * t, a[1] + dz * t];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (!best || d < best.d) best = { q, a, b, d };
  }
  return best;
}

/** Dijkstra trên đồ thị + 2 đỉnh tạm (điểm đầu/cuối đã chiếu lên đường) */
export function roadPath(from, to) {
  const { nodes } = graph();
  const s = snap(from);
  const e = snap(to);
  if (!s || !e) return [to];
  const sameEdge = (key(s.a) === key(e.a) && key(s.b) === key(e.b)) || (key(s.a) === key(e.b) && key(s.b) === key(e.a));
  if (sameEdge) return [s.q, e.q];
  const dist = new Map();
  const prev = new Map();
  const S = '__s';
  const E = '__e';
  const nb = (k) => {
    if (k === S) return [[key(s.a), Math.hypot(s.q[0] - s.a[0], s.q[1] - s.a[1])], [key(s.b), Math.hypot(s.q[0] - s.b[0], s.q[1] - s.b[1])]];
    const out = [...(nodes.get(k)?.nb ?? [])];
    if (k === key(e.a)) out.push([E, Math.hypot(e.q[0] - e.a[0], e.q[1] - e.a[1])]);
    if (k === key(e.b)) out.push([E, Math.hypot(e.q[0] - e.b[0], e.q[1] - e.b[1])]);
    return out;
  };
  const open = new Set([S]);
  dist.set(S, 0);
  while (open.size) {
    let u = null;
    for (const k of open) if (u === null || dist.get(k) < dist.get(u)) u = k;
    open.delete(u);
    if (u === E) break;
    for (const [v, w] of nb(u)) {
      const d = dist.get(u) + w;
      if (d < (dist.get(v) ?? Infinity)) {
        dist.set(v, d);
        prev.set(v, u);
        open.add(v);
      }
    }
  }
  const out = [];
  for (let k = E; k && k !== S; k = prev.get(k)) out.unshift(k === E ? e.q : nodes.get(k).p);
  out.unshift(s.q);
  return out;
}

const rand = (a, b) => a + Math.random() * (b - a);

/** Điểm làm việc trong hạng mục: ưu tiên workSpots khai báo; nếu không thì trên cạnh gần đường nhất */
export function spotIn(zone) {
  if (zone.workSpots?.length) {
    const s = zone.workSpots[Math.floor(Math.random() * zone.workSpots.length)];
    return { x: s[0] + rand(-0.3, 0.3), z: s[1] + rand(-0.3, 0.3) };
  }
  const [cx, cz] = zone.center;
  const hw = zone.size[0] / 2;
  const hd = zone.size[1] / 2;
  const dx = (zone.access[0] - cx) / hw;
  const dz = (zone.access[1] - cz) / hd;
  if (Math.abs(dz) >= Math.abs(dx)) return { x: cx + rand(-hw * 0.75, hw * 0.75), z: cz + Math.sign(dz) * (hd - 0.6) };
  return { x: cx + Math.sign(dx) * (hw - 0.6), z: cz + rand(-hd * 0.75, hd * 0.75) };
}

/** Lộ trình đi bộ từ vị trí hiện tại (trong hạng mục fromZone) tới điểm spot trong hạng mục toZone */
export function walkPath(pos, fromZone, toZone, spot) {
  const pts = [];
  const start = fromZone ? fromZone.access : [pos.x, pos.z];
  if (fromZone) pts.push({ x: start[0], z: start[1] });
  if (!fromZone || fromZone.id !== toZone.id) {
    for (const q of roadPath(start, toZone.access)) pts.push({ x: q[0], z: q[1] });
    pts.push({ x: toZone.access[0], z: toZone.access[1] });
  }
  pts.push(spot);
  return pts;
}

/** Hình học tuyến xe: danh sách đoạn + chiều dài luỹ kế (dùng cho xe chạy theo tuyến) */
export function routeGeometry(route) {
  const pts = route.loop ? [...route.points, route.points[0]] : route.points;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, length: cum[cum.length - 1], loop: !!route.loop };
}

/** Vị trí & hướng trên tuyến tại quãng đường s */
export function pointAt(geo, s) {
  let d = s;
  let dir = 1;
  if (geo.loop) d = ((s % geo.length) + geo.length) % geo.length;
  else {
    const m = s % (geo.length * 2);
    if (m > geo.length) {
      d = geo.length * 2 - m;
      dir = -1;
    } else d = m;
  }
  let i = 1;
  while (i < geo.cum.length - 1 && geo.cum[i] < d) i++;
  const a = geo.pts[i - 1];
  const b = geo.pts[i];
  const seg = geo.cum[i] - geo.cum[i - 1] || 1;
  const t = (d - geo.cum[i - 1]) / seg;
  const x = a[0] + (b[0] - a[0]) * t;
  const z = a[1] + (b[1] - a[1]) * t;
  const rot = Math.atan2((b[0] - a[0]) * dir, (b[1] - a[1]) * dir);
  return { x, z, rot };
}
