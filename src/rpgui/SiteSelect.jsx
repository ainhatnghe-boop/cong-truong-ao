// Màn hình CHỌN CÔNG TRƯỜNG — dữ liệu cấu hình + dự án người chơi tạo trong Studio
import { useMemo, useState } from 'react';
import { listSites, siteSummary } from '../rpg/ProjectSelectionSystem.js';
import { slotStatus, orgChart } from '../rpg/ProjectWorkforceSystem.js';
import { DATA, ppeLabel } from '../rpg/data.js';
import { session } from './session.js';

export function OrgChart({ site, siteProgress }) {
  const chart = orgChart(site, siteProgress, session.profile.character.name);
  return (
    <div className="rp-org">
      {chart.map((g) => (
        <section key={g.id}>
          <h4>
            {g.id}. {g.label}
          </h4>
          <ul>
            {g.roles.map((r) => (
              <li key={r.roleId}>
                <b>{r.title}</b> <span className="muted small">{r.occupiedSlots}/{r.totalSlots}</span>
                <div className="small muted">{r.members.slice(0, 4).map((m) => m.name).join(' · ') || '—'}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="small muted">Thành viên ghi “(NPC)” là nhân vật do máy điều khiển, không phải người chơi trực tuyến.</p>
    </div>
  );
}

export default function SiteSelect({ onJoined, onBack }) {
  const sites = useMemo(() => listSites(), []);
  const [cat, setCat] = useState('all');
  const [sel, setSel] = useState(session.profile.currentSite ?? sites[0]?.key);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState('info');
  const roleId = session.profile.career.roleId;
  const sum = useMemo(() => (sel ? siteSummary(sel, session.profile.sites[sel]) : null), [sel]);
  const shown = sites.filter((s) => cat === 'all' || s.site.category === cat);
  const sp = session.profile.sites[sel];
  const st = sum ? slotStatus(sum.site, sp, roleId) : null;
  const join = (rid, mode) => {
    const r = session.joinSite(sel, rid, mode);
    if (r.error) setMsg({ ...r, roleId: rid });
    else onJoined(sel);
  };
  return (
    <div className="rp-screen">
      <header className="rp-screen__head">
        <h1>CHỌN CÔNG TRƯỜNG</h1>
        <p className="muted">Bước 3/4 · Mỗi công trường có mặt bằng, hạng mục và cơ cấu nhân sự riêng. Vị trí của bạn: {DATA.roleById[roleId]?.title}.</p>
      </header>
      <div className="tabs tabs--wrap">
        <button className={`tab${cat === 'all' ? ' is-active' : ''}`} onClick={() => setCat('all')}>
          Tất cả ({sites.length})
        </button>
        {DATA.siteCategories.map((c) => (
          <button key={c.id} className={`tab${cat === c.id ? ' is-active' : ''}`} onClick={() => setCat(c.id)} disabled={!sites.some((s) => s.site.category === c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="rp-two">
        <div className="rp-list panel">
          {shown.map(({ key, site }) => (
            <button key={key} className={`rp-site${sel === key ? ' is-active' : ''}`} onClick={() => (setSel(key), setMsg(null))}>
              <strong>{site.name}</strong>
              <small>
                {DATA.siteCategories.find((c) => c.id === site.category)?.label} · {site.scale}
              </small>
              {session.profile.sites[key]?.joined && <span className="chip" style={{ '--c': '#16A34A' }}>Đã tham gia</span>}
            </button>
          ))}
          {!shown.length && <p className="muted small rp-pad">Chưa có công trường nhóm này. Dự án tạo trong Studio sẽ xuất hiện ở nhóm “Công trường do người chơi tạo”.</p>}
        </div>
        {sum && (
          <div className="panel rp-pad">
            <h2>{sum.site.name}</h2>
            <p className="muted">{sum.site.description}</p>
            <div className="tabs">
              {[
                ['info', 'Thông tin'],
                ['staff', 'Nhân sự & vị trí'],
                ['org', 'Sơ đồ tổ chức'],
              ].map(([id, l]) => (
                <button key={id} className={`tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
                  {l}
                </button>
              ))}
            </div>
            {tab === 'info' && (
              <dl className="kv">
                <div>
                  <dt>Loại dự án</dt>
                  <dd>{sum.categoryLabel}</dd>
                </div>
                <div>
                  <dt>Quy mô</dt>
                  <dd>{sum.site.scale}</dd>
                </div>
                <div>
                  <dt>Tổng mức đầu tư (giả lập)</dt>
                  <dd>{sum.site.investment.toLocaleString('vi-VN')} tỷ đồng</dd>
                </div>
                <div>
                  <dt>Ngày bắt đầu</dt>
                  <dd>{sum.site.startDate}</dd>
                </div>
                <div>
                  <dt>Tiến độ hiện tại</dt>
                  <dd>
                    <div className="progress">
                      <div className="progress__bar" style={{ width: `${sum.progress * 100}%` }} />
                    </div>
                    {Math.round(sum.progress * 100)}%
                  </dd>
                </div>
                <div>
                  <dt>Khu vực / hạng mục thi công</dt>
                  <dd>
                    {sum.areas} hạng mục: {sum.items.join(', ')}
                  </dd>
                </div>
                <div>
                  <dt>Thiết bị</dt>
                  <dd>{sum.equipment.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt>Nhân sự</dt>
                  <dd>
                    {sum.staffOccupied}/{sum.staffTotal} người · đang tuyển {sum.openSlots} vị trí
                  </dd>
                </div>
                <div>
                  <dt>Trạng thái an toàn</dt>
                  <dd>
                    {sum.site.safety?.status} · {sum.site.safety?.daysNoLTI} ngày không tai nạn mất ngày công (giả lập)
                  </dd>
                </div>
                <div>
                  <dt>Điều kiện ra vào</dt>
                  <dd>
                    PPE: {(sum.site.entry?.ppe ?? []).map(ppeLabel).join(', ')} · {(sum.site.entry?.training ?? []).map((t) => DATA.trainingById[t]?.label).join(', ')}
                  </dd>
                </div>
              </dl>
            )}
            {tab === 'staff' && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vị trí</th>
                      <th>Phòng ban</th>
                      <th>Đã có / tổng</th>
                      <th>Còn trống</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sum.roles.map((r) => {
                      const s = slotStatus(sum.site, sp, r.roleId);
                      return (
                        <tr key={r.roleId} className={r.roleId === roleId ? 'is-patched' : ''}>
                          <td>{r.title}</td>
                          <td className="small">{r.department}</td>
                          <td>
                            {s.occupiedSlots}/{s.totalSlots}
                          </td>
                          <td className={s.free > 0 ? '' : 'bad'}>{s.free > 0 ? s.free : 'Đủ'}</td>
                          <td>
                            <button className="btn btn--sm" onClick={() => join(r.roleId, 'member')}>
                              Đăng ký
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {tab === 'org' && <OrgChart site={sum.site} siteProgress={sp} />}
            {msg && (
              <div className="rp-msg">
                <p className="bad">{msg.error}</p>
                {!!msg.suggestions?.length && (
                  <>
                    <p className="small">Vị trí phù hợp còn chỗ:</p>
                    <div className="rp-chips">
                      {msg.suggestions.map((s) => (
                        <button key={s.roleId} className="rp-chip" onClick={() => join(s.roleId, 'member')}>
                          {s.title} (còn {s.free})
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {msg.canIntern && (
                  <button className="btn btn--sm" onClick={() => join(msg.roleId ?? roleId, 'intern')}>
                    Tham gia vị trí {DATA.roleById[roleId].title} ở chế độ thực tập (quyền hạn chế)
                  </button>
                )}
              </div>
            )}
            <div className="btn-row">
              {onBack && (
                <button className="btn" onClick={onBack}>
                  ← Đổi nghề
                </button>
              )}
              <span className="spacer" />
              {sp?.joined && (
                <button className="btn" onClick={() => onJoined(sel)}>
                  Tiếp tục ({DATA.roleById[sp.joined.roleId].title}
                  {sp.joined.mode === 'intern' ? ' · thực tập' : ''})
                </button>
              )}
              <button className="btn btn--primary" onClick={() => join(roleId, 'member')}>
                Tham gia làm {DATA.roleById[roleId]?.title} {st && `(còn ${Math.max(0, st.free)} chỗ)`} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
