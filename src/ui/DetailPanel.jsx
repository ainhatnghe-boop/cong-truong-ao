// Panel phải: chi tiết theo id được chọn (loại xác định bằng tiền tố id).
// Mọi thao tác ghi dữ liệu đi qua db.update(id, patch).
import { db, useDB } from '../store/db.js';
import { useUI, select, logActivity } from '../store/ui.js';
import { SCHEMA, prefixOf, ENUMS, dialogues } from '../data/index.js';
import { Avatar, Chip, EnumChip, IdLink, Progress, Section, Spi, fmtDate, fmtMoney } from './common.jsx';
import { zoneMetrics, packageMetrics, plannedOf, isLate, isOverdue } from '../store/metrics.js';
import { runtime } from '../scene/runtime.js';
import { say } from '../store/sim.js';

/** Dòng công việc tiến độ: cập nhật % và nghiệm thu ngay tại chỗ */
export function TaskRow({ t, showAssignee = true }) {
  const plan = plannedOf(t);
  const set = (progress) => {
    progress = Math.max(0, Math.min(100, progress));
    db.update(t.id, { progress, status: progress >= 100 ? 'review' : progress > 0 ? 'doing' : 'todo' });
  };
  return (
    <li className={`task${isLate(t) ? ' task--late' : ''}`}>
      <button className="task__title" onClick={() => select(t.id)}>
        {t.title}
      </button>
      <div className="task__meta">
        <EnumChip group="taskStatus" value={t.status} />
        <span className={isLate(t) ? 'bad' : 'muted'}>
          {t.progress}% / KH {plan}%
        </span>
        <span className="muted">→ {fmtDate(t.finish)}</span>
        {showAssignee && <IdLink id={t.assigneeId} />}
      </div>
      <Progress value={t.progress} planned={plan} />
      <div className="btn-row btn-row--tight">
        <button className="btn btn--sm" onClick={() => set(t.progress - 10)} disabled={t.status === 'done'}>
          −10%
        </button>
        <button className="btn btn--sm" onClick={() => set(t.progress + 10)} disabled={t.status === 'done'}>
          +10%
        </button>
        {t.status === 'review' && (
          <button
            className="btn btn--sm btn--primary"
            onClick={() => {
              db.update(t.id, { status: 'done', progress: 100 });
              logActivity(t.assigneeId, `Nghiệm thu đạt “${t.title}”`);
            }}
          >
            ✓ Nghiệm thu
          </button>
        )}
      </div>
    </li>
  );
}

function MiniList({ rows, group, field = 'status' }) {
  if (!rows.length) return <p className="muted small">Không có.</p>;
  return (
    <ul className="docs">
      {rows.map((r) => (
        <li key={r.id}>
          <IdLink id={r.id} showId />
          <EnumChip group={group} value={r[field]} />
        </li>
      ))}
    </ul>
  );
}

function ZoneDetail({ id }) {
  const z = useDB(() => db.get(id));
  const pkg = db.get(z.packageId);
  const m = useDB(() => zoneMetrics(id));
  const tasks = useDB(() => db.list('tasks', (t) => t.zoneId === id));
  const crew = useDB(() => db.list('workers', (w) => w.zoneId === id));
  const eqs = useDB(() => db.list('equipment', (e) => e.zoneId === id));
  const hse = useDB(() => db.list('hse', (h) => h.zoneId === id && h.status !== 'closed'));
  const ncr = useDB(() => db.list('ncrs', (n) => n.zoneId === id && n.status !== 'closed'));
  const ptw = useDB(() => db.list('permits', (p) => p.zoneId === id && (p.status === 'requested' || p.status === 'active')));
  const here = Object.entries(runtime.workers).filter(([, r]) => r.zoneId === id).length;
  return (
    <>
      <div className="hero" style={{ '--accent': pkg.color }}>
        <span className="hero__badge">{z.code}</span>
        <div>
          <h2>{z.name}</h2>
          <p className="muted">
            <code>{z.id}</code> · <IdLink id={z.packageId} />
          </p>
        </div>
      </div>
      <p>{z.description}</p>
      {m ? (
        <div className="stats">
          <div>
            <small>Thực tế</small>
            <b>{m.actual}%</b>
          </div>
          <div>
            <small>Kế hoạch</small>
            <b>{m.planned}%</b>
          </div>
          <div>
            <small>SPI</small>
            <Spi value={m.spi} />
          </div>
          <div>
            <small>Đang có mặt</small>
            <b>{here}</b>
          </div>
        </div>
      ) : (
        <p className="muted small">Công trình phụ trợ: đã hoàn thiện, đang khai thác phục vụ thi công.</p>
      )}
      {m && <Progress value={m.actual} planned={m.planned} color={pkg.color} />}
      {!!tasks.length && (
        <Section title={`Công việc tiến độ (${tasks.length})`} right={<small className="muted">mô hình 3D mọc theo %</small>}>
          <ul className="tasks">
            {tasks.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </ul>
        </Section>
      )}
      <Section title={`Tổ đội thường trực (${crew.length})`}>
        <ul className="people">
          {crew.map((w) => (
            <li key={w.id}>
              <button className="row" onClick={() => select(w.id)}>
                <Avatar worker={w} size={28} />
                <span className="row__main">
                  <strong>{w.title}</strong>
                  <small>{db.get(w.roleId).title}</small>
                </span>
              </button>
            </li>
          ))}
          {!crew.length && <li className="muted small">Không có tổ đội thường trực.</li>}
        </ul>
      </Section>
      {!!eqs.length && (
        <Section title="Thiết bị">
          <MiniList rows={eqs} group="equipmentStatus" />
        </Section>
      )}
      <Section title={`An toàn & chất lượng đang mở (${hse.length + ncr.length + ptw.length})`}>
        <MiniList rows={[...ptw]} group="permitStatus" />
        {!!ncr.length && <MiniList rows={ncr} group="openStatus" />}
        {!!hse.length && <MiniList rows={hse} group="hseType" field="type" />}
      </Section>
    </>
  );
}

function WorkerDetail({ id }) {
  const w = useDB(() => db.get(id));
  const role = db.get(w.roleId);
  const ctr = db.get(w.contractorId);
  const tasks = useDB(() => db.list('tasks', (t) => t.assigneeId === id));
  const permits = useDB(() => db.list('permits', (p) => p.holderId === id || p.approverId === id));
  const doing = useUI((s) => s.doing[id]);
  const lines = dialogues.byWorker[id] ?? [];
  return (
    <>
      <div className="hero" style={{ '--accent': ctr.color }}>
        <Avatar worker={w} size={56} />
        <div>
          <h2>{w.title}</h2>
          <p>{role.title}</p>
          <p className="muted">
            <IdLink id={w.contractorId} /> · <code>{w.id}</code>
          </p>
        </div>
      </div>
      <div className="status-line">
        <EnumChip group="workerStatus" value={w.status} />
        <span className="ellipsis">{doing}</span>
      </div>
      <div className="btn-row">
        <button className="btn" onClick={() => lines.length && say(id, lines[Math.floor(Math.random() * lines.length)])}>
          💬 Hỏi nhanh
        </button>
        <select className="btn" value={w.status} onChange={(e) => db.update(id, { status: e.target.value })} aria-label="Đổi trạng thái">
          {ENUMS.workerStatus.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <dl className="kv">
        <div>
          <dt>Vị trí thường trực</dt>
          <dd>
            <IdLink id={w.zoneId} />
          </dd>
        </div>
        <div>
          <dt>Thẩm quyền</dt>
          <dd>{role.authority}</dd>
        </div>
      </dl>
      <Section title="Kỹ năng">
        <div className="chips">
          {role.skills.map((s) => (
            <Chip key={s} color={ctr.color}>
              {s}
            </Chip>
          ))}
        </div>
      </Section>
      {!!tasks.length && (
        <Section title={`Công việc phụ trách (${tasks.length})`}>
          <ul className="tasks">
            {tasks.map((t) => (
              <TaskRow key={t.id} t={t} showAssignee={false} />
            ))}
          </ul>
        </Section>
      )}
      {!!permits.length && (
        <Section title="Giấy phép làm việc">
          <MiniList rows={permits} group="permitStatus" />
        </Section>
      )}
    </>
  );
}

function PackageDetail({ id }) {
  const p = useDB(() => db.get(id));
  const m = useDB(() => packageMetrics(id));
  const zones = useDB(() => db.list('zones', (z) => z.packageId === id));
  const ms = useDB(() => db.list('milestones', (x) => x.packageId === id));
  return (
    <>
      <div className="hero" style={{ '--accent': p.color }}>
        <span className="hero__badge">{p.code}</span>
        <div>
          <h2>{p.name}</h2>
          <p className="muted">
            <code>{p.id}</code> · {p.contractType} · {fmtMoney(p.value)}
          </p>
        </div>
      </div>
      <dl className="kv">
        <div>
          <dt>Nhà thầu</dt>
          <dd>
            <IdLink id={p.contractorId} />
          </dd>
        </div>
        <div>
          <dt>Chỉ huy / quản lý gói</dt>
          <dd>
            <IdLink id={p.managerId} />
          </dd>
        </div>
      </dl>
      {m && (
        <>
          <div className="stats">
            <div>
              <small>Thực tế</small>
              <b>{m.actual}%</b>
            </div>
            <div>
              <small>Kế hoạch</small>
              <b>{m.planned}%</b>
            </div>
            <div>
              <small>SPI</small>
              <Spi value={m.spi} />
            </div>
          </div>
          <Progress value={m.actual} planned={m.planned} color={p.color} />
        </>
      )}
      <Section title={`Hạng mục (${zones.length})`}>
        <ul className="docs">
          {zones.map((z) => (
            <li key={z.id}>
              <IdLink id={z.id} showId />
              <span className="muted small">{zoneMetrics(z.id)?.actual ?? 100}%</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Mốc tiến độ">
        <ul className="docs">
          {ms.map((x) => (
            <li key={x.id}>
              <IdLink id={x.id} />
              <span className="muted small">{fmtDate(x.date)}</span>
              <EnumChip group="milestoneStatus" value={x.status} />
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function ContractorDetail({ id }) {
  const c = useDB(() => db.get(id));
  const pk = useDB(() => db.list('packages', (p) => p.contractorId === id));
  const crew = useDB(() => db.list('workers', (w) => w.contractorId === id));
  const ncr = useDB(() => db.list('ncrs', (n) => n.contractorId === id));
  return (
    <>
      <div className="hero" style={{ '--accent': c.color }}>
        <span className="hero__badge" style={{ background: c.helmet, color: '#14203A' }}>
          {c.code}
        </span>
        <div>
          <h2>{c.name}</h2>
          <p className="muted">
            <code>{c.id}</code> · {c.manpower.toLocaleString('vi-VN')} nhân lực · mũ màu <i className="dot" style={{ background: c.helmet }} />
          </p>
        </div>
      </div>
      {!!pk.length && (
        <Section title="Gói thầu">
          <ul className="docs">
            {pk.map((p) => (
              <li key={p.id}>
                <IdLink id={p.id} showId />
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={`Nhân sự chủ chốt (${crew.length})`}>
        <div className="chips">
          {crew.map((w) => (
            <IdLink key={w.id} id={w.id} />
          ))}
        </div>
      </Section>
      <Section title={`NCR (${ncr.length})`}>
        <MiniList rows={ncr} group="openStatus" />
      </Section>
    </>
  );
}

function EquipmentDetail({ id }) {
  const e = useDB(() => db.get(id));
  const due = isOverdue({ status: 'open', due: e.inspectionDue });
  return (
    <>
      <div className="hero" style={{ '--accent': db.get(e.contractorId)?.color }}>
        <span className="hero__badge">{e.code}</span>
        <div>
          <h2>{e.name}</h2>
          <p className="muted">
            <code>{e.id}</code> · <IdLink id={e.contractorId} />
          </p>
        </div>
      </div>
      <div className="btn-row">
        {ENUMS.equipmentStatus.map((s) => (
          <button key={s.id} className={`btn${e.status === s.id ? ' btn--primary' : ''}`} onClick={() => db.update(id, { status: s.id })}>
            {s.label}
          </button>
        ))}
      </div>
      <dl className="kv">
        <div>
          <dt>{e.zoneId ? 'Hạng mục' : 'Tuyến chạy'}</dt>
          <dd>
            <IdLink id={e.zoneId ?? e.routeId} />
          </dd>
        </div>
        <div>
          <dt>Người vận hành</dt>
          <dd>
            <IdLink id={e.operatorId} />
          </dd>
        </div>
        <div>
          <dt>Hạn kiểm định</dt>
          <dd className={due ? 'bad' : ''}>
            {fmtDate(e.inspectionDue)} {due && '· QUÁ HẠN, dừng sử dụng'}
          </dd>
        </div>
      </dl>
    </>
  );
}

/** View chung cho mọi bảng chưa có view riêng (TSK, HSE, NCR, PTW, MS, RT, ROLE…) */
function RecordDetail({ id }) {
  const rec = useDB(() => db.get(id));
  const prefix = prefixOf(id);
  const schema = SCHEMA[prefix];
  const backlinks = useDB(() => db.backlinks(id));
  const STATUS = { NCR: 'openStatus', HSE: 'openStatus', PTW: 'permitStatus', MS: 'milestoneStatus' }[prefix];
  return (
    <>
      <div className="hero">
        <span className="hero__badge">{prefix}</span>
        <div>
          <h2>{rec.title ?? rec.name}</h2>
          <p className="muted">
            {schema.label} · <code>{rec.id}</code>
          </p>
        </div>
      </div>
      {prefix === 'TSK' && (
        <ul className="tasks">
          <TaskRow t={rec} />
        </ul>
      )}
      {prefix === 'PTW' && rec.status === 'requested' && (
        <div className="btn-row">
          <button
            className="btn btn--primary"
            onClick={() => {
              db.update(id, { status: 'active' });
              logActivity(rec.approverId, `Duyệt ${id}: ${rec.title}`);
            }}
          >
            ✓ Duyệt PTW
          </button>
          <button className="btn" onClick={() => db.update(id, { status: 'rejected' })}>
            ✕ Từ chối
          </button>
        </div>
      )}
      {STATUS && !(prefix === 'PTW' && rec.status === 'requested') && (
        <div className="btn-row">
          {ENUMS[STATUS].map((s) => (
            <button key={s.id} className={`btn btn--sm${rec.status === s.id ? ' btn--primary' : ''}`} onClick={() => db.update(id, { status: s.id })}>
              {s.label}
            </button>
          ))}
        </div>
      )}
      <dl className="kv">
        {Object.entries(rec)
          .filter(([k]) => !k.startsWith('__'))
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{schema.refs[k] ? <IdLink id={v} showId /> : typeof v === 'object' ? <code>{JSON.stringify(v)}</code> : String(v)}</dd>
            </div>
          ))}
      </dl>
      {!!backlinks.length && (
        <Section title={`Được tham chiếu bởi (${backlinks.length})`}>
          <ul className="docs">
            {backlinks.map((b) => (
              <li key={b.id + b.field}>
                <IdLink id={b.id} showId />
                <span className="muted small">{b.field}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

const VIEWS = { ZONE: ZoneDetail, WK: WorkerDetail, PKG: PackageDetail, CTR: ContractorDetail, EQ: EquipmentDetail };

export default function DetailPanel() {
  const sel = useUI((s) => s.selection);
  const exists = useDB(() => (sel ? !!db.get(sel.id) : false));
  if (!sel || !exists) return null;
  const View = VIEWS[prefixOf(sel.id)] ?? RecordDetail;
  return (
    <aside className="detail panel" aria-label="Chi tiết">
      <button className="detail__close btn btn--icon" onClick={() => select(null)} aria-label="Đóng">
        ✕
      </button>
      <div className="detail__body" key={sel.id}>
        <View id={sel.id} />
      </div>
    </aside>
  );
}
