// ============================================================
//  NavigationSystem — lưới chiếm chỗ + A* (8 hướng, không cắt góc) + làm mượt đường.
//  Ô bị chặn: vật cản (công trình, máy, hàng rào trừ lối cổng), nước, ngoài bản đồ,
//  và VÙNG AN TOÀN CHƯA ĐƯỢC PHÉP theo quyền hiện tại → tuyến đề xuất không xuyên công trình/vùng cấm.
// ============================================================
import { signedDistance } from './SafetyZoneSystem.js';

const CLEAR = 0.55; // bán kính an toàn khi tính ô trống

export class NavGrid {
  constructor(cw, zonesBlocked = []) {
    const { width, depth } = cw.world.doc.site;
    this.cell = Math.max(1.5, Math.ceil(Math.max(width, depth) / 200));
    this.nx = Math.floor(width / this.cell);
    this.nz = Math.floor(depth / this.cell);
    this.x0 = -width / 2;
    this.z0 = -depth / 2;
    this.blocked = new Uint8Array(this.nx * this.nz);
    for (let j = 0; j < this.nz; j++)
      for (let i = 0; i < this.nx; i++) {
        const [x, z] = this.center(i, j);
        let b = cw.blockedAt(x, z, CLEAR);
        if (!b) for (const zone of zonesBlocked) if (signedDistance(zone.shape, x, z) < CLEAR) b = true;
        this.blocked[j * this.nx + i] = b ? 1 : 0;
      }
  }
  center(i, j) {
    return [this.x0 + (i + 0.5) * this.cell, this.z0 + (j + 0.5) * this.cell];
  }
  cellOf(x, z) {
    return [Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.x0) / this.cell))), Math.min(this.nz - 1, Math.max(0, Math.floor((z - this.z0) / this.cell)))];
  }
  free(i, j) {
    return i >= 0 && j >= 0 && i < this.nx && j < this.nz && !this.blocked[j * this.nx + i];
  }
  /** Ô trống gần nhất (tìm theo vòng) */
  nearestFree(x, z, maxR = 40) {
    const [ci, cj] = this.cellOf(x, z);
    if (this.free(ci, cj)) return [ci, cj];
    let best = null;
    for (let r = 1; r <= maxR; r++) {
      for (let dj = -r; dj <= r; dj++)
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          if (!this.free(ci + di, cj + dj)) continue;
          const [px, pz] = this.center(ci + di, cj + dj);
          const d = Math.hypot(px - x, pz - z);
          if (!best || d < best.d) best = { c: [ci + di, cj + dj], d };
        }
      if (best) return best.c;
    }
    return null;
  }
  lineFree(a, b) {
    const [i0, j0] = this.cellOf(a[0], a[1]);
    const [i1, j1] = this.cellOf(b[0], b[1]);
    const n = Math.max(Math.abs(i1 - i0), Math.abs(j1 - j0)) * 2 || 1;
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n;
      const z = a[1] + ((b[1] - a[1]) * k) / n;
      const [i, j] = this.cellOf(x, z);
      if (!this.free(i, j)) return false;
    }
    return true;
  }
  /** A* từ (sx,sz) tới (tx,tz). Trả về { points:[[x,z]…], length } hoặc null nếu không tới được */
  path(sx, sz, tx, tz) {
    const s = this.nearestFree(sx, sz);
    const t = this.nearestFree(tx, tz);
    if (!s || !t) return null;
    const N = this.nx * this.nz;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const id = (i, j) => j * this.nx + i;
    const h = (i, j) => {
      const dx = Math.abs(i - t[0]);
      const dz = Math.abs(j - t[1]);
      return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
    };
    // hàng đợi ưu tiên (heap nhị phân)
    const heap = [];
    const push = (f, k) => {
      heap.push([f, k]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const sk = id(s[0], s[1]);
    const tk = id(t[0], t[1]);
    g[sk] = 0;
    push(h(s[0], s[1]), sk);
    while (heap.length) {
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === tk) break;
      const i = k % this.nx;
      const j = (k / this.nx) | 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di;
          const nj = j + dj;
          if (!this.free(ni, nj)) continue;
          if (di && dj && (!this.free(i + di, j) || !this.free(i, j + dj))) continue; // không cắt góc
          const nk = id(ni, nj);
          const ng = g[k] + (di && dj ? Math.SQRT2 : 1);
          if (ng < g[nk]) {
            g[nk] = ng;
            came[nk] = k;
            push(ng + h(ni, nj), nk);
          }
        }
    }
    if (!closed[tk]) return null;
    const cells = [];
    for (let k = tk; k !== -1; k = came[k]) cells.unshift(this.center(k % this.nx, (k / this.nx) | 0));
    // làm mượt: bỏ điểm trung gian khi nhìn thấy thẳng
    const pts = [cells[0]];
    let a = 0;
    while (a < cells.length - 1) {
      let b = cells.length - 1;
      while (b > a + 1 && !this.lineFree(cells[a], cells[b])) b--;
      pts.push(cells[b]);
      a = b;
    }
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return { points: pts, length };
  }
}
