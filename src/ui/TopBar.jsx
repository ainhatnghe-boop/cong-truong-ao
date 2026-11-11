import { useEffect, useState } from 'react';
import { db, useDB } from '../store/db.js';
import { ui, useUI, openModal, select, setTheme, toggleNight, toggleLabels } from '../store/ui.js';
import { projectMetrics, daysSince } from '../store/metrics.js';

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="clock" title={now.toLocaleString('vi-VN')}>
      {now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })} · {now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

export default function TopBar() {
  const project = useDB(() => db.list('projects')[0]);
  const packages = useDB(() => db.list('packages'));
  const m = useDB(() => projectMetrics());
  const ncrOpen = useDB(() => db.list('ncrs', (n) => n.status !== 'closed').length);
  const ptwWait = useDB(() => db.list('permits', (p) => p.status === 'requested').length);
  const manpower = useDB(() => db.list('contractors').reduce((a, c) => a + (c.manpower || 0), 0));
  const filter = useUI((s) => s.packageFilter);
  const theme = useUI((s) => s.theme);
  const paused = useUI((s) => s.paused);
  const night = useUI((s) => s.night);
  const tour = useUI((s) => s.tour);
  const labels = useUI((s) => s.labels);
  const nextTheme = { auto: 'light', light: 'dark', dark: 'auto' }[theme];
  const safeDays = daysSince(project.lastLtiDate);

  return (
    <header className="topbar">
      <button className="brand" onClick={() => select('HOME')} title="Về toàn cảnh công trường">
        <span className="brand__logo" aria-hidden>
          ⛫
        </span>
        <span>
          <strong>SITE 3D · {project.code}</strong>
          <small className="ellipsis">{project.name}</small>
        </span>
      </button>

      <label className="select">
        <span className="sr-only">Lọc gói thầu</span>
        <select value={filter} onChange={(e) => ui.set({ packageFilter: e.target.value })}>
          <option value="ALL">Tất cả gói thầu ({packages.length})</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </select>
      </label>

      <div className="kpis">
        <button className="kpi" onClick={() => openModal('schedule')} title={`Kế hoạch ${m.planned}% · SPI ${m.spi.toFixed(2)}`}>
          <b>{m.actual.toLocaleString('vi-VN')}%</b> tiến độ
          <small>KH {m.planned.toLocaleString('vi-VN')}%</small>
        </button>
        <span className="kpi kpi--opt" title="Tổng nhân lực đăng ký trên công trường (contractors.json → manpower)">
          <b>{manpower.toLocaleString('vi-VN')}</b> nhân lực
        </span>
        <button className="kpi kpi--ok" onClick={() => openModal('safety')} title={`Sự cố mất ngày công (LTI) gần nhất: ${project.lastLtiDate}`}>
          <b>{safeDays}</b> ngày an toàn
        </button>
        <button className={`kpi${ncrOpen ? ' kpi--bad' : ''}`} onClick={() => openModal('safety')}>
          <b>{ncrOpen}</b> NCR mở
        </button>
        <button className={`kpi${ptwWait ? ' kpi--warn' : ''}`} onClick={() => openModal('safety')}>
          <b>{ptwWait}</b> PTW chờ duyệt
        </button>
      </div>

      <nav className="actions">
        <button className="btn" onClick={() => openModal('schedule')} title="Tiến độ (Gantt)">
          ▤ <span className="btn__label">Tiến độ</span>
        </button>
        <button className="btn" onClick={() => openModal('safety')} title="An toàn & Chất lượng">
          ⛑ <span className="btn__label">An toàn & Chất lượng</span>
        </button>
        <button className="btn" onClick={() => openModal('data')} title="Cơ sở dữ liệu">
          ⌗ <span className="btn__label">CSDL</span>
        </button>
        <button className={`btn${tour ? ' btn--primary' : ''}`} onClick={() => ui.set({ tour: !tour })} title="Tự động bay qua từng hạng mục">
          {tour ? '■' : '✈'} <span className="btn__label">{tour ? 'Dừng tham quan' : 'Tham quan'}</span>
        </button>
        <button className={`btn btn--icon${labels ? ' btn--primary' : ''}`} onClick={toggleLabels} title={labels ? 'Ẩn tên nhân lực' : 'Hiện tên nhân lực'} aria-label="Bật tắt tên nhân lực">
          Aa
        </button>
        <button className="btn btn--icon" onClick={toggleNight} title={night ? 'Chuyển ca ngày' : 'Chuyển ca đêm'} aria-label="Đổi ca ngày đêm">
          {night ? '☀' : '☾'}
        </button>
        <button className="btn btn--icon" onClick={() => ui.set({ paused: !paused })} title={paused ? 'Tiếp tục mô phỏng' : 'Tạm dừng mô phỏng'} aria-label="Tạm dừng hoặc tiếp tục">
          {paused ? '▶' : '❚❚'}
        </button>
        <button className="btn btn--icon" onClick={() => setTheme(nextTheme)} title={`Giao diện: ${theme} (bấm để đổi)`} aria-label="Đổi giao diện sáng tối">
          {theme === 'dark' ? '●' : theme === 'light' ? '○' : '◐'}
        </button>
        <Clock />
      </nav>
    </header>
  );
}
