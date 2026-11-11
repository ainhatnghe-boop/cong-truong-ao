// Dock trái: Hạng mục · Gói thầu · Nhân lực · Thiết bị
import { db, useDB } from '../store/db.js';
import { ui, useUI, select } from '../store/ui.js';
import { Avatar, Progress, EnumChip, Spi } from './common.jsx';
import { zoneMetrics, packageMetrics } from '../store/metrics.js';

const TABS = [
  { id: 'zones', label: 'Hạng mục' },
  { id: 'packages', label: 'Gói thầu' },
  { id: 'workers', label: 'Nhân lực' },
  { id: 'equipment', label: 'Thiết bị' },
];

function ZoneRow({ z, active }) {
  const m = useDB(() => zoneMetrics(z.id));
  const pkg = db.get(z.packageId);
  return (
    <button className={`row row--col${active ? ' is-active' : ''}`} onClick={() => select(z.id)}>
      <span className="row__main">
        <strong className="ellipsis">
          <span className="swatch" style={{ background: pkg.color }} /> {z.name}
        </strong>
        <small>
          {z.code} · {pkg.code}
          {m ? (
            <>
              {' '}
              · SPI <Spi value={m.spi} />
            </>
          ) : (
            ' · công trình phụ trợ'
          )}
        </small>
      </span>
      {m && (
        <span className="row__meta">
          <Progress value={m.actual} planned={m.planned} color={pkg.color} />
          <b className="num">{m.actual}%</b>
        </span>
      )}
    </button>
  );
}

function PackageRow({ p, active }) {
  const m = useDB(() => packageMetrics(p.id));
  const ctr = db.get(p.contractorId);
  return (
    <button className={`row row--col${active ? ' is-active' : ''}`} onClick={() => select(p.id)}>
      <span className="row__main">
        <strong className="ellipsis">
          {p.code} · {p.name}
        </strong>
        <small className="ellipsis">{ctr.name}</small>
      </span>
      {m && (
        <span className="row__meta">
          <Progress value={m.actual} planned={m.planned} color={p.color} />
          <Spi value={m.spi} />
        </span>
      )}
    </button>
  );
}

export default function Dock() {
  const tab = useUI((s) => s.dock);
  const selId = useUI((s) => s.selection?.id);
  const filter = useUI((s) => s.packageFilter);
  const zones = useDB(() => db.list('zones', (z) => filter === 'ALL' || z.packageId === filter));
  const packages = useDB(() => db.list('packages'));
  const workers = useDB(() => db.list('workers'));
  const equipment = useDB(() => db.list('equipment'));
  const doing = useUI((s) => s.doing);
  const inScope = (zoneId) => filter === 'ALL' || db.get(zoneId)?.packageId === filter;

  return (
    <aside className="dock panel">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' is-active' : ''}`} onClick={() => ui.set({ dock: t.id })}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="dock__list">
        {tab === 'zones' && zones.map((z) => <ZoneRow key={z.id} z={z} active={selId === z.id} />)}
        {tab === 'packages' && packages.map((p) => <PackageRow key={p.id} p={p} active={selId === p.id} />)}
        {tab === 'workers' &&
          workers
            .filter((w) => inScope(w.zoneId) || filter === 'ALL')
            .map((w) => (
              <button key={w.id} className={`row${selId === w.id ? ' is-active' : ''}`} onClick={() => select(w.id)}>
                <Avatar worker={w} size={30} />
                <span className="row__main">
                  <strong>
                    {w.title} <small className="muted">· {db.get(w.roleId)?.title}</small>
                  </strong>
                  <small className="ellipsis">{doing[w.id] ?? db.get(w.zoneId)?.name}</small>
                </span>
              </button>
            ))}
        {tab === 'equipment' &&
          equipment
            .filter((e) => !e.zoneId || inScope(e.zoneId))
            .map((e) => (
              <button key={e.id} className={`row row--col${selId === e.id ? ' is-active' : ''}`} onClick={() => select(e.id)}>
                <span className="row__main">
                  <strong className="ellipsis">{e.name}</strong>
                  <small className="ellipsis">{e.zoneId ? db.get(e.zoneId)?.name : `Tuyến ${db.get(e.routeId)?.name}`}</small>
                </span>
                <span className="row__meta">
                  <EnumChip group="equipmentStatus" value={e.status} />
                </span>
              </button>
            ))}
      </div>
    </aside>
  );
}
