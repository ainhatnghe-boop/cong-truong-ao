// ============================================================
//  ObjectRegistry — danh mục LOẠI đối tượng có thể đặt lên công trường.
//  Mỗi loại: { type, label, category, icon, params: [lược đồ tham số], gen | equip, unlock }
//  - gen: generator trong generators.js → sinh cấu kiện theo tham số
//  - equip: thiết bị thi công (tài nguyên) → mô hình động trong studio/EquipmentModels.jsx
//  - container: nút phân cấp (Khu vực / Hạng mục / Công trình / Hệ thống / Nhóm)
//  Thêm loại mới = thêm 1 mục ở đây (+ generator nếu cần). UI tự sinh form từ `params`.
// ============================================================
import { G } from './generators.js';

const num = (key, label, def, min, max, step = 0.1, unit = 'm') => ({ key, label, type: 'number', def, min, max, step, unit });
const int = (key, label, def, min, max, unit = '') => ({ key, label, type: 'int', def, min, max, step: 1, unit });
const enm = (key, label, def, options) => ({ key, label, type: 'enum', def, options });
const bool = (key, label, def) => ({ key, label, type: 'bool', def });

export const CATEGORIES = [
  { id: 'assembly', label: 'Công trình tham số' },
  { id: 'foundation', label: 'Móng' },
  { id: 'structure', label: 'Kết cấu' },
  { id: 'envelope', label: 'Bao che & mái' },
  { id: 'civil', label: 'Hạ tầng & giao thông' },
  { id: 'process', label: 'Công nghệ & cơ điện' },
  { id: 'equipment', label: 'Máy móc thi công' },
  { id: 'container', label: 'Phân cấp dự án' },
];

/** Cấp phân cấp dự án (Project → Area → Zone → Structure → System → Work package) — không bắt buộc dùng đủ */
export const LEVELS = [
  { id: 'area', label: 'Khu vực' },
  { id: 'zone', label: 'Hạng mục' },
  { id: 'structure', label: 'Công trình' },
  { id: 'system', label: 'Hệ thống' },
  { id: 'package', label: 'Gói công việc' },
  { id: 'group', label: 'Nhóm' },
];

const TYPES = [
  // ---- phân cấp ----
  { type: 'container', label: 'Nút phân cấp', category: 'container', icon: '▣', container: true, params: [enm('level', 'Cấp', 'zone', LEVELS.map((l) => [l.id, l.label]))] },

  // ---- công trình tham số ----
  {
    type: 'asm.building',
    label: 'Toà nhà nhiều tầng',
    category: 'assembly',
    icon: '🏢',
    gen: G.building,
    params: [
      int('floors', 'Số tầng', 10, 1, 80, 'tầng'),
      num('floorHeight', 'Chiều cao tầng', 3.6, 2.8, 6),
      num('lengthX', 'Chiều dài mặt bằng', 30, 6, 120, 0.5),
      num('widthZ', 'Chiều rộng mặt bằng', 25, 6, 80, 0.5),
      num('spanX', 'Bước cột theo dài', 7.5, 3, 12, 0.5),
      num('spanZ', 'Bước cột theo rộng', 7.5, 3, 12, 0.5),
      num('columnSize', 'Tiết diện cột', 0.7, 0.3, 1.5, 0.05),
      num('slabThickness', 'Chiều dày sàn', 0.22, 0.12, 0.4, 0.01),
      enm('facade', 'Bao che', 'glass', [['glass', 'Vách kính'], ['brick', 'Tường gạch'], ['none', 'Không bao che']]),
      enm('foundation', 'Loại móng', 'raft', [['raft', 'Móng bè'], ['pile', 'Cọc + đài bè'], ['pad', 'Móng đơn']]),
    ],
  },
  {
    type: 'asm.steelShed',
    label: 'Nhà xưởng khung thép',
    category: 'assembly',
    icon: '🏭',
    gen: G.steelShed,
    params: [
      num('length', 'Chiều dài', 60, 12, 400, 1),
      num('width', 'Chiều rộng (khẩu độ)', 30, 8, 90, 1),
      num('eaveHeight', 'Chiều cao đỉnh cột', 10, 4, 30, 0.5),
      num('bay', 'Bước cột', 7.5, 4, 15, 0.5),
      num('pitch', 'Độ dốc mái', 8, 3, 25, 1, '°'),
      num('purlinSpacing', 'Khoảng cách xà gồ', 1.5, 0.8, 3, 0.1),
      bool('cladding', 'Bao che vách tôn', true),
    ],
  },
  {
    type: 'asm.bridge',
    label: 'Cầu dầm nhiều nhịp',
    category: 'assembly',
    icon: '🌉',
    gen: G.bridge,
    unlock: 2,
    params: [int('spans', 'Số nhịp', 4, 1, 30, 'nhịp'), num('spanLength', 'Chiều dài nhịp', 24, 10, 60, 1), num('deckWidth', 'Bề rộng mặt cầu', 12, 6, 40, 0.5), num('pierHeight', 'Chiều cao trụ', 9, 3, 40, 0.5)],
  },

  // ---- móng ----
  { type: 'foundation.pad', label: 'Móng đơn', category: 'foundation', icon: '▪', gen: G.footingPad, params: [num('length', 'Dài', 2.4, 0.6, 10), num('width', 'Rộng', 2.4, 0.6, 10), num('height', 'Cao', 0.8, 0.3, 3)] },
  { type: 'foundation.strip', label: 'Móng băng', category: 'foundation', icon: '▬', gen: G.footingStrip, params: [num('length', 'Dài', 12, 1, 100, 0.5), num('width', 'Rộng', 1.2, 0.4, 5), num('height', 'Cao', 0.6, 0.3, 2)] },
  { type: 'foundation.raft', label: 'Móng bè', category: 'foundation', icon: '■', gen: G.footingRaft, params: [num('length', 'Dài', 24, 4, 200, 0.5), num('width', 'Rộng', 18, 4, 200, 0.5), num('height', 'Chiều dày', 1.2, 0.4, 4)] },
  {
    type: 'foundation.pile',
    label: 'Móng cọc + đài',
    category: 'foundation',
    icon: '⫼',
    gen: G.footingPile,
    params: [int('rows', 'Số hàng cọc', 2, 1, 8), int('cols', 'Số cột cọc', 2, 1, 8), num('spacing', 'Khoảng cách cọc', 1.8, 0.8, 6), num('diameter', 'Đường kính cọc', 0.6, 0.3, 2.5, 0.05), num('pileLength', 'Chiều dài cọc', 15, 4, 60, 0.5), num('capHeight', 'Chiều cao đài', 1.2, 0.5, 3)],
  },

  // ---- kết cấu ----
  { type: 'structure.columnConcrete', label: 'Cột bê tông', category: 'structure', icon: '▮', gen: G.columnConcrete, params: [num('width', 'Rộng', 0.5, 0.2, 2, 0.05), num('depth', 'Sâu', 0.5, 0.2, 2, 0.05), num('height', 'Cao', 3.6, 1, 20)] },
  { type: 'structure.columnSteel', label: 'Cột thép H', category: 'structure', icon: 'Ⅰ', gen: G.columnSteel, params: [num('size', 'Chiều cao tiết diện', 0.4, 0.15, 1.2, 0.05), num('height', 'Cao', 6, 1, 30)] },
  { type: 'structure.beamConcrete', label: 'Dầm bê tông', category: 'structure', icon: '━', gen: G.beamConcrete, params: [num('length', 'Nhịp dầm', 7.5, 1, 20), num('width', 'Rộng', 0.3, 0.2, 1, 0.05), num('height', 'Cao', 0.6, 0.3, 2, 0.05)] },
  { type: 'structure.beamSteel', label: 'Dầm thép I', category: 'structure', icon: '⌶', gen: G.beamSteel, params: [num('length', 'Nhịp dầm', 9, 1, 40), num('depth', 'Chiều cao dầm', 0.5, 0.15, 2, 0.05)] },
  { type: 'structure.slab', label: 'Sàn bê tông', category: 'structure', icon: '▭', gen: G.slab, params: [num('length', 'Dài', 8, 1, 100, 0.5), num('width', 'Rộng', 6, 1, 100, 0.5), num('thickness', 'Dày', 0.2, 0.1, 1, 0.01)] },
  { type: 'structure.stair', label: 'Cầu thang', category: 'structure', icon: '⌸', gen: G.stair, params: [num('width', 'Bề rộng', 1.4, 0.8, 4), num('height', 'Chiều cao', 3.6, 1, 6), int('steps', 'Số bậc', 20, 4, 30, 'bậc')] },
  {
    type: 'structure.rack',
    label: 'Giá đỡ thiết bị / pipe rack',
    category: 'structure',
    icon: '⊞',
    gen: G.equipRack,
    params: [num('length', 'Dài', 24, 3, 300, 1), num('width', 'Rộng', 6, 2, 20, 0.5), num('height', 'Cao', 8, 3, 30, 0.5), int('tiers', 'Số tầng giá', 2, 1, 6), num('bay', 'Bước khung', 6, 3, 12, 0.5)],
  },

  // ---- bao che & mái ----
  {
    type: 'envelope.wall',
    label: 'Tường / vách',
    category: 'envelope',
    icon: '▥',
    gen: G.wall,
    params: [num('length', 'Dài', 6, 0.5, 100, 0.5), num('thickness', 'Dày', 0.22, 0.05, 1, 0.01), num('height', 'Cao', 3.3, 0.5, 20), enm('material', 'Vật liệu', 'brick', [['brick', 'Gạch xây'], ['concrete', 'Bê tông'], ['glass', 'Vách kính']])],
  },
  { type: 'envelope.roof', label: 'Mái công nghiệp', category: 'envelope', icon: '⌂', gen: G.roofIndustrial, params: [num('length', 'Dài', 30, 2, 400, 1), num('width', 'Rộng', 20, 2, 90, 1), num('pitch', 'Độ dốc', 8, 2, 35, 1, '°')] },

  // ---- hạ tầng ----
  { type: 'civil.road', label: 'Đường giao thông', category: 'civil', icon: '🛣', gen: G.road, params: [num('length', 'Chiều dài', 60, 5, 1000, 1), num('width', 'Bề rộng mặt đường', 7, 3, 30, 0.5)] },
  { type: 'civil.pad', label: 'Mặt bằng thi công', category: 'civil', icon: '▦', gen: G.sitePad, params: [num('length', 'Dài', 40, 2, 500, 1), num('width', 'Rộng', 30, 2, 500, 1), num('thickness', 'Dày lớp đá', 0.3, 0.1, 1, 0.05)] },
  { type: 'civil.manhole', label: 'Hố ga', category: 'civil', icon: '◫', gen: G.manhole, params: [num('size', 'Kích thước', 1.2, 0.6, 4, 0.1), num('depth', 'Sâu', 1.8, 0.5, 6, 0.1)] },
  { type: 'civil.drain', label: 'Mương thoát nước', category: 'civil', icon: '⊔', gen: G.drain, params: [num('length', 'Dài', 30, 2, 500, 1), num('width', 'Rộng lòng', 0.8, 0.3, 4, 0.1), num('depth', 'Sâu', 1, 0.3, 4, 0.1)] },

  // ---- công nghệ & cơ điện ----
  { type: 'process.tank', label: 'Bồn chứa', category: 'process', icon: '⛁', gen: G.tank, params: [num('diameter', 'Đường kính', 16, 2, 90, 0.5), num('height', 'Chiều cao thân', 12, 2, 40, 0.5), enm('roof', 'Mái bồn', 'cone', [['cone', 'Mái nón'], ['dome', 'Mái vòm'], ['flat', 'Mái phẳng']])] },
  { type: 'process.pipe', label: 'Tuyến ống', category: 'process', icon: '═', gen: G.pipe, params: [num('length', 'Dài', 30, 2, 500, 1), num('diameter', 'Đường kính', 0.6, 0.1, 3, 0.05), num('elevation', 'Cao độ đỉnh giá', 3, 0.5, 20, 0.5), num('supportSpacing', 'Bước giá đỡ', 6, 2, 15, 0.5)] },
  { type: 'process.tray', label: 'Máng cáp', category: 'process', icon: '☰', gen: G.cableTray, params: [num('length', 'Dài', 30, 2, 500, 1), num('width', 'Rộng máng', 0.6, 0.2, 1.5, 0.05), num('elevation', 'Cao độ', 3, 0.5, 15, 0.5)] },
  { type: 'process.machineBase', label: 'Bệ máy', category: 'process', icon: '▤', gen: G.machineBase, params: [num('length', 'Dài', 8, 1, 40), num('width', 'Rộng', 4, 1, 20), num('height', 'Cao', 1.5, 0.3, 5)] },
  { type: 'process.mepUnit', label: 'Thiết bị điện – cơ', category: 'process', icon: '⚡', gen: G.mepUnit, params: [num('length', 'Dài', 4, 0.5, 20), num('width', 'Rộng', 2.5, 0.5, 10), num('height', 'Cao', 3, 0.5, 10)] },

  // ---- máy móc thi công (tài nguyên) ----
  // equip: kích thước footprint, phạm vi tác động (m), tăng năng suất theo kỹ năng, phí huy động, chi phí/ngày, mở khoá theo cấp
  { type: 'eq.towerCrane', label: 'Cẩu tháp', category: 'equipment', icon: '🏗', equip: { model: 'towerCrane', footprint: [6, 6], range: 55, boost: { concrete: 0.4, steel: 0.6, envelope: 0.3 }, lift: true, mobilize: 900, daily: 18 }, params: [num('height', 'Chiều cao móc', 45, 15, 120, 1), num('jib', 'Tầm với', 50, 20, 80, 1)] },
  { type: 'eq.crawlerCrane', label: 'Cẩu bánh xích', category: 'equipment', icon: '🚜', equip: { model: 'crawlerCrane', footprint: [8, 6], range: 35, boost: { steel: 0.7, mep: 0.4 }, lift: true, mobilize: 600, daily: 22 }, params: [num('boom', 'Chiều dài cần', 40, 15, 90, 1)] },
  { type: 'eq.excavator', label: 'Máy xúc', category: 'equipment', icon: '⛏', equip: { model: 'excavator', footprint: [5, 3], range: 30, boost: { civil: 0.8 }, mobilize: 60, daily: 5 }, params: [] },
  { type: 'eq.dozer', label: 'Máy ủi', category: 'equipment', icon: '▰', equip: { model: 'dozer', footprint: [5, 3.5], range: 40, boost: { civil: 0.5 }, mobilize: 50, daily: 4 }, params: [] },
  { type: 'eq.dumpTruck', label: 'Xe ben', category: 'equipment', icon: '🚚', equip: { model: 'dumpTruck', footprint: [7, 2.6], range: 60, boost: { civil: 0.3 }, mobilize: 20, daily: 3 }, params: [] },
  { type: 'eq.mixer', label: 'Xe trộn bê tông', category: 'equipment', icon: '🚛', equip: { model: 'mixer', footprint: [8, 2.6], range: 60, boost: { concrete: 0.35 }, mobilize: 25, daily: 4 }, params: [] },
  { type: 'eq.pump', label: 'Xe bơm bê tông', category: 'equipment', icon: '🚒', equip: { model: 'pump', footprint: [10, 2.6], range: 40, boost: { concrete: 0.6 }, mobilize: 80, daily: 9 }, unlock: 2, params: [] },
  { type: 'eq.forklift', label: 'Xe nâng', category: 'equipment', icon: '🛻', equip: { model: 'forklift', footprint: [3, 1.5], range: 25, boost: { envelope: 0.3, mep: 0.3 }, mobilize: 10, daily: 1.5 }, params: [] },
  { type: 'eq.pileDriver', label: 'Máy đóng/khoan cọc', category: 'equipment', icon: '⤓', equip: { model: 'pileDriver', footprint: [6, 4], range: 30, boost: { civil: 1.0 }, mobilize: 200, daily: 12 }, unlock: 2, params: [] },
];

export const REGISTRY = Object.fromEntries(TYPES.map((t) => [t.type, t]));
export const typesIn = (category) => TYPES.filter((t) => t.category === category);
export const getType = (type) => REGISTRY[type] ?? null;

/** Tham số mặc định của một loại */
export function defaultParams(type) {
  const t = getType(type);
  return Object.fromEntries((t?.params ?? []).map((p) => [p.key, p.def]));
}

/** Ép tham số về đúng kiểu & khoảng cho phép (dùng khi sửa, khi tải dự án) */
export function sanitizeParams(type, params = {}) {
  const t = getType(type);
  const out = {};
  for (const p of t?.params ?? []) {
    let v = params[p.key];
    if (p.type === 'number' || p.type === 'int') {
      v = Number(v);
      if (!Number.isFinite(v)) v = p.def;
      v = Math.min(p.max, Math.max(p.min, v));
      if (p.type === 'int') v = Math.round(v);
    } else if (p.type === 'enum') {
      if (!p.options.some(([id]) => id === v)) v = p.def;
    } else if (p.type === 'bool') v = typeof v === 'boolean' ? v : p.def;
    out[p.key] = v;
  }
  return out;
}

export const isContainer = (type) => !!getType(type)?.container;
export const isEquipment = (type) => !!getType(type)?.equip;
export const isBuildable = (type) => !!getType(type)?.gen;
