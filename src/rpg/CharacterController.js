// ============================================================
//  CollisionWorld + CharacterController (third-person, BƯỚC THỜI GIAN CỐ ĐỊNH → không phụ thuộc FPS)
//  - Vật cản: hộp xoay của mọi đối tượng (công trình, máy, công trình phụ trợ) — không xuyên tường/máy
//  - Bề mặt đi được: đường, mặt bằng, sàn thấp (≤ STEP), cầu thang (dốc theo bậc)
//  - Hàng rào = đoạn thẳng theo ranh giới, chừa lối CỔNG; không ra khỏi bản đồ; không xuống nước
//  - Vùng an toàn chưa được phép = ranh giới cứng (chỉ cho phép đi RA, không cho đi VÀO)
// ============================================================
import { getType } from '../engine/ObjectRegistry.js';
import { localBox } from '../engine/ParametricGeometryEngine.js';
import { worldMap, rotY } from '../engine/PlacementSystem.js';
import { sample } from '../engine/TerrainEngine.js';
import { signedDistance } from './SafetyZoneSystem.js';

export const RADIUS = 0.35;
export const STEP = 0.5; // độ cao bậc tối đa leo được (m)
export const FIXED_DT = 1 / 60;
const WALK = 2.4;
const RUN = 5.2;
const JUMP_V0 = 3.6; // m/s — đỉnh nhảy ≈ 0,46 m
const GRAVITY = 14; // m/s²
const CELL = 10;
const GATE_GAP = 5; // nửa bề rộng lối cổng (m)
const WALKABLE_TYPES = new Set(['civil.road', 'civil.pad', 'structure.slab', 'civil.drain', 'civil.manhole', 'structure.stair']);

function obbFromNode(node, w) {
  const b = localBox(node);
  if (!b) return null;
  const [cx, cz] = rotY((b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2, w.ry);
  return { id: node.id, cx: w.p[0] + cx, cz: w.p[2] + cz, hx: (b.max[0] - b.min[0]) / 2, hz: (b.max[2] - b.min[2]) / 2, ry: w.ry, top: w.p[1] + b.max[1], base: w.p[1], node };
}

export class CollisionWorld {
  constructor(world) {
    this.world = world;
    this.t = world.doc.site.terrain;
    this.obstacles = [];
    this.surfaces = [];
    this.segments = [];
    const worlds = worldMap(world.doc);
    for (const node of Object.values(world.doc.nodes)) {
      if (node.hidden || getType(node.type)?.container) continue;
      const o = obbFromNode(node, worlds[node.id]);
      if (!o) continue;
      const ground = sample(this.t, o.cx, o.cz);
      if (WALKABLE_TYPES.has(node.type) || o.top - ground <= STEP) {
        o.stair = node.type === 'structure.stair';
        o.walkTop = Math.max(ground, o.top);
        this.surfaces.push(o);
      } else this.obstacles.push(o);
    }
    for (const f of world.facilities) {
      if (f.kind === 'gate') {
        // ki-ốt cạnh lối cổng
        this.obstacles.push({ id: 'F-gate', cx: f.x, cz: f.z, hx: 1.1, hz: 1.1, ry: f.ry, top: f.y + 2.6, base: f.y });
        continue;
      }
      this.obstacles.push({ id: `F-${f.kind}`, cx: f.x, cz: f.z, hx: f.size[0] / 2, hz: f.size[1] / 2, ry: f.ry, top: f.y + 3, base: f.y, facility: f.kind });
    }
    // hàng rào theo ranh giới, chừa lối cổng
    const b = world.boundary;
    const g = world.gate;
    for (let i = 0; i < b.length; i++) {
      const a = b[i];
      const c = b[(i + 1) % b.length];
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const ux = (c[0] - a[0]) / L;
      const uz = (c[1] - a[1]) / L;
      const tg = (g.x - a[0]) * ux + (g.z - a[1]) * uz;
      const off = Math.abs((g.x - a[0]) * uz - (g.z - a[1]) * ux);
      if (off < 0.5 && tg > 0 && tg < L) {
        this.segments.push([a, [a[0] + ux * (tg - GATE_GAP), a[1] + uz * (tg - GATE_GAP)]]);
        this.segments.push([[a[0] + ux * (tg + GATE_GAP), a[1] + uz * (tg + GATE_GAP)], c]);
      } else this.segments.push([a, c]);
    }
    // lưới không gian
    this.grid = new Map();
    const add = (key, item) => (this.grid.get(key) ?? this.grid.set(key, []).get(key)).push(item);
    for (const o of [...this.obstacles, ...this.surfaces]) {
      const r = Math.hypot(o.hx, o.hz);
      for (let i = Math.floor((o.cx - r) / CELL); i <= Math.floor((o.cx + r) / CELL); i++) for (let j = Math.floor((o.cz - r) / CELL); j <= Math.floor((o.cz + r) / CELL); j++) add(`${i},${j}`, o);
    }
    for (const s of this.segments) {
      const n = Math.ceil(Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) / (CELL / 2));
      for (let k = 0; k <= n; k++) {
        const x = s[0][0] + ((s[1][0] - s[0][0]) * k) / n;
        const z = s[0][1] + ((s[1][1] - s[0][1]) * k) / n;
        add(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`, { seg: s });
      }
    }
    this.halfW = world.doc.site.width / 2 - 1;
    this.halfD = world.doc.site.depth / 2 - 1;
  }

  near(x, z) {
    const out = new Set();
    const i0 = Math.floor(x / CELL);
    const j0 = Math.floor(z / CELL);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const o of this.grid.get(`${i},${j}`) ?? []) out.add(o);
    return out;
  }

  /** Cao độ mặt đi lại tại (x, z) */
  groundAt(x, z) {
    let y = sample(this.t, x, z);
    for (const o of this.near(x, z)) {
      if (o.seg || !o.walkTop) continue;
      const [lx, lz] = rotY(x - o.cx, z - o.cz, -o.ry);
      if (Math.abs(lx) > o.hx || Math.abs(lz) > o.hz) continue;
      if (o.stair) y = Math.max(y, o.base + (o.walkTop - o.base) * Math.min(1, Math.max(0, (lz + o.hz) / (2 * o.hz))));
      else y = Math.max(y, o.walkTop);
    }
    return y;
  }

  isWater(x, z) {
    return this.t.water != null && sample(this.t, x, z) < this.t.water + 0.15;
  }

  inBounds(x, z) {
    return Math.abs(x) <= this.halfW && Math.abs(z) <= this.halfD && !this.isWater(x, z);
  }

  /** Đẩy hình tròn (x,z,r) ra khỏi vật cản; trả về vị trí đã hiệu chỉnh */
  resolve(x, z, r = RADIUS) {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const o of this.near(x, z)) {
        if (o.seg) {
          const [a, b] = o.seg;
          const dx = b[0] - a[0];
          const dz = b[1] - a[1];
          const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
          const px = a[0] + dx * t;
          const pz = a[1] + dz * t;
          const d = Math.hypot(x - px, z - pz);
          if (d < r) {
            const nx = d > 1e-6 ? (x - px) / d : -dz / Math.hypot(dx, dz);
            const nz = d > 1e-6 ? (z - pz) / d : dx / Math.hypot(dx, dz);
            x = px + nx * r;
            z = pz + nz * r;
            moved = true;
          }
          continue;
        }
        if (o.walkTop) continue;
        const [lx, lz] = rotY(x - o.cx, z - o.cz, -o.ry);
        const qx = Math.max(-o.hx, Math.min(o.hx, lx));
        const qz = Math.max(-o.hz, Math.min(o.hz, lz));
        let dx = lx - qx;
        let dz = lz - qz;
        let d = Math.hypot(dx, dz);
        if (d >= r) continue;
        let nlx;
        let nlz;
        if (d < 1e-6) {
          // tâm nằm trong hộp → đẩy ra theo mặt gần nhất
          const ex = o.hx - Math.abs(lx);
          const ez = o.hz - Math.abs(lz);
          if (ex < ez) {
            nlx = Math.sign(lx || 1) * (o.hx + r);
            nlz = lz;
          } else {
            nlx = lx;
            nlz = Math.sign(lz || 1) * (o.hz + r);
          }
        } else {
          nlx = qx + (dx / d) * r;
          nlz = qz + (dz / d) * r;
        }
        const [wx, wz] = rotY(nlx, nlz, o.ry);
        x = o.cx + wx;
        z = o.cz + wz;
        moved = true;
      }
      if (!moved) break;
    }
    return [x, z];
  }

  /** Điểm (x,z) có va chạm vật cản trong bán kính r */
  blockedAt(x, z, r = RADIUS) {
    for (const o of this.near(x, z)) {
      if (o.seg) {
        const [a, b] = o.seg;
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
        if (Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)) < r) return true;
        continue;
      }
      if (o.walkTop) continue;
      const [lx, lz] = rotY(x - o.cx, z - o.cz, -o.ry);
      const dx = Math.max(Math.abs(lx) - o.hx, 0);
      const dz = Math.max(Math.abs(lz) - o.hz, 0);
      if (Math.hypot(dx, dz) < r) return true;
    }
    return !this.inBounds(x, z);
  }
}

/** Trạng thái nhân vật */
export function createCharacter(spawn, groundY) {
  return { x: spawn.x, z: spawn.z, y: groundY, yaw: spawn.yaw ?? 0, vx: 0, vz: 0, vy: 0, grounded: true, speed: 0, anim: 'idle', acc: 0 };
}

/**
 * Một bước mô phỏng cố định. input: { f (tiến -1..1), r (phải -1..1), run, jump }, camYaw: hướng camera.
 * zonesBlocked: danh sách vùng đang chặn (từ SafetyZoneSystem.blockingZones).
 * Nhảy: chỉ bật khi đang đứng trên bề mặt hợp lệ (không phải đang bay/rơi, không phải dưới nước). Trong lúc
 * bay, va chạm ngang (tường, rào, vùng chưa được phép) vẫn được kiểm tra như bình thường — không thể nhảy
 * xuyên vật thể hay nhảy qua ranh giới vùng an toàn.
 */
export function stepCharacter(c, input, camYaw, cw, zonesBlocked, dt = FIXED_DT) {
  let ix = input.r;
  let iz = -input.f;
  const len = Math.hypot(ix, iz);
  if (len > 1) {
    ix /= len;
    iz /= len;
  }
  // hướng camera: tiến = hướng camera nhìn
  const [wx, wz] = rotY(ix, iz, camYaw);
  const vmax = input.run ? RUN : WALK;
  const k = Math.min(1, dt * 12);
  c.vx += (wx * vmax - c.vx) * k;
  c.vz += (wz * vmax - c.vz) * k;
  if (Math.hypot(c.vx, c.vz) < 0.02 && len < 0.01) {
    c.vx = 0;
    c.vz = 0;
  }
  const tryMove = (nx, nz) => {
    let [x, z] = cw.resolve(nx, nz);
    if (!cw.inBounds(x, z)) return null;
    if (cw.blockedAt(x, z, RADIUS * 0.9)) return null;
    const gy = cw.groundAt(x, z);
    if (gy - c.y > STEP + 0.05) return null; // bậc quá cao
    for (const zone of zonesBlocked) {
      const dNew = signedDistance(zone.shape, x, z);
      if (dNew >= RADIUS) continue;
      const dOld = signedDistance(zone.shape, c.x, c.z);
      if (dNew < dOld - 1e-6) return null; // chỉ cho phép đi ra, không cho đi sâu vào
    }
    return [x, z, gy];
  };
  const nx = c.x + c.vx * dt;
  const nz = c.z + c.vz * dt;
  const res = tryMove(nx, nz) ?? tryMove(nx, c.z) ?? tryMove(c.x, nz);
  let groundY;
  if (res) {
    const [x, z, gy] = res;
    c.speed = Math.hypot(x - c.x, z - c.z) / dt;
    c.x = x;
    c.z = z;
    groundY = gy;
  } else {
    c.speed = 0;
    c.vx = 0;
    c.vz = 0;
    groundY = cw.groundAt(c.x, c.z);
  }
  if (c.speed > 0.15) {
    const target = Math.atan2(c.vx, c.vz);
    let d = target - c.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    c.yaw += d * Math.min(1, dt * 12);
  }
  // chiều đứng: đang bay (vy>0 hoặc còn trên mặt đất) → đạn đạo trọng lực; bình thường → bám mặt đất mượt như cũ
  if (c.vy > 0 || c.y > groundY + 0.02) {
    c.vy -= GRAVITY * dt;
    c.y += c.vy * dt;
    if (c.y <= groundY) {
      c.y = groundY;
      c.vy = 0;
    }
  } else {
    c.vy = 0;
    c.y += (groundY - c.y) * Math.min(1, dt * 20);
    if (input.jump && !cw.isWater(c.x, c.z)) c.vy = JUMP_V0;
  }
  c.grounded = c.vy === 0 && c.y <= groundY + 0.02;
  c.anim = !c.grounded ? 'jump' : c.speed > 3.4 ? 'run' : c.speed > 0.3 ? 'walk' : c.anim === 'interact' ? 'interact' : 'idle';
  return c;
}
