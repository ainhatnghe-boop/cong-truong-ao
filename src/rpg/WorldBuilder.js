// ============================================================
//  WorldBuilder — dựng thế giới nhập vai từ cấu hình công trường (sites.json) HOẶC từ dự án Studio.
//  - Dùng CHÍNH engine Studio: createProject (địa hình), ObjectRegistry/sanitizeParams, schema.validate,
//    ParametricGeometryEngine (tiến độ → khối lượng đã làm).
//  - Cổng / văn phòng / kho / bảng HSE / bảng bản vẽ được ĐẶT TỰ ĐỘNG theo ranh giới & địa hình,
//    tránh đối tượng và vùng nước → không có mặt bằng cố định.
// ============================================================
import { createProject } from '../engine/ProjectManager.js';
import { sanitizeParams, defaultParams, getType } from '../engine/ObjectRegistry.js';
import { validate } from '../engine/schema.js';
import { build, localBox } from '../engine/ParametricGeometryEngine.js';
import { sample, boundaryFor } from '../engine/TerrainEngine.js';
import { worldMap, rotY, insidePolygon } from '../engine/PlacementSystem.js';
import { zonesFromObjects, signedDistance } from './SafetyZoneSystem.js';

export const FACILITY_SPECS = {
  gate: { label: 'Cổng & ki-ốt kiểm tra PPE', size: [2.4, 2.4] },
  office: { label: 'Văn phòng chỉ huy', size: [12, 6] },
  drawing: { label: 'Bảng bản vẽ & tiến độ', size: [3, 0.6] },
  warehouse: { label: 'Kho vật tư', size: [14, 8] },
  hseBoard: { label: 'Bảng thông tin HSE', size: [3, 0.6] },
};

/** Đặt tiến độ (0..1) cho một đối tượng: phân bổ tuần tự qua các hoạt động theo khối lượng công */
export function doneForProgress(node, p) {
  const geo = build(node);
  if (!geo) return null;
  let left = Math.max(0, Math.min(1, p)) * geo.totals.work;
  return geo.plan.map((a) => {
    const d = Math.min(a.work, left);
    left -= d;
    return d;
  });
}

/** Tạo doc + sim từ cấu hình công trường */
export function docFromSiteConfig(site) {
  const m = site.map;
  const { doc, sim } = createProject({ name: site.name, company: 'Công trường nhập vai (demo)', category: site.category, width: m.width, depth: m.depth, shape: m.shape, terrain: m.terrain, budget: site.investment * 1000, targetDays: 720, mode: 'simple', seed: m.seed ?? 7 });
  const nodes = {};
  let seq = 0;
  for (const o of site.objects) {
    const T = getType(o.type);
    if (!T) throw new Error(`${site.id}: loại "${o.type}" không có trong ObjectRegistry`);
    seq++;
    const id = `${T.equip ? 'EQ' : 'OBJ'}-${String(seq).padStart(4, '0')}`;
    nodes[id] = {
      id,
      type: o.type,
      name: o.name ?? T.label,
      parentId: null,
      order: seq,
      t: { p: [o.x, sample(doc.site.terrain, o.x, o.z), o.z], ry: o.ry ?? 0 },
      params: sanitizeParams(o.type, { ...defaultParams(o.type), ...(o.params ?? {}) }),
      locked: false,
      hidden: false,
    };
    if (T.gen && o.progress != null) {
      const done = doneForProgress(nodes[id], o.progress);
      sim.nodes[id] = { started: o.progress > 0, order: seq, done, spent: 0, complete: o.progress >= 1 };
    }
  }
  const out = { ...doc, id: `RPG-${site.id}`, nodes, seq };
  const errs = validate(out, sim);
  if (errs.length) throw new Error(`${site.id}: dữ liệu công trường không nhất quán: ${errs[0]}`);
  return { doc: out, sim };
}

// ---------------- đặt công trình phụ trợ tự động ----------------
function objectBoxes(doc) {
  const worlds = worldMap(doc);
  const out = [];
  for (const n of Object.values(doc.nodes)) {
    const b = localBox(n);
    if (!b) continue;
    const w = worlds[n.id];
    const lc = [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];
    const [rx, rz] = rotY(lc[0], lc[1], w.ry);
    out.push({ id: n.id, cx: w.p[0] + rx, cz: w.p[2] + rz, hx: (b.max[0] - b.min[0]) / 2, hz: (b.max[2] - b.min[2]) / 2, ry: w.ry, top: w.p[1] + b.max[1], bottom: w.p[1] + b.min[1] });
  }
  return out;
}

/** Khoảng cách từ điểm tới hộp xoay (âm nếu ở trong) */
export function obbDistance(o, x, z) {
  const [lx, lz] = rotY(x - o.cx, z - o.cz, -o.ry);
  const dx = Math.abs(lx) - o.hx;
  const dz = Math.abs(lz) - o.hz;
  if (dx <= 0 && dz <= 0) return Math.max(dx, dz);
  return Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
}

const dry = (t, x, z) => t.water == null || sample(t, x, z) > t.water + 0.6;

function freeSpot(doc, boxes, boundary, x, z, clearance, placed, keepouts = []) {
  const t = doc.site.terrain;
  const ok = (px, pz) =>
    dry(t, px, pz) &&
    insidePolygon(boundary, px, pz) &&
    boxes.every((b) => obbDistance(b, px, pz) > clearance) &&
    keepouts.every((k) => signedDistance(k, px, pz) > clearance + 3) && // né vùng an toàn của đối tượng (cẩu, hố đào…)
    placed.every((p) => Math.hypot(p.x - px, p.z - pz) > clearance + Math.max(...p.size) / 2) &&
    Math.abs(sample(t, px, pz) - sample(t, px + 3, pz + 3)) < 1.5;
  if (ok(x, z)) return [x, z];
  for (let r = 3; r < 80; r += 3)
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a / 16) * Math.PI * 2) * r;
      const pz = z + Math.sin((a / 16) * Math.PI * 2) * r;
      if (ok(px, pz)) return [px, pz];
    }
  return [x, z];
}

/** Chọn vị trí cổng trên ranh giới: khô ráo, xa công trình, ưu tiên phía Nam (z lớn), gần trục giữa */
function placeGate(doc, boxes, boundary, keepouts = []) {
  const t = doc.site.terrain;
  let best = null;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i];
    const b = boundary[(i + 1) % boundary.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.floor(L / 4));
    // pháp tuyến hướng ra ngoài (đa giác thứ tự bất kỳ → kiểm tra bằng insidePolygon)
    let nx = (b[1] - a[1]) / L;
    let nz = -(b[0] - a[0]) / L;
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    if (insidePolygon(boundary, mx + nx * 2, mz + nz * 2)) {
      nx = -nx;
      nz = -nz;
    }
    for (let k = 1; k < n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n;
      const z = a[1] + ((b[1] - a[1]) * k) / n;
      if (!dry(t, x + nx * 8, z + nz * 8) || !dry(t, x - nx * 8, z - nz * 8)) continue;
      // hai bên lối cổng (dọc hàng rào) cũng phải khô ráo để đặt ki-ốt
      if (!dry(t, x - nz * 8, z + nx * 8) && !dry(t, x + nz * 8, z - nx * 8)) continue;
      if (boxes.some((o) => obbDistance(o, x, z) < 14)) continue;
      if (keepouts.some((k) => signedDistance(k, x, z) < 10)) continue;
      const score = z * 2 - Math.abs(x) * 0.6 - Math.abs(sample(t, x, z)) * 3;
      if (!best || score > best.score) best = { x, z, nx, nz, score };
    }
  }
  return best ?? { x: 0, z: doc.site.depth * 0.46, nx: 0, nz: 1 };
}

/**
 * Dựng thế giới: { doc, sim, boundary, gate, spawn, facilities[], mapRect }
 * delta: tiến độ người chơi đã đóng góp (siteProgress.delta) áp lên sim gốc.
 */
export function assembleWorld(base, delta = {}) {
  const doc = base.doc;
  const boundary = doc.site.boundary?.length ? doc.site.boundary : boundaryFor('rect', doc.site.width, doc.site.depth);
  const sim = { ...base.sim, nodes: { ...base.sim.nodes } };
  for (const [id, done] of Object.entries(delta)) if (doc.nodes[id]) sim.nodes[id] = { ...(sim.nodes[id] ?? { order: 0, spent: 0 }), started: true, done, complete: isComplete(doc.nodes[id], done) };
  const boxes = objectBoxes(doc);
  // vùng an toàn sinh từ đối tượng: công trình phụ trợ & cổng phải nằm NGOÀI để người mới luôn tới được
  const keepouts = zonesFromObjects(doc, sim, base.site).map((z) => z.shape);
  const g = placeGate(doc, boxes, boundary, keepouts);
  const tx = -g.nz; // tiếp tuyến dọc hàng rào
  const tz = g.nx;
  const inX = -g.nx;
  const inZ = -g.nz;
  const facilities = [];
  const put = (kind, x, z, ry, clearance = 4) => {
    const [px, pz] = kind === 'gate' ? [x, z] : freeSpot(doc, boxes, boundary, x, z, clearance, facilities, keepouts);
    facilities.push({ kind, ...FACILITY_SPECS[kind], x: px, z: pz, y: sample(doc.site.terrain, px, pz), ry });
  };
  const faceIn = Math.atan2(g.nx, g.nz); // mặt trước công trình hướng về phía cổng
  // khoảng trống thực có từ cổng ra mép bản đồ theo hướng ra ngoài → điểm xuất hiện luôn nằm TRONG bản đồ
  const hw = doc.site.width / 2 - 1.5;
  const hd = doc.site.depth / 2 - 1.5;
  const room = Math.min(g.nx > 1e-6 ? (hw - g.x) / g.nx : g.nx < -1e-6 ? (-hw - g.x) / g.nx : Infinity, g.nz > 1e-6 ? (hd - g.z) / g.nz : g.nz < -1e-6 ? (-hd - g.z) / g.nz : Infinity);
  const out = Math.max(1.5, Math.min(9, room - 1));
  // ki-ốt đặt cạnh lối cổng, phía khô ráo (thử 2 bên, xa dần)
  const ko = Math.min(3.2, out * 0.55);
  const side = [4.5, -4.5, 7, -7, 10, -10].find((k) => dry(doc.site.terrain, g.x + g.nx * ko + tx * k, g.z + g.nz * ko + tz * k) && dry(doc.site.terrain, g.x + g.nx * (ko + 2) + tx * k, g.z + g.nz * (ko + 2) + tz * k)) ?? 4.5;
  put('gate', g.x + g.nx * ko + tx * side, g.z + g.nz * ko + tz * side, faceIn);
  put('office', g.x + inX * 20 - tx * 18, g.z + inZ * 20 - tz * 18, faceIn, 6);
  put('drawing', g.x + inX * 14 - tx * 8, g.z + inZ * 14 - tz * 8, faceIn, 2.5);
  put('warehouse', g.x + inX * 20 + tx * 20, g.z + inZ * 20 + tz * 20, faceIn, 6);
  put('hseBoard', g.x + inX * 9 + tx * 7, g.z + inZ * 9 + tz * 7, faceIn, 2.5);
  const spawn = { x: g.x + g.nx * out, z: g.z + g.nz * out, yaw: Math.atan2(inX, inZ) };
  return { doc, sim, boundary, gate: { x: g.x, z: g.z, nx: g.nx, nz: g.nz }, spawn, facilities, boxes, mapRect: { w: doc.site.width, d: doc.site.depth } };
}

export function isComplete(node, done) {
  const geo = build(node);
  return !!geo && geo.plan.every((a, k) => (done?.[k] ?? 0) >= a.work - 1e-6);
}
