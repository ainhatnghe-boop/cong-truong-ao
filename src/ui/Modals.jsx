// Cửa sổ lớn: Tiến độ (Gantt), An toàn & Chất lượng (PTW · NCR · HSE), Tra cứu cơ sở dữ liệu
import { useState } from 'react';
import { db, useDB } from '../store/db.js';
import { useUI, openModal, select, logActivity } from '../store/ui.js';
import { SCHEMA, enumOf } from '../data/index.js';
import { EnumChip, IdLink, Spi, fmtDate } from './common.jsx';
import Modal from './Modal.jsx';
import { plannedOf, zoneMetrics, projectMetrics, isLate, isOverdue, today } from '../store/metrics.js';

const go = (id) => {
  openModal(null);
  select(id);
};

function Schedule() {
  const project = useDB(() => db.list('projects')[0]);
  const filter = useUI((s) => s.packageFilter);
  const zones = useDB(() => db.list('zones', (z) => !z.support && (filter === 'ALL' || z.packageId === filter)));
  const tasks = useDB(() => db.list('tasks'));
  const milestones = useDB(() => db.list('milestones', (m) => filter === 'ALL' || m.packageId === filter));
  const pm = useDB(() => projectMetrics());
  const t0 = new Date(project.start).getTime();
  const t1 = new Date(project.finish).getTime();
  const pct = (d) => ((new Date(d).getTime() - t0) / (t1 - t0)) * 100;
  const years = [];
  for (let y = new Date(project.start).getFullYear(); y <= new Date(project.finish).getFullYear(); y++) years.push(y);
  const quarters = years.flatMap((y) => [0, 3, 6, 9].map((m) => new Date(y, m, 1))).filter((d) => d.getTime() >= t0 && d.getTime() <= t1);
  const nowX = pct(today());
  return (
    <Modal title="Tiến độ tổng thể · Gantt" wide>
      <div className="dbx__bar">
        <span>
          Dự án: <b>{pm.actual.toLocaleString('vi-VN')}%</b> thực tế / {pm.planned.toLocaleString('vi-VN')}% kế hoạch · SPI <Spi value={pm.spi} />
        </span>
        <span className="spacer" />
        <span className="legend">
          <i className="legend__plan" /> kế hoạch <i className="legend__act" /> thực tế <i className="legend__now" /> hôm nay
        </span>
      </div>
      <div className="gantt">
        <div className="gantt__row gantt__row--head">
          <div className="gantt__label">Hạng mục / công việc</div>
          <div className="gantt__track">
            {quarters.map((q) => (
              <span key={+q} className={`gantt__tick${q.getMonth() === 0 ? ' is-year' : ''}`} style={{ left: `${pct(q)}%` }}>
                {q.getMonth() === 0 ? q.getFullYear() : `Q${q.getMonth() / 3 + 1}`}
              </span>
            ))}
          </div>
        </div>
        <div className="gantt__row gantt__row--ms">
          <div className="gantt__label">Mốc tiến độ</div>
          <div className="gantt__track">
            {milestones.map((m) => (
              <button key={m.id} className="gantt__ms" style={{ left: `${pct(m.date)}%`, '--c': enumOf('milestoneStatus', m.status).color }} title={`${m.name} · ${fmtDate(m.date)}`} onClick={() => go(m.id)}>
                ◆
              </button>
            ))}
            <i className="gantt__now" style={{ left: `${nowX}%` }} />
          </div>
        </div>
        {zones.map((z) => {
          const pkg = db.get(z.packageId);
          const m = zoneMetrics(z.id);
          return (
            <div key={z.id} className="gantt__group">
              <div className="gantt__row gantt__row--zone">
                <button className="gantt__label" onClick={() => go(z.id)}>
                  <span className="swatch" style={{ background: pkg.color }} /> {z.code} · {z.name}
                  <small>
                    {m.actual}% · SPI <Spi value={m.spi} />
                  </small>
                </button>
                <div className="gantt__track">
                  <i className="gantt__now" style={{ left: `${nowX}%` }} />
                </div>
              </div>
              {tasks
                .filter((t) => t.zoneId === z.id)
                .map((t) => {
                  const l = pct(t.start);
                  const w = pct(t.finish) - l;
                  return (
                    <div key={t.id} className={`gantt__row${isLate(t) ? ' is-late' : ''}`}>
                      <button className="gantt__label gantt__label--task" onClick={() => go(t.id)}>
                        {t.title}
                        <small>
                          {t.progress}% / {plannedOf(t)}%
                        </small>
                      </button>
                      <div className="gantt__track">
                        <button className="gantt__bar" style={{ left: `${l}%`, width: `${w}%`, '--c': pkg.color }} onClick={() => go(t.id)} title={`${fmtDate(t.start)} → ${fmtDate(t.finish)}`}>
                          <i style={{ width: `${t.progress}%` }} />
                        </button>
                        <i className="gantt__now" style={{ left: `${nowX}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function Card({ rec, group, field = 'status', meta, children }) {
  const late = isOverdue(rec);
  return (
    <article className={`card${late ? ' card--late' : ''}`} onClick={() => go(rec.id)}>
      <div className="card__top">
        <code>{rec.id}</code>
        <EnumChip group={group} value={rec[field]} />
      </div>
      <strong>{rec.title}</strong>
      <div className="card__foot">
        <span className="muted small">{db.get(rec.zoneId)?.code}</span>
        <span className={late ? 'bad small' : 'muted small'}>{meta}</span>
      </div>
      {children && (
        <div className="btn-row btn-row--tight" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </article>
  );
}

function Safety() {
  const filter = useUI((s) => s.packageFilter);
  const inScope = (r) => filter === 'ALL' || db.get(r.zoneId)?.packageId === filter;
  const permits = useDB(() => db.list('permits', (p) => inScope(p) && (p.status === 'requested' || p.status === 'active')));
  const ncrs = useDB(() => db.list('ncrs', (n) => inScope(n) && n.status !== 'closed'));
  const hse = useDB(() => db.list('hse', (h) => inScope(h)).slice().sort((a, b) => (a.date < b.date ? 1 : -1)));
  const project = useDB(() => db.list('projects')[0]);
  const counts = (type) => hse.filter((h) => h.type === type).length;
  return (
    <Modal title="An toàn & Chất lượng hiện trường" wide>
      <div className="stats stats--wide">
        <div>
          <small>LTI gần nhất</small>
          <b>{fmtDate(project.lastLtiDate)}</b>
        </div>
        <div>
          <small>Suýt xảy ra</small>
          <b>{counts('near-miss')}</b>
        </div>
        <div>
          <small>Hành vi / điều kiện mất AT</small>
          <b>{counts('unsafe-act') + counts('unsafe-condition')}</b>
        </div>
        <div>
          <small>Thực hành tốt</small>
          <b>{counts('good-practice')}</b>
        </div>
      </div>
      <div className="board">
        <div className="board__col">
          <h4 style={{ '--c': '#F59E0B' }}>
            Giấy phép làm việc <span>{permits.length}</span>
          </h4>
          {permits.map((p) => (
            <Card key={p.id} rec={p} group="permitStatus" meta={enumOf('permitType', p.type).label}>
              {p.status === 'requested' ? (
                <>
                  <button
                    className="btn btn--sm btn--primary"
                    onClick={() => {
                      db.update(p.id, { status: 'active' });
                      logActivity(p.approverId, `Duyệt ${p.id}: ${p.title}`);
                    }}
                  >
                    ✓ Duyệt
                  </button>
                  <button className="btn btn--sm" onClick={() => db.update(p.id, { status: 'rejected' })}>
                    ✕ Từ chối
                  </button>
                </>
              ) : (
                <button className="btn btn--sm" onClick={() => db.update(p.id, { status: 'closed' })}>
                  Đóng PTW
                </button>
              )}
            </Card>
          ))}
        </div>
        <div className="board__col">
          <h4 style={{ '--c': '#DC2626' }}>
            NCR đang mở <span>{ncrs.length}</span>
          </h4>
          {ncrs.map((n) => (
            <Card key={n.id} rec={n} group="ncrSeverity" field="severity" meta={`hạn ${fmtDate(n.due)}`}>
              {n.status === 'open' && (
                <button className="btn btn--sm" onClick={() => db.update(n.id, { status: 'action' })}>
                  Đang khắc phục
                </button>
              )}
              <button className="btn btn--sm btn--primary" onClick={() => db.update(n.id, { status: 'closed' })}>
                ✓ Đóng NCR
              </button>
            </Card>
          ))}
        </div>
        <div className="board__col board__col--2">
          <h4 style={{ '--c': '#16A34A' }}>
            Quan sát an toàn (HSE) <span>{hse.length}</span>
          </h4>
          {hse.map((h) => (
            <Card key={h.id} rec={h} group="hseType" field="type" meta={`${fmtDate(h.date)} · ${enumOf('openStatus', h.status).label}`}>
              {h.status !== 'closed' && (
                <button className="btn btn--sm" onClick={() => db.update(h.id, { status: 'closed' })}>
                  ✓ Đã khắc phục
                </button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function DataExplorer() {
  const [table, setTable] = useState('zones');
  const [q, setQ] = useState('');
  const rows = useDB(() => db.list(table));
  const patched = useDB(() => db.patchedIds());
  const lookup = q.trim().toUpperCase();
  const hit = lookup && db.get(lookup);
  const schema = SCHEMA[Object.keys(SCHEMA).find((k) => SCHEMA[k].table === table)];
  const cols = rows[0] ? Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object' && !k.startsWith('__')).slice(0, 8) : [];
  return (
    <Modal title="Cơ sở dữ liệu · tra cứu theo id" wide>
      <div className="dbx__bar">
        <input className="input" placeholder="Nhập id, vd ZONE-03, WK-08, TSK-010, PTW-002…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm theo id" />
        {lookup && (hit ? <IdLink id={lookup} showId /> : <span className="bad small">Không có id “{lookup}”</span>)}
        <span className="spacer" />
        <span className="muted small">{patched.length} bản ghi đã sửa / tạo mới</span>
        <button
          className="btn"
          onClick={() => {
            if (confirm('Khôi phục toàn bộ dữ liệu gốc từ file JSON? Các thay đổi đã lưu sẽ mất.')) db.reset();
          }}
        >
          ↺ Khôi phục dữ liệu gốc
        </button>
      </div>
      <div className="tabs tabs--wrap">
        {Object.entries(SCHEMA).map(([p, s]) => (
          <button key={p} className={`tab${table === s.table ? ' is-active' : ''}`} onClick={() => setTable(s.table)}>
            {s.label} <code>{p}</code>
          </button>
        ))}
      </div>
      <p className="muted small">
        File nguồn: <code>src/data/{table}.json</code> · tham chiếu:{' '}
        {Object.entries(schema.refs).map(([f, p]) => (
          <code key={f}>
            {f}→{p}{' '}
          </code>
        ))}
        {!Object.keys(schema.refs).length && '—'}
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={patched.includes(r.id) ? 'is-patched' : ''} onClick={() => go(r.id)}>
                {cols.map((c) => (
                  <td key={c}>{schema.refs[c] || c === 'id' ? <code>{r[c] ?? '—'}</code> : String(r[c] ?? '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export default function Modals() {
  const modal = useUI((s) => s.modal);
  if (modal === 'schedule') return <Schedule />;
  if (modal === 'safety') return <Safety />;
  if (modal === 'data') return <DataExplorer />;
  return null;
}
