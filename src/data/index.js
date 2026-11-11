// ============================================================
//  Sổ đăng ký cơ sở dữ liệu (DB registry)
//  - Cấu trúc bảng khai báo DUY NHẤT trong schema.json (dùng chung với scripts/check-data.mjs)
//  - Mỗi bảng = 1 file <table>.json, mỗi bản ghi có "id" dạng <TIỀN TỐ>-<SỐ>
//  - Các bảng tham chiếu nhau CHỈ bằng id (xxxId / xxxIds)
//  Thêm bảng mới: tạo file JSON + khai báo vào schema.json. Không cần sửa file này.
// ============================================================
import schema from './schema.json';
import dialogues from './dialogues.json';

const files = import.meta.glob('./*.json', { eager: true, import: 'default' });

/** prefix → { table, label, rows, refs, listRefs } */
export const SCHEMA = Object.fromEntries(
  Object.entries(schema.tables).map(([prefix, s]) => {
    const rows = files[`./${s.table}.json`];
    if (!rows) throw new Error(`[data] Thiếu file src/data/${s.table}.json cho tiền tố ${prefix}`);
    return [prefix, { refs: {}, listRefs: {}, ...s, rows }];
  }),
);

export const TABLE_TO_PREFIX = Object.fromEntries(Object.entries(SCHEMA).map(([p, s]) => [s.table, p]));
export const prefixOf = (id) => (typeof id === 'string' ? id.split('-')[0] : null);
export const tableOf = (id) => SCHEMA[prefixOf(id)]?.table ?? null;

export { dialogues };

/** Danh mục giá trị dùng chung (enum). Màu nghiệp vụ chỉ khai báo ở đây. */
export const ENUMS = {
  taskStatus: [
    { id: 'todo', label: 'Chưa bắt đầu', color: '#94A3B8' },
    { id: 'doing', label: 'Đang thi công', color: '#1F5EFF' },
    { id: 'review', label: 'Chờ nghiệm thu', color: '#F59E0B' },
    { id: 'done', label: 'Đã nghiệm thu', color: '#16A34A' },
  ],
  workerStatus: [
    { id: 'on-site', label: 'Có mặt', color: '#16A34A' },
    { id: 'off', label: 'Nghỉ ca', color: '#94A3B8' },
  ],
  equipmentStatus: [
    { id: 'working', label: 'Đang hoạt động', color: '#16A34A' },
    { id: 'idle', label: 'Chờ việc', color: '#F59E0B' },
    { id: 'maintenance', label: 'Bảo dưỡng / hỏng', color: '#DC2626' },
  ],
  milestoneStatus: [
    { id: 'done', label: 'Đã đạt', color: '#16A34A' },
    { id: 'planned', label: 'Theo kế hoạch', color: '#1F5EFF' },
    { id: 'at-risk', label: 'Có nguy cơ trễ', color: '#F59E0B' },
    { id: 'missed', label: 'Trễ mốc', color: '#DC2626' },
  ],
  hseType: [
    { id: 'incident', label: 'Sự cố', color: '#7F1D1D' },
    { id: 'near-miss', label: 'Suýt xảy ra', color: '#DC2626' },
    { id: 'unsafe-act', label: 'Hành vi mất an toàn', color: '#EA580C' },
    { id: 'unsafe-condition', label: 'Điều kiện mất an toàn', color: '#F59E0B' },
    { id: 'good-practice', label: 'Thực hành tốt', color: '#16A34A' },
  ],
  severity: [
    { id: 'high', label: 'Cao', color: '#DC2626' },
    { id: 'medium', label: 'Trung bình', color: '#F59E0B' },
    { id: 'low', label: 'Thấp', color: '#64748B' },
  ],
  openStatus: [
    { id: 'open', label: 'Đang mở', color: '#DC2626' },
    { id: 'action', label: 'Đang khắc phục', color: '#F59E0B' },
    { id: 'closed', label: 'Đã đóng', color: '#16A34A' },
  ],
  ncrSeverity: [
    { id: 'critical', label: 'Nghiêm trọng', color: '#7F1D1D' },
    { id: 'major', label: 'Lớn', color: '#DC2626' },
    { id: 'minor', label: 'Nhỏ', color: '#F59E0B' },
  ],
  permitStatus: [
    { id: 'requested', label: 'Chờ duyệt', color: '#F59E0B' },
    { id: 'active', label: 'Đang hiệu lực', color: '#16A34A' },
    { id: 'closed', label: 'Đã đóng', color: '#64748B' },
    { id: 'rejected', label: 'Từ chối', color: '#DC2626' },
  ],
  permitType: [
    { id: 'hot-work', label: 'Công việc nóng', color: '#EA580C' },
    { id: 'height', label: 'Làm việc trên cao', color: '#1F5EFF' },
    { id: 'lifting', label: 'Nâng hạ / cẩu lắp', color: '#7C3AED' },
    { id: 'confined', label: 'Không gian hạn chế', color: '#0F766E' },
    { id: 'electrical', label: 'Điện / LOTO', color: '#CA8A04' },
  ],
};

export const enumOf = (group, id) => ENUMS[group]?.find((e) => e.id === id) ?? { id, label: id ?? '—', color: '#94A3B8' };
