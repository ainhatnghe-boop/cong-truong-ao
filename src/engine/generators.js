// ============================================================
//  Bộ sinh hình học theo tham số (procedural / parametric).
//  Mỗi generator: (params) → { parts, acts }
//    part = { g: 'b'|'c'|'k' (hộp | trụ | nón), p:[x,y,z] tâm cục bộ, s:[sx,sy,sz], r?:[rx,ry,rz], m: vật liệu, a: chỉ số hoạt động }
//    acts = [{ label, skill }]  — trình tự thi công của đối tượng (a = 0, 1, 2…)
//  Gốc toạ độ cục bộ: tâm đáy đối tượng (y = 0 là cao độ đặt). Trục dài mặc định theo X.
//  Thứ tự part trong cùng hoạt động = thứ tự hiện ra khi thi công (nên xếp từ dưới lên).
//  KHÔNG phải tính toán kết cấu: hình học chỉ phục vụ gameplay.
// ============================================================
const PI = Math.PI;

class Out {
  constructor() {
    this.parts = [];
  }
  box(a, m, x, y, z, sx, sy, sz, r) {
    if (sx > 0 && sy > 0 && sz > 0) this.parts.push({ g: 'b', a, m, p: [x, y, z], s: [sx, sy, sz], r });
  }
  cyl(a, m, x, y, z, d, h, r) {
    if (d > 0 && h > 0) this.parts.push({ g: 'c', a, m, p: [x, y, z], s: [d, h, d], r });
  }
  cone(a, m, x, y, z, d, h) {
    if (d > 0 && h > 0) this.parts.push({ g: 'k', a, m, p: [x, y, z], s: [d, h, d] });
  }
}

/** Chia đoạn L thành n nhịp gần với bước mong muốn; trả về toạ độ các trục (tâm tại 0) */
export function gridLines(L, step) {
  const n = Math.max(1, Math.round(L / Math.max(0.5, step)));
  return Array.from({ length: n + 1 }, (_, i) => -L / 2 + (L / n) * i);
}

// ---------------- Cấu kiện cơ bản ----------------
export const G = {
  footingPad({ length, width, height }) {
    const o = new Out();
    o.box(0, 'leanConcrete', 0, height / 2, 0, length, height, width);
    return { parts: o.parts, acts: [{ label: 'Đào & đổ bê tông móng', skill: 'concrete' }] };
  },
  footingStrip({ length, width, height }) {
    const o = new Out();
    o.box(0, 'leanConcrete', 0, height / 2, 0, length, height, width);
    return { parts: o.parts, acts: [{ label: 'Đổ bê tông móng băng', skill: 'concrete' }] };
  },
  footingRaft({ length, width, height }) {
    const o = new Out();
    for (const x of gridLines(length, 6).slice(0, -1)) {
      const seg = length / Math.max(1, Math.round(length / 6));
      o.box(0, 'leanConcrete', x + seg / 2, height / 2, 0, seg, height, width);
    }
    return { parts: o.parts, acts: [{ label: 'Đổ bê tông móng bè (phân đoạn)', skill: 'concrete' }] };
  },
  footingPile({ rows, cols, spacing, diameter, pileLength, capHeight }) {
    const o = new Out();
    const xs = Array.from({ length: cols }, (_, i) => (i - (cols - 1) / 2) * spacing);
    const zs = Array.from({ length: rows }, (_, i) => (i - (rows - 1) / 2) * spacing);
    for (const z of zs) for (const x of xs) o.cyl(0, 'concrete', x, -pileLength / 2, z, diameter, pileLength);
    o.box(1, 'concrete', 0, capHeight / 2, 0, (cols - 1) * spacing + diameter * 2 + 0.4, capHeight, (rows - 1) * spacing + diameter * 2 + 0.4);
    return { parts: o.parts, acts: [{ label: 'Thi công cọc', skill: 'civil' }, { label: 'Đổ bê tông đài cọc', skill: 'concrete' }] };
  },
  columnConcrete({ width, depth, height }) {
    const o = new Out();
    o.box(0, 'concrete', 0, height / 2, 0, width, height, depth);
    return { parts: o.parts, acts: [{ label: 'Cốp pha, cốt thép, đổ cột', skill: 'concrete' }] };
  },
  columnSteel({ size, height }) {
    const o = new Out();
    const t = Math.max(0.02, size * 0.07);
    o.box(0, 'primer', 0, height / 2, size / 2 - t / 2, size * 0.6, height, t);
    o.box(0, 'primer', 0, height / 2, -size / 2 + t / 2, size * 0.6, height, t);
    o.box(0, 'primer', 0, height / 2, 0, t, height, size - 2 * t);
    return { parts: o.parts, acts: [{ label: 'Lắp dựng cột thép', skill: 'steel' }] };
  },
  beamConcrete({ length, width, height }) {
    const o = new Out();
    o.box(0, 'concrete', 0, height / 2, 0, length, height, width);
    return { parts: o.parts, acts: [{ label: 'Đổ bê tông dầm', skill: 'concrete' }] };
  },
  beamSteel({ length, depth }) {
    const o = new Out();
    const t = Math.max(0.015, depth * 0.06);
    const b = depth * 0.5;
    o.box(0, 'primer', 0, t / 2, 0, length, t, b);
    o.box(0, 'primer', 0, depth / 2, 0, length, depth - 2 * t, t);
    o.box(0, 'primer', 0, depth - t / 2, 0, length, t, b);
    return { parts: o.parts, acts: [{ label: 'Lắp dựng dầm thép', skill: 'steel' }] };
  },
  slab({ length, width, thickness }) {
    const o = new Out();
    o.box(0, 'concrete', 0, thickness / 2, 0, length, thickness, width);
    return { parts: o.parts, acts: [{ label: 'Đổ bê tông sàn', skill: 'concrete' }] };
  },
  wall({ length, thickness, height, material }) {
    const o = new Out();
    const m = material === 'concrete' ? 'concrete' : material === 'glass' ? 'glass' : 'brick';
    o.box(0, m, 0, height / 2, 0, length, height, thickness);
    if (m === 'glass') for (const x of gridLines(length, 1.5)) o.box(0, 'steel', x, height / 2, 0, 0.06, height, thickness + 0.04);
    return { parts: o.parts, acts: [{ label: m === 'glass' ? 'Lắp vách kính' : 'Xây/đổ tường', skill: m === 'concrete' ? 'concrete' : 'envelope' }] };
  },
  roofIndustrial({ length, width, pitch }) {
    const o = new Out();
    const a = (pitch * PI) / 180;
    const half = width / 2;
    const len = half / Math.cos(a) + 0.3;
    const rise = half * Math.tan(a);
    o.box(0, 'roofSheet', 0, rise / 2, half / 2, length, 0.06, len, [a, 0, 0]);
    o.box(0, 'roofSheet', 0, rise / 2, -half / 2, length, 0.06, len, [-a, 0, 0]);
    o.box(0, 'roofSheet', 0, rise + 0.05, 0, length, 0.12, 0.5);
    return { parts: o.parts, acts: [{ label: 'Lợp mái tôn', skill: 'envelope' }] };
  },
  pipe({ length, diameter, elevation, supportSpacing }) {
    const o = new Out();
    for (const x of gridLines(length, supportSpacing)) {
      o.box(0, 'primer', x, elevation / 2, 0, 0.25, elevation, 0.25);
      o.box(0, 'primer', x, elevation - 0.1, 0, 0.3, 0.2, diameter + 0.6);
    }
    o.cyl(1, 'pipe', 0, elevation + diameter / 2, 0, diameter, length, [0, 0, PI / 2]);
    return { parts: o.parts, acts: [{ label: 'Giá đỡ ống', skill: 'steel' }, { label: 'Lắp đặt & hàn ống', skill: 'mep' }] };
  },
  cableTray({ length, width, elevation }) {
    const o = new Out();
    for (const x of gridLines(length, 3)) o.box(0, 'tray', x, elevation / 2, 0, 0.12, elevation, 0.12);
    o.box(1, 'tray', 0, elevation + 0.02, 0, length, 0.04, width);
    o.box(1, 'tray', 0, elevation + 0.08, width / 2, length, 0.12, 0.02);
    o.box(1, 'tray', 0, elevation + 0.08, -width / 2, length, 0.12, 0.02);
    return { parts: o.parts, acts: [{ label: 'Giá đỡ máng', skill: 'steel' }, { label: 'Lắp máng & kéo cáp', skill: 'mep' }] };
  },
  stair({ width, height, steps }) {
    const o = new Out();
    const rise = height / steps;
    const tread = 0.28;
    for (let i = 0; i < steps; i++) o.box(0, 'concrete', 0, (rise * (i + 1)) / 2, -(steps * tread) / 2 + (i + 0.5) * tread, width, rise * (i + 1), tread);
    return { parts: o.parts, acts: [{ label: 'Đổ bê tông cầu thang', skill: 'concrete' }] };
  },
  road({ length, width }) {
    const o = new Out();
    for (const x of gridLines(length, 10).slice(0, -1)) {
      const seg = length / Math.max(1, Math.round(length / 10));
      o.box(0, 'gravel', x + seg / 2, 0.1, 0, seg, 0.2, width + 1);
    }
    for (const x of gridLines(length, 10).slice(0, -1)) {
      const seg = length / Math.max(1, Math.round(length / 10));
      o.box(1, 'asphalt', x + seg / 2, 0.25, 0, seg, 0.1, width);
    }
    for (let x = -length / 2 + 2; x < length / 2 - 2; x += 6) o.box(2, 'paint', x + 1.5, 0.305, 0, 3, 0.01, 0.15);
    return {
      parts: o.parts,
      acts: [
        { label: 'Lu lèn móng cấp phối', skill: 'civil' },
        { label: 'Thảm bê tông nhựa', skill: 'civil' },
        { label: 'Sơn kẻ vạch', skill: 'civil' },
      ],
    };
  },
  sitePad({ length, width, thickness }) {
    const o = new Out();
    o.box(0, 'gravel', 0, thickness / 2, 0, length, thickness, width);
    return { parts: o.parts, acts: [{ label: 'San gạt, lu lèn mặt bằng', skill: 'civil' }] };
  },
  manhole({ size, depth }) {
    const o = new Out();
    const t = 0.2;
    o.box(0, 'concrete', 0, -depth + t / 2, 0, size, t, size);
    o.box(0, 'concrete', 0, -depth / 2, size / 2 - t / 2, size, depth, t);
    o.box(0, 'concrete', 0, -depth / 2, -size / 2 + t / 2, size, depth, t);
    o.box(0, 'concrete', size / 2 - t / 2, -depth / 2, 0, t, depth, size - 2 * t);
    o.box(0, 'concrete', -size / 2 + t / 2, -depth / 2, 0, t, depth, size - 2 * t);
    o.box(1, 'steel', 0, 0.03, 0, size * 0.7, 0.06, size * 0.7);
    return { parts: o.parts, acts: [{ label: 'Đào & đổ thành hố ga', skill: 'civil' }, { label: 'Lắp nắp hố ga', skill: 'civil' }] };
  },
  drain({ length, width, depth }) {
    const o = new Out();
    const t = 0.15;
    o.box(0, 'concrete', 0, -depth + t / 2, 0, length, t, width + 2 * t);
    o.box(0, 'concrete', 0, -depth / 2, width / 2 + t / 2, length, depth, t);
    o.box(0, 'concrete', 0, -depth / 2, -width / 2 - t / 2, length, depth, t);
    return { parts: o.parts, acts: [{ label: 'Đào & đổ mương bê tông', skill: 'civil' }] };
  },
  tank({ diameter, height, roof }) {
    const o = new Out();
    o.cyl(0, 'concrete', 0, 0.3, 0, diameter + 1.2, 0.6);
    const courses = Math.max(1, Math.ceil(height / 2.4));
    const ch = height / courses;
    for (let i = 0; i < courses; i++) o.cyl(1, 'steel', 0, 0.6 + ch * (i + 0.5), 0, diameter, ch);
    if (roof === 'cone') o.cone(2, 'steel', 0, 0.6 + height + diameter * 0.08, 0, diameter + 0.2, diameter * 0.16);
    else if (roof === 'dome') o.cone(2, 'steel', 0, 0.6 + height + diameter * 0.12, 0, diameter + 0.2, diameter * 0.24);
    else o.cyl(2, 'steel', 0, 0.6 + height + 0.05, 0, diameter, 0.1);
    o.box(2, 'primer', diameter / 2 + 0.6, (0.6 + height) / 2, 0, 1.0, 0.6 + height, 1.0);
    return {
      parts: o.parts,
      acts: [
        { label: 'Móng vòng bồn', skill: 'concrete' },
        { label: 'Lắp & hàn thân bồn (theo vành)', skill: 'steel' },
        { label: 'Mái bồn & cầu thang', skill: 'steel' },
      ],
    };
  },
  machineBase({ length, width, height }) {
    const o = new Out();
    o.box(0, 'concrete', 0, height / 2, 0, length, height, width);
    return { parts: o.parts, acts: [{ label: 'Đổ bê tông bệ máy', skill: 'concrete' }] };
  },
  equipRack({ length, width, height, tiers, bay }) {
    const o = new Out();
    const xs = gridLines(length, bay);
    for (const x of xs) {
      o.box(0, 'primer', x, height / 2, width / 2, 0.3, height, 0.3);
      o.box(0, 'primer', x, height / 2, -width / 2, 0.3, height, 0.3);
    }
    for (let t = 1; t <= tiers; t++) {
      const y = (height / tiers) * t;
      for (const x of xs) o.box(1, 'primer', x, y, 0, 0.25, 0.3, width);
      o.box(1, 'primer', 0, y, width / 2, length, 0.25, 0.2);
      o.box(1, 'primer', 0, y, -width / 2, length, 0.25, 0.2);
    }
    return { parts: o.parts, acts: [{ label: 'Cột giá đỡ', skill: 'steel' }, { label: 'Dầm các tầng giá', skill: 'steel' }] };
  },
  mepUnit({ length, width, height }) {
    const o = new Out();
    o.box(0, 'concrete', 0, 0.15, 0, length + 0.6, 0.3, width + 0.6);
    o.box(1, 'mep', 0, 0.3 + height / 2, 0, length, height, width);
    o.box(1, 'insulation', length * 0.25, 0.3 + height + 0.25, 0, length * 0.3, 0.5, width * 0.6);
    return { parts: o.parts, acts: [{ label: 'Bệ thiết bị', skill: 'concrete' }, { label: 'Lắp đặt & đấu nối thiết bị', skill: 'mep' }] };
  },

  // ---------------- Cụm công trình tham số (assembly) ----------------
  /** Toà nhà nhiều tầng: lưới cột theo bước nhịp, sàn/dầm từng tầng, bao che, cơ điện mái */
  building({ floors, floorHeight, lengthX, widthZ, spanX, spanZ, columnSize, slabThickness, facade, foundation }) {
    const o = new Out();
    const xs = gridLines(lengthX, spanX);
    const zs = gridLines(widthZ, spanZ);
    // 0 · móng
    if (foundation === 'pile') {
      for (const x of xs) for (const z of zs) o.cyl(0, 'concrete', x, -9, z, 0.8, 18);
    }
    if (foundation === 'pad') {
      for (const x of xs) for (const z of zs) o.box(0, 'leanConcrete', x, -0.6, z, 2.4, 1.2, 2.4);
    } else o.box(0, 'leanConcrete', 0, -0.6, 0, lengthX + 2, 1.2, widthZ + 2);
    // 1 · kết cấu: từng tầng cột → dầm → sàn
    const t = slabThickness;
    const bh = Math.max(0.4, Math.max(spanX, spanZ) / 14);
    for (let f = 0; f < floors; f++) {
      const y0 = f * floorHeight;
      const ch = floorHeight - t;
      for (const x of xs) for (const z of zs) o.box(1, 'concrete', x, y0 + ch / 2, z, columnSize, ch, columnSize);
      const yb = y0 + floorHeight - t - bh / 2;
      for (const z of zs) for (let i = 0; i < xs.length - 1; i++) o.box(1, 'concrete', (xs[i] + xs[i + 1]) / 2, yb, z, xs[i + 1] - xs[i], bh, columnSize * 0.8);
      for (const x of xs) for (let i = 0; i < zs.length - 1; i++) o.box(1, 'concrete', x, yb, (zs[i] + zs[i + 1]) / 2, columnSize * 0.8, bh, zs[i + 1] - zs[i]);
      o.box(1, 'concrete', 0, y0 + floorHeight - t / 2, 0, lengthX + 0.6, t, widthZ + 0.6);
    }
    // 2 · bao che từng tầng
    if (facade !== 'none') {
      const m = facade === 'glass' ? 'glass' : 'brick';
      const th = m === 'glass' ? 0.06 : 0.2;
      for (let f = 0; f < floors; f++) {
        const y = f * floorHeight + (floorHeight - t) / 2;
        const h = floorHeight - t;
        o.box(2, m, 0, y, widthZ / 2 + 0.25, lengthX + 0.5, h, th);
        o.box(2, m, 0, y, -widthZ / 2 - 0.25, lengthX + 0.5, h, th);
        o.box(2, m, lengthX / 2 + 0.25, y, 0, th, h, widthZ + 0.5);
        o.box(2, m, -lengthX / 2 - 0.25, y, 0, th, h, widthZ + 0.5);
      }
    }
    // 3 · cơ điện & hoàn thiện mái
    const top = floors * floorHeight;
    o.box(3, 'plaster', 0, top + 0.6, widthZ / 2 + 0.15, lengthX + 0.6, 1.2, 0.2);
    o.box(3, 'plaster', 0, top + 0.6, -widthZ / 2 - 0.15, lengthX + 0.6, 1.2, 0.2);
    o.box(3, 'mep', lengthX * 0.2, top + 1.2, 0, Math.min(8, lengthX * 0.3), 2.4, Math.min(5, widthZ * 0.3));
    o.box(3, 'mep', -lengthX * 0.2, top + 0.8, widthZ * 0.15, 3, 1.6, 3);
    return {
      parts: o.parts,
      acts: [
        { label: foundation === 'pile' ? 'Cọc khoan nhồi & móng' : 'Móng', skill: foundation === 'pile' ? 'civil' : 'concrete' },
        { label: 'Kết cấu thân (từng tầng)', skill: 'concrete' },
        { label: 'Bao che mặt ngoài', skill: 'envelope' },
        { label: 'Cơ điện & hoàn thiện mái', skill: 'mep' },
      ],
    };
  },

  /** Nhà khung thép tiền chế nhiều nhịp: móng → khung (cột + kèo) → xà gồ → mái/vách → nền */
  steelShed({ length, width, eaveHeight, bay, pitch, purlinSpacing, cladding }) {
    const o = new Out();
    const a = (pitch * PI) / 180;
    const half = width / 2;
    const rise = half * Math.tan(a);
    const xs = gridLines(length, bay);
    for (const x of xs) {
      o.box(0, 'leanConcrete', x, -0.5, half, 1.8, 1.0, 1.8);
      o.box(0, 'leanConcrete', x, -0.5, -half, 1.8, 1.0, 1.8);
    }
    const rl = half / Math.cos(a);
    for (const x of xs) {
      o.box(1, 'primer', x, eaveHeight / 2, half, 0.3, eaveHeight, 0.5);
      o.box(1, 'primer', x, eaveHeight / 2, -half, 0.3, eaveHeight, 0.5);
      o.box(1, 'primer', x, eaveHeight + rise / 2 + 0.25, half / 2, 0.25, 0.55, rl, [a, 0, 0]);
      o.box(1, 'primer', x, eaveHeight + rise / 2 + 0.25, -half / 2, 0.25, 0.55, rl, [-a, 0, 0]);
    }
    const n = Math.max(1, Math.ceil(half / purlinSpacing));
    for (let k = 0; k <= n; k++) {
      const d = (half / n) * k;
      const y = eaveHeight + 0.6 + (half - d) * Math.tan(a);
      o.box(2, 'steel', 0, y, d, length, 0.18, 0.1);
      if (k > 0) o.box(2, 'steel', 0, y, -d, length, 0.18, 0.1);
    }
    for (let y = 1.5; y < eaveHeight; y += 1.6) {
      o.box(2, 'steel', 0, y, half + 0.3, length, 0.14, 0.08);
      o.box(2, 'steel', 0, y, -half - 0.3, length, 0.14, 0.08);
    }
    const sl = rl + 0.4;
    for (const s of [1, -1]) o.box(3, 'roofSheet', 0, eaveHeight + 0.75 + rise / 2, (s * half) / 2, length + 0.8, 0.06, sl, [s * a, 0, 0]);
    if (cladding) {
      o.box(3, 'roofSheet', 0, eaveHeight / 2, half + 0.4, length + 0.3, eaveHeight, 0.05);
      o.box(3, 'roofSheet', 0, eaveHeight / 2, -half - 0.4, length + 0.3, eaveHeight, 0.05);
      o.box(3, 'roofSheet', length / 2 + 0.2, eaveHeight / 2, 0, 0.05, eaveHeight, width + 0.8);
      o.box(3, 'roofSheet', -length / 2 - 0.2, eaveHeight / 2, 0, 0.05, eaveHeight, width + 0.8);
    }
    for (const x of xs.slice(0, -1)) o.box(4, 'concrete', x + (xs[1] - xs[0]) / 2, 0.1, 0, xs[1] - xs[0], 0.2, width);
    return {
      parts: o.parts,
      acts: [
        { label: 'Móng cột', skill: 'concrete' },
        { label: 'Lắp dựng khung (cột + kèo)', skill: 'steel' },
        { label: 'Xà gồ mái & xà gồ vách', skill: 'steel' },
        { label: 'Lợp mái & bao che vách', skill: 'envelope' },
        { label: 'Đổ nền nhà xưởng', skill: 'concrete' },
      ],
    };
  },

  /** Cầu dầm nhiều nhịp: cọc & bệ → thân trụ → dầm → bản mặt cầu → lan can */
  bridge({ spans, spanLength, deckWidth, pierHeight }) {
    const o = new Out();
    const L = spans * spanLength;
    const xs = Array.from({ length: spans + 1 }, (_, i) => -L / 2 + i * spanLength);
    for (const x of xs) {
      for (const dz of [-deckWidth * 0.3, deckWidth * 0.3]) o.cyl(0, 'concrete', x, -8, dz, 1.0, 16);
      o.box(0, 'concrete', x, 0.75, 0, 3.5, 1.5, deckWidth * 0.9);
    }
    for (const x of xs) {
      o.box(1, 'concrete', x, 1.5 + (pierHeight - 1.5) / 2, 0, 1.8, pierHeight - 1.5, deckWidth * 0.5);
      o.box(1, 'concrete', x, pierHeight + 0.5, 0, 2.2, 1.0, deckWidth);
    }
    const girders = Math.max(2, Math.round(deckWidth / 2.5));
    for (let i = 0; i < spans; i++) {
      for (let g = 0; g < girders; g++) {
        const z = -deckWidth / 2 + (deckWidth / girders) * (g + 0.5);
        o.box(2, 'concrete', xs[i] + spanLength / 2, pierHeight + 1 + 0.8, z, spanLength - 0.4, 1.6, 0.6);
      }
    }
    for (let i = 0; i < spans; i++) o.box(3, 'concrete', xs[i] + spanLength / 2, pierHeight + 2.75, 0, spanLength, 0.3, deckWidth);
    for (const s of [1, -1]) o.box(4, 'concrete', 0, pierHeight + 3.4, (s * deckWidth) / 2 - 0.2, L, 1.0, 0.3);
    return {
      parts: o.parts,
      acts: [
        { label: 'Cọc & bệ trụ', skill: 'civil' },
        { label: 'Thân trụ & xà mũ', skill: 'concrete' },
        { label: 'Lao lắp dầm', skill: 'concrete' },
        { label: 'Bản mặt cầu', skill: 'concrete' },
        { label: 'Lan can & hoàn thiện', skill: 'envelope' },
      ],
    };
  },
};
