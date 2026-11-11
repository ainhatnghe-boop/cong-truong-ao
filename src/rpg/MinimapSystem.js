// ============================================================
//  MinimapSystem — dữ liệu vẽ bản đồ (thuần JS): ranh giới, đường, công trình, công trình phụ trợ,
//  vùng an toàn (màu theo mức + đang chặn hay không), người chơi, NPC, mục tiêu, tuyến đường.
//  UI chỉ việc vẽ các lớp này lên canvas 2D (minimap & world map dùng chung).
// ============================================================
import { DATA } from './data.js';
import { zoneAccess } from './SafetyZoneSystem.js';

export function mapLayers(S) {
  if (!S.world) return null;
  const w = S.world;
  const ctx = S.accessCtx();
  const objects = S.cw.obstacles.filter((o) => o.node).map((o) => ({ ...o, label: o.node.name, equip: o.node.type.startsWith('eq.') }));
  const roads = S.cw.surfaces.filter((o) => o.node).map((o) => ({ ...o, road: o.node.type === 'civil.road' }));
  const zones = S.zones
    .filter((z) => z.kind !== 'general')
    .map((z) => ({ id: z.id, name: z.name, shape: z.shape, level: z.level, color: DATA.levelById[z.level]?.color ?? '#999', blocked: !zoneAccess(z, ctx).allowed }));
  const o = S.objective();
  const target = o?.target ? S.targetPos(o.target) : null;
  return {
    size: { w: w.doc.site.width, d: w.doc.site.depth },
    boundary: w.boundary,
    gate: w.gate,
    water: w.doc.site.terrain.water != null,
    roads,
    objects,
    facilities: w.facilities.map((f) => ({ kind: f.kind, label: f.label, x: f.x, z: f.z, ry: f.ry, size: f.size })),
    zones,
    player: S.char ? { x: S.char.x, z: S.char.z, yaw: S.char.yaw } : null,
    npcs: S.npcs.map((n) => ({ x: n.x, z: n.z, kind: n.kind, name: n.name })),
    target: target ? { ...target, title: o.title } : null,
    route: S.route?.points ?? null,
  };
}

export const FACILITY_ICONS = { gate: '⛩', office: '🏢', drawing: '📐', warehouse: '📦', hseBoard: '⛑' };
