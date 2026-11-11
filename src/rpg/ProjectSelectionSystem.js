// ============================================================
//  ProjectSelectionSystem — danh sách công trường: cấu hình (sites.json) + dự án người chơi tạo trong Studio.
//  Khoá công trường: 'cfg:<siteId>' | 'studio:<projectId>'.
// ============================================================
import { DATA } from './data.js';
import { docFromSiteConfig, assembleWorld } from './WorldBuilder.js';
import { projectRoles } from './ProjectWorkforceSystem.js';
import { build, } from '../engine/ParametricGeometryEngine.js';
import { isBuildable } from '../engine/ObjectRegistry.js';
import { listSaves, loadProject } from '../engine/SaveManager.js';
import { progressOf } from '../engine/ConstructionSimulationEngine.js';

const cache = new Map();

/** Định nghĩa site cho dự án Studio: suy ra quy mô, nhân sự, điều kiện ra vào từ dữ liệu dự án */
function siteFromStudio(entry) {
  const r = loadProject(entry.id);
  if (r.errors?.length) return null;
  const n = Object.values(r.doc.nodes).filter((x) => isBuildable(x.type)).length;
  return {
    id: entry.id,
    custom: true,
    category: 'custom',
    name: r.doc.meta.name,
    scale: `${n} công trình/cấu kiện · ${r.doc.site.width} × ${r.doc.site.depth} m`,
    investment: Math.round(r.doc.meta.budget / 1000),
    startDate: r.doc.meta.createdAt?.slice(0, 10),
    description: `Dự án do người chơi tạo trong Studio (${r.doc.meta.category}).`,
    entry: { ppe: ['helmet', 'boots', 'vest'], training: ['induction'] },
    safety: { status: 'Chưa đánh giá', daysNoLTI: r.sim?.day ?? 0 },
    workforce: { scale: Math.max(0.5, Math.min(2, n / 6)), fill: 0.5, full: [] },
    zones: [],
    _studio: r,
  };
}

export function listSites() {
  const cfg = DATA.sites.map((s) => ({ key: `cfg:${s.id}`, site: s }));
  let studio = [];
  try {
    studio = listSaves()
      .map((e) => {
        const s = siteFromStudio(e);
        return s ? { key: `studio:${e.id}`, site: s } : null;
      })
      .filter(Boolean);
  } catch {
    studio = []; // không có localStorage (Node)
  }
  return [...cfg, ...studio];
}

export function getSite(key) {
  if (key?.startsWith('cfg:')) return DATA.siteById[key.slice(4)] ?? null;
  if (key?.startsWith('studio:')) {
    const e = listSaves().find((x) => x.id === key.slice(7));
    return e ? siteFromStudio(e) : null;
  }
  return null;
}

/** Dữ liệu gốc (doc, sim) của công trường — cache vì sinh địa hình tốn thời gian */
export function baseWorld(key, site = getSite(key)) {
  if (!site) return null;
  if (site.custom) return { doc: site._studio.doc, sim: site._studio.sim, site };
  if (!cache.has(key)) cache.set(key, { ...docFromSiteConfig(site), site });
  return cache.get(key);
}

export function buildWorld(key, delta) {
  const site = getSite(key);
  const base = baseWorld(key, site);
  return base ? { site, ...assembleWorld(base, delta) } : null;
}

/** Thông tin thẻ công trường cho màn hình CHỌN CÔNG TRƯỜNG */
export function siteSummary(key, siteProgress) {
  const site = getSite(key);
  const base = baseWorld(key, site);
  const nodes = Object.values(base.doc.nodes);
  const items = nodes.filter((n) => isBuildable(n.type));
  let W = 0;
  let D = 0;
  for (const n of items) {
    const pr = progressOf(n, base.sim.nodes[n.id]);
    const w = build(n).totals.work;
    W += w;
    D += w * pr.overall;
  }
  const roles = projectRoles(site);
  const total = roles.reduce((s, r) => s + r.totalSlots, 0);
  const occ = roles.reduce((s, r) => s + r.occupiedSlots, 0) + (siteProgress?.joined?.mode === 'member' ? 1 : 0);
  return {
    key,
    site,
    categoryLabel: DATA.siteCategories.find((c) => c.id === site.category)?.label ?? site.category,
    progress: W ? D / W : 0,
    items: items.map((n) => n.name),
    equipment: nodes.filter((n) => n.type.startsWith('eq.')).map((n) => n.name),
    areas: items.length,
    staffTotal: total,
    staffOccupied: occ,
    openSlots: total - occ,
    roles,
  };
}
