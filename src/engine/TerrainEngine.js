// ============================================================
//  TerrainEngine — địa hình dạng lưới cao độ (heightmap) chia CHUNK.
//  - Kích thước bản đồ tuỳ chỉnh; cỡ ô tự chọn để số đỉnh ≤ ~257×257 (bản đồ lớn vẫn nhẹ).
//  - Mỗi chunk = CHUNK×CHUNK ô, dựng thành 1 mesh riêng → chỉ dựng lại chunk bị sửa,
//    three.js tự loại chunk ngoài khung nhìn (frustum culling).
//  - Công cụ: nâng, hạ, san phẳng về cao độ, làm mịn. Tính khối lượng đào/đắp so với địa hình gốc.
// ============================================================
export const CHUNK = 32;

export const TERRAIN_TYPES = [
  { id: 'flat', label: 'Đất bằng' },
  { id: 'hills', label: 'Đồi núi' },
  { id: 'coastal', label: 'Ven biển' },
  { id: 'river', label: 'Sông nước' },
  { id: 'industrial', label: 'Đất công nghiệp (đã san nền)' },
  { id: 'urban', label: 'Đất đô thị' },
  { id: 'custom', label: 'Tuỳ chỉnh (bằng phẳng, tự tạo hình)' },
];

export const SITE_SHAPES = [
  { id: 'rect', label: 'Chữ nhật' },
  { id: 'L', label: 'Chữ L' },
  { id: 'trapezoid', label: 'Hình thang' },
  { id: 'free', label: 'Không ranh giới (toàn bản đồ)' },
];

/** Cỡ ô (m) phù hợp với kích thước bản đồ */
export function cellFor(width, depth) {
  return Math.max(1, Math.ceil(Math.max(width, depth) / 256));
}

function rng(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Tạo địa hình ban đầu. Trả về { cell, nx, nz, heights: Float32Array, water } */
export function generateTerrain({ width, depth, type, seed = 7 }) {
  const cell = cellFor(width, depth);
  const nx = Math.ceil(width / cell);
  const nz = Math.ceil(depth / cell);
  const h = new Float32Array((nx + 1) * (nz + 1));
  const r = rng(seed);
  const waves = Array.from({ length: 6 }, () => ({ fx: 0.5 + r() * 3, fz: 0.5 + r() * 3, ph: r() * 6.28, amp: r() }));
  let water = null;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const u = i / nx; // 0..1 (Tây → Đông)
      const v = j / nz; // 0..1 (Bắc → Nam)
      let y = 0;
      if (type === 'hills') {
        for (const w of waves) y += Math.sin(u * w.fx * 6.28 + w.ph) * Math.cos(v * w.fz * 6.28 + w.ph) * w.amp * 4;
        y += 3;
      } else if (type === 'coastal') {
        y = Math.min(2, (v - 0.25) * 14) + Math.sin(u * 9 + waves[0].ph) * 0.3;
        water = 0;
      } else if (type === 'river') {
        const cx = 0.5 + Math.sin(v * 5 + waves[1].ph) * 0.08;
        const d = Math.abs(u - cx);
        y = d < 0.06 ? -3 : d < 0.1 ? -3 + ((d - 0.06) / 0.04) * 4.5 : 1.5;
        water = 0;
      } else if (type === 'industrial') y = 0.6 + Math.sin(u * 40) * Math.cos(v * 40) * 0.03;
      else if (type === 'urban') y = 0.3;
      h[j * (nx + 1) + i] = y;
    }
  }
  return { type, cell, nx, nz, heights: h, base: h.slice(), water };
}

export const idx = (t, i, j) => j * (t.nx + 1) + i;
const ox = (t) => (-t.nx * t.cell) / 2;
const oz = (t) => (-t.nz * t.cell) / 2;

/** Cao độ tại (x, z) — nội suy song tuyến */
export function sample(t, x, z) {
  if (!t) return 0;
  const fx = Math.min(t.nx, Math.max(0, (x - ox(t)) / t.cell));
  const fz = Math.min(t.nz, Math.max(0, (z - oz(t)) / t.cell));
  const i = Math.min(t.nx - 1, Math.floor(fx));
  const j = Math.min(t.nz - 1, Math.floor(fz));
  const a = fx - i;
  const b = fz - j;
  const H = t.heights;
  const h00 = H[idx(t, i, j)];
  const h10 = H[idx(t, i + 1, j)];
  const h01 = H[idx(t, i, j + 1)];
  const h11 = H[idx(t, i + 1, j + 1)];
  return h00 * (1 - a) * (1 - b) + h10 * a * (1 - b) + h01 * (1 - a) * b + h11 * a * b;
}

export function chunkCount(t) {
  return [Math.ceil(t.nx / CHUNK), Math.ceil(t.nz / CHUNK)];
}

/**
 * Áp bút địa hình lên mảng heights (sửa tại chỗ). Trả về tập chunk bị ảnh hưởng.
 * mode: 'raise' | 'lower' | 'flatten' | 'smooth'
 */
export function applyBrush(t, { x, z, radius, strength, mode, target = 0 }) {
  const dirty = new Set();
  const i0 = Math.max(0, Math.floor((x - radius - ox(t)) / t.cell));
  const i1 = Math.min(t.nx, Math.ceil((x + radius - ox(t)) / t.cell));
  const j0 = Math.max(0, Math.floor((z - radius - oz(t)) / t.cell));
  const j1 = Math.min(t.nz, Math.ceil((z + radius - oz(t)) / t.cell));
  const H = t.heights;
  const src = mode === 'smooth' ? H.slice() : H;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const px = ox(t) + i * t.cell;
      const pz = oz(t) + j * t.cell;
      const d = Math.hypot(px - x, pz - z);
      if (d > radius) continue;
      const w = 0.5 + 0.5 * Math.cos((Math.PI * d) / radius); // mép mềm
      const k = idx(t, i, j);
      if (mode === 'raise') H[k] += strength * w;
      else if (mode === 'lower') H[k] -= strength * w;
      else if (mode === 'flatten') H[k] += (target - H[k]) * Math.min(1, strength * w);
      else if (mode === 'smooth') {
        let s = 0;
        let n = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const ii = i + di;
            const jj = j + dj;
            if (ii < 0 || jj < 0 || ii > t.nx || jj > t.nz) continue;
            s += src[idx(t, ii, jj)];
            n++;
          }
        H[k] += (s / n - H[k]) * Math.min(1, strength * w);
      }
      H[k] = Math.max(-40, Math.min(120, H[k]));
      // một đỉnh có thể thuộc tới 4 chunk
      for (const ci of [Math.floor((i - 1) / CHUNK), Math.floor(i / CHUNK)])
        for (const cj of [Math.floor((j - 1) / CHUNK), Math.floor(j / CHUNK)]) if (ci >= 0 && cj >= 0) dirty.add(`${ci},${cj}`);
    }
  }
  return dirty;
}

/** Khối lượng đào / đắp (m³) so với địa hình gốc */
export function earthwork(t) {
  let cut = 0;
  let fill = 0;
  const a = t.cell * t.cell;
  for (let k = 0; k < t.heights.length; k++) {
    const d = t.heights[k] - t.base[k];
    if (d > 0) fill += d * a;
    else cut -= d * a;
  }
  return { cut, fill };
}

/** Dựng dữ liệu hình học cho 1 chunk: { positions, colors, indices } */
export function chunkGeometry(t, ci, cj) {
  const i0 = ci * CHUNK;
  const j0 = cj * CHUNK;
  const i1 = Math.min(t.nx, i0 + CHUNK);
  const j1 = Math.min(t.nz, j0 + CHUNK);
  const w = i1 - i0 + 1;
  const d = j1 - j0 + 1;
  const pos = new Float32Array(w * d * 3);
  const col = new Float32Array(w * d * 3);
  let p = 0;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const y = t.heights[idx(t, i, j)];
      pos[p] = ox(t) + i * t.cell;
      pos[p + 1] = y;
      pos[p + 2] = oz(t) + j * t.cell;
      const c = colorFor(t, y, t.heights[idx(t, i, j)] - t.base[idx(t, i, j)]);
      col[p] = c[0];
      col[p + 1] = c[1];
      col[p + 2] = c[2];
      p += 3;
    }
  }
  const ind = [];
  for (let j = 0; j < d - 1; j++)
    for (let i = 0; i < w - 1; i++) {
      const a = j * w + i;
      ind.push(a, a + w, a + 1, a + 1, a + w, a + w + 1);
    }
  return { positions: pos, colors: col, indices: ind, w, d };
}

/** Màu theo cao độ & mức đào đắp (đất đào lộ màu nâu) */
function colorFor(t, y, dh) {
  if (Math.abs(dh) > 0.15) return dh < 0 ? [0.55, 0.42, 0.3] : [0.62, 0.52, 0.38];
  if (t.water != null && y < t.water + 0.4) return [0.78, 0.72, 0.58];
  if (t.type === 'industrial' || t.type === 'urban') return [0.66, 0.65, 0.62];
  if (y > 8) return [0.45, 0.52, 0.36];
  return [0.48, 0.6, 0.37];
}

/** Ranh giới khu đất theo hình dạng (đa giác x,z) */
export function boundaryFor(shape, width, depth) {
  const W = width * 0.46;
  const D = depth * 0.46;
  if (shape === 'L')
    return [
      [-W, -D],
      [W, -D],
      [W, 0],
      [0, 0],
      [0, D],
      [-W, D],
    ];
  if (shape === 'trapezoid')
    return [
      [-W * 0.6, -D],
      [W * 0.6, -D],
      [W, D],
      [-W, D],
    ];
  if (shape === 'free') return [];
  return [
    [-W, -D],
    [W, -D],
    [W, D],
    [-W, D],
  ];
}

/** Chuyển heights sang mảng thường để lưu JSON (làm tròn 2 chữ số) */
export const packHeights = (arr) => Array.from(arr, (v) => Math.round(v * 100) / 100);
