// Thành phần UI dùng chung — xem docs/02 RULE UXUI.md trước khi thêm thành phần mới
import { db, useDB } from '../store/db.js';
import { select } from '../store/ui.js';
import { enumOf, SCHEMA, prefixOf } from '../data/index.js';
import { spiTone } from '../store/metrics.js';

export function Chip({ color, children, title }) {
  return (
    <span className="chip" style={{ '--c': color }} title={title}>
      {children}
    </span>
  );
}

export function EnumChip({ group, value }) {
  const e = enumOf(group, value);
  return <Chip color={e.color}>{e.label}</Chip>;
}

export function Progress({ value, planned, color }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__bar" style={{ width: `${value}%`, background: color }} />
      {planned != null && <div className="progress__plan" style={{ left: `${planned}%` }} title={`Kế hoạch ${planned}%`} />}
    </div>
  );
}

/** Ô chỉ số SPI có màu theo ngưỡng (≥0,98 đạt · ≥0,9 cảnh báo · còn lại chậm) */
export function Spi({ value }) {
  if (value == null || Number.isNaN(value)) return <span className="muted">—</span>;
  return <b className={`spi tone-${spiTone(value)}`}>{value.toFixed(2).replace('.', ',')}</b>;
}

export function displayName(rec) {
  if (!rec) return '—';
  if (prefixOf(rec.id) === 'WK') return rec.title;
  return rec.name ?? rec.title ?? rec.code ?? rec.id;
}

/** Hiển thị tham chiếu theo id — bấm để mở chi tiết */
export function IdLink({ id, showId = false }) {
  const rec = useDB(() => (id ? db.get(id) : null));
  if (!id) return <span className="muted">—</span>;
  if (!rec) return <span className="idlink idlink--broken" title="Không tìm thấy id">{id}</span>;
  return (
    <button className="idlink" onClick={() => select(id)} title={`${SCHEMA[prefixOf(id)]?.label} · ${id}`}>
      {showId && <code>{id}</code>} {displayName(rec)}
    </button>
  );
}

/** Avatar người: viền = màu nhà thầu, chấm trên = màu mũ bảo hộ */
export function Avatar({ worker, size = 36 }) {
  const ctr = db.get(worker.contractorId);
  return (
    <span className="avatar" style={{ '--a': worker.look.shirt, '--s': worker.look.skin, '--h': ctr?.helmet, width: size, height: size, borderColor: ctr?.color }}>
      <i />
    </span>
  );
}

export const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return Number.isNaN(+d) ? s : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const fmtMoney = (ty) => `${ty.toLocaleString('vi-VN')} tỷ đ`;

export function Section({ title, right, children }) {
  return (
    <section className="section">
      <header className="section__head">
        <h3>{title}</h3>
        {right}
      </header>
      {children}
    </section>
  );
}
