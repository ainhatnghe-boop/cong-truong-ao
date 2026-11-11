// ============================================================
//  SafetyZoneSystem — vùng an toàn ĐỘNG sinh từ đối tượng theo luật (safety.json) + vùng tĩnh của công trường
//  + vùng toàn công trường (ranh giới). Đánh giá quyền vào theo nghề / PPE / huấn luyện / PTW.
//  Cảnh báo 3 mức theo KHOẢNG CÁCH (trước khi bước vào): 1 thông tin · 2 chưa đủ điều kiện · 3 cấm/nguy hiểm.
//  Vùng chưa được phép = ranh giới cứng cho CharacterController & NavigationSystem.
//  Đây là cơ chế gameplay, KHÔNG thay thế kiểm soát an toàn thực tế.
// ============================================================
import { DATA, ppeLabel } from './data.js';
import { getType } from '../engine/ObjectRegistry.js';
import { localBox } from '../engine/ParametricGeometryEngine.js';
import { worldMap, rotY, insidePolygon } from '../engine/PlacementSystem.js';
import { roleAllowedInZone } from './RoleManagementSystem.js';
import { activePermit } from './PTWSimulator.js';

const S = DATA.safety;
const rank = (lv) => DATA.levelById[lv]?.rank ?? 0;

// ---------------- hình học vùng ----------------
function segDist(px, pz, a, b) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (a[0] + dx * t), pz - (a[1] + dz * t));
}

/** Khoảng cách có dấu tới ranh giới vùng: âm = bên trong */
export function signedDistance(shape, x, z) {
  if (shape.type === 'circle') return Math.hypot(x - shape.c[0], z - shape.c[1]) - shape.r;
  if (shape.type === 'box') {
    const [lx, lz] = rotY(x - shape.c[0], z - shape.c[1], -(shape.ry ?? 0));
    const dx = Math.abs(lx) - shape.hx;
    const dz = Math.abs(lz) - shape.hz;
    if (dx <= 0 && dz <= 0) return Math.max(dx, dz);
    return Math.hypot(Math.max(dx, 0), Math.max(dz, 0));
  }
  if (shape.type === 'poly') {
    let d = Infinity;
    for (let i = 0; i < shape.pts.length; i++) d = Math.min(d, segDist(x, z, shape.pts[i], shape.pts[(i + 1) % shape.pts.length]));
    return insidePolygon(shape.pts, x, z) ? -d : d;
  }
  return Infinity;
}

export function shapeCenter(shape) {
  if (shape.type === 'poly') {
    const n = shape.pts.length;
    return [shape.pts.reduce((s, p) => s + p[0], 0) / n, shape.pts.reduce((s, p) => s + p[1], 0) / n];
  }
  return shape.c;
}

function matches(rule, node) {
  const T = getType(node.type);
  const m = rule.match;
  if (m.type && node.type !== m.type) return false;
  if (m.types && !m.types.includes(node.type)) return false;
  if (m.category && T?.category !== m.category && !m.types) return false;
  return true;
}

/** Vùng sinh từ đối tượng theo luật + vùng tĩnh của site (KHÔNG gồm vùng toàn công trường) */
export function zonesFromObjects(doc, sim, site) {
  const worlds = worldMap(doc);
  const zones = [];
  for (const node of Object.values(doc.nodes)) {
    if (node.hidden) continue;
    for (const rule of S.rules) {
      if (!matches(rule, node)) continue;
      const done = !!sim?.nodes?.[node.id]?.complete;
      if (rule.when === 'unfinished' && done) continue;
      const w = worlds[node.id];
      let shape;
      if (rule.shape === 'circle') shape = { type: 'circle', c: [w.p[0], w.p[2]], r: rule.radius };
      else {
        const b = localBox(node);
        if (!b) continue;
        const [cx, cz] = rotY((b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2, w.ry);
        shape = { type: 'box', c: [w.p[0] + cx, w.p[2] + cz], hx: (b.max[0] - b.min[0]) / 2 + (rule.pad ?? 2), hz: (b.max[2] - b.min[2]) / 2 + (rule.pad ?? 2), ry: w.ry };
      }
      zones.push({ id: `Z-${rule.kind}-${node.id}`, name: `${S.kinds[rule.kind]} · ${node.name}`, kind: rule.kind, level: rule.level, risk: rule.risk ?? 3, shape, ppe: rule.ppe ?? [], training: rule.training ?? [], permit: rule.permit ?? null, roles: rule.roles ?? ['*'], active: true, sourceId: node.id });
      break; // mỗi đối tượng 1 luật đầu tiên khớp
    }
  }
  (site?.zones ?? []).forEach((z, i) =>
    zones.push({ id: `Z-static-${i + 1}`, name: z.name, kind: z.kind, level: z.level, risk: z.risk ?? 5, shape: z.shape, ppe: z.ppe ?? [], training: z.training ?? [], permit: z.permit ?? null, roles: z.roles ?? [], active: true, sourceId: null }),
  );
  return zones;
}

/** Toàn bộ vùng: vùng công trường (ranh giới), vùng an toàn cổng, vùng theo đối tượng */
export function buildZones(world) {
  const sz = S.siteZone;
  const zones = [
    { id: 'Z-site', name: `${S.kinds.general} (trong hàng rào)`, kind: 'general', level: sz.level, risk: sz.risk, shape: { type: 'poly', pts: world.boundary }, ppe: [...new Set([...(world.site.entry?.ppe ?? sz.ppe)])], training: world.site.entry?.training ?? sz.training, permit: null, roles: sz.roles, active: true, sourceId: null },
    { id: 'Z-gate', name: 'Khu vực cổng (an toàn)', kind: 'walkway', level: 'safe', risk: 1, shape: { type: 'circle', c: [world.spawn.x, world.spawn.z], r: S.gateSafeRadius }, ppe: [], training: [], permit: null, roles: ['*'], active: true, sourceId: null },
    ...zonesFromObjects(world.doc, world.sim, world.site),
  ];
  return zones;
}

// ---------------- quyền vào ----------------
/** ctx: { roleId, mode, equipped:[], trainings:Set|[], siteProgress, playTime } */
export function zoneAccess(zone, ctx) {
  if (!zone.active || zone.level === 'safe') return { allowed: true, reasons: [] };
  if (zone.level === 'forbidden') return { allowed: false, reasons: ['Vùng cấm vào — không ai được phép tiếp cận trong trò chơi'] };
  const reasons = [];
  if (!roleAllowedInZone(ctx.roleId, zone, ctx.mode)) reasons.push(`Vị trí của bạn không được phép vào ${DATA.safety.kinds[zone.kind]?.toLowerCase() ?? 'khu vực này'}${ctx.mode === 'intern' ? ' (thực tập)' : ''}`);
  const miss = zone.ppe.filter((p) => !ctx.equipped.includes(p));
  if (miss.length) reasons.push(`Thiếu PPE: ${miss.map(ppeLabel).join(', ')}`);
  const tr = ctx.trainings instanceof Set ? ctx.trainings : new Set(ctx.trainings);
  const missT = zone.training.filter((t) => !tr.has(t));
  if (missT.length) reasons.push(`Chưa hoàn thành: ${missT.map((t) => DATA.trainingById[t]?.label ?? t).join(', ')}`);
  if (zone.permit && !activePermit(ctx.siteProgress, zone.permit, ctx.playTime)) reasons.push(`Cần giấy phép làm việc: ${DATA.permitById[zone.permit]?.label ?? zone.permit} (mô phỏng)`);
  return { allowed: reasons.length === 0, reasons };
}

/** Chữ ký quyền truy cập (để cache lưới dẫn đường) */
export const accessSignature = (zones, ctx) => zones.map((z) => (zoneAccess(z, ctx).allowed ? '1' : '0')).join('');

/**
 * Đánh giá tại vị trí: cảnh báo theo khoảng cách, KHÔNG đợi bước vào.
 * Trả về { warnings:[{ zone, level:1|2|3, dist, reasons }], insideAllowed:[zone] }
 */
export function evaluate(zones, x, z, ctx) {
  const warnings = [];
  const insideAllowed = [];
  for (const zone of zones) {
    if (!zone.active || zone.level === 'safe' || zone.kind === 'general') continue;
    const d = signedDistance(zone.shape, x, z);
    if (d > S.warnDistance) continue;
    const acc = zoneAccess(zone, ctx);
    if (acc.allowed) {
      if (d <= 0) insideAllowed.push(zone);
      else warnings.push({ zone, level: 1, dist: d, reasons: [] });
    } else if (d <= S.blockDistance) warnings.push({ zone, level: rank(zone.level) >= 3 ? 3 : 2, dist: d, reasons: acc.reasons });
    else warnings.push({ zone, level: 1, dist: d, reasons: acc.reasons });
  }
  // vùng toàn công trường: cảnh báo ở hàng rào khi chưa đủ điều kiện
  const site = zones.find((z) => z.id === 'Z-site');
  if (site) {
    const d = signedDistance(site.shape, x, z);
    const acc = zoneAccess(site, ctx);
    if (!acc.allowed && d < 6 && d > -1) warnings.push({ zone: site, level: 2, dist: d, reasons: acc.reasons });
  }
  warnings.sort((a, b) => b.level - a.level || a.dist - b.dist);
  return { warnings, insideAllowed };
}

/** Danh sách vùng đang chặn với bối cảnh hiện tại */
export const blockingZones = (zones, ctx) => zones.filter((z) => z.active && !zoneAccess(z, ctx).allowed);
