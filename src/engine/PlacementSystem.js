// ============================================================
//  PlacementSystem — toạ độ thế giới của nút (theo phân cấp), chuyển hệ toạ độ khi đổi nút cha,
//  hộp bao thế giới, bắt dính lưới & bắt dính theo cạnh/tâm đối tượng khác.
//  Quy ước: transform mỗi nút = { p:[x,y,z] cục bộ trong nút cha, ry: góc xoay quanh trục đứng (rad) }.
// ============================================================
import { localBox } from './ParametricGeometryEngine.js';

/** Xoay vector (x,z) quanh trục Y theo quy ước three.js */
export const rotY = (x, z, a) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];

/** Transform thế giới của 1 nút: { p:[x,y,z], ry } */
export function worldOf(doc, id) {
  const chain = [];
  for (let n = doc.nodes[id]; n; n = n.parentId != null ? doc.nodes[n.parentId] : null) chain.unshift(n);
  let p = [0, 0, 0];
  let ry = 0;
  for (const n of chain) {
    const [x, z] = rotY(n.t.p[0], n.t.p[2], ry);
    p = [p[0] + x, p[1] + n.t.p[1], p[2] + z];
    ry += n.t.ry;
  }
  return { p, ry };
}

/** Bảng toạ độ thế giới của mọi nút (tính một lần cho cả cây) */
export function worldMap(doc) {
  const out = {};
  const visit = (n) => {
    if (out[n.id]) return out[n.id];
    const par = n.parentId != null && doc.nodes[n.parentId] ? visit(doc.nodes[n.parentId]) : { p: [0, 0, 0], ry: 0 };
    const [x, z] = rotY(n.t.p[0], n.t.p[2], par.ry);
    out[n.id] = { p: [par.p[0] + x, par.p[1] + n.t.p[1], par.p[2] + z], ry: par.ry + n.t.ry };
    return out[n.id];
  };
  Object.values(doc.nodes).forEach(visit);
  return out;
}

/** Ghép transform cục bộ (trong nút cha parentId) → transform thế giới */
export function composeWorld(doc, parentId, local) {
  if (parentId == null) return { p: [...local.p], ry: local.ry };
  const par = worldOf(doc, parentId);
  const [x, z] = rotY(local.p[0], local.p[2], par.ry);
  return { p: [par.p[0] + x, par.p[1] + local.p[1], par.p[2] + z], ry: par.ry + local.ry };
}

/** Đổi transform thế giới → transform cục bộ trong nút cha parentId */
export function toLocal(doc, parentId, world) {
  if (parentId == null) return { p: [...world.p], ry: world.ry };
  const par = worldOf(doc, parentId);
  const [x, z] = rotY(world.p[0] - par.p[0], world.p[2] - par.p[2], -par.ry);
  return { p: [x, world.p[1] - par.p[1], z], ry: world.ry - par.ry };
}

/** Hộp bao thế giới (AABB theo phương ngang + cao độ) */
export function worldBox(node, world) {
  const b = localBox(node);
  if (!b) return null;
  const xs = [];
  const zs = [];
  for (const x of [b.min[0], b.max[0]])
    for (const z of [b.min[2], b.max[2]]) {
      const [rx, rz] = rotY(x, z, world.ry);
      xs.push(world.p[0] + rx);
      zs.push(world.p[2] + rz);
    }
  return { min: [Math.min(...xs), world.p[1] + b.min[1], Math.min(...zs)], max: [Math.max(...xs), world.p[1] + b.max[1], Math.max(...zs)] };
}

export const snapGrid = (v, size) => Math.round(v / size) * size;

/**
 * Bắt dính theo đối tượng khác: căn cạnh trái/phải/tâm (x) và trước/sau/tâm (z) trong ngưỡng thr (m).
 * Trả về vị trí thế giới đã hiệu chỉnh [x, z] và danh sách id được dính.
 */
export function snapToObjects(doc, node, world, thr = 1.5, worlds = worldMap(doc)) {
  const me = worldBox(node, world);
  if (!me) return { x: world.p[0], z: world.p[2], hits: [] };
  let best = [null, null];
  const hits = new Set();
  for (const o of Object.values(doc.nodes)) {
    if (o.id === node.id || o.hidden) continue;
    const ob = worldBox(o, worlds[o.id]);
    if (!ob) continue;
    for (const ax of [0, 2]) {
      const mine = [me.min[ax], me.max[ax], (me.min[ax] + me.max[ax]) / 2];
      const theirs = [ob.min[ax], ob.max[ax], (ob.min[ax] + ob.max[ax]) / 2];
      for (const a of mine)
        for (const b of theirs) {
          const d = b - a;
          const k = ax === 0 ? 0 : 1;
          if (Math.abs(d) < thr && (best[k] === null || Math.abs(d) < Math.abs(best[k].d))) best[k] = { d, id: o.id };
        }
    }
  }
  if (best[0]) hits.add(best[0].id);
  if (best[1]) hits.add(best[1].id);
  return { x: world.p[0] + (best[0]?.d ?? 0), z: world.p[2] + (best[1]?.d ?? 0), hits: [...hits] };
}

/** Điểm có nằm trong đa giác ranh giới */
export function insidePolygon(poly, x, z) {
  if (!poly?.length) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
