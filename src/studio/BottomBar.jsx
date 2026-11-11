// Thanh dưới: Công cụ dựng (chọn/di chuyển/xoay, địa hình, lưới, bắt dính, chế độ xem, cắt cao độ, lớp)
//             · Nhân lực & máy · Nhiệm vụ · Nhật ký
import { project, useProject } from '../engine/ProjectManager.js';
import { CATEGORIES, getType } from '../engine/ObjectRegistry.js';
import { SKILLS } from '../engine/materials.js';
import { hireCrew, releaseCrew, dailyWages } from '../engine/ResourceManager.js';
import { MISSIONS } from '../engine/MissionManager.js';
import { fmtMoney } from '../engine/EconomyManager.js';
import { editor, useEditor, setTool, select } from './editorStore.js';

function Tools() {
  const ed = useEditor((s) => s);
  const disabled = ed.mode !== 'edit';
  const b = ed.brush;
  const T = (on) => `btn btn--sm${on ? ' btn--primary' : ''}`;
  return (
    <div className="st-tools">
      <div className="st-group" aria-label="Thao tác">
        <button className={T(ed.tool === 'select' && ed.gizmo === 'translate')} onClick={() => setTool('select', { gizmo: 'translate' })} title="Chọn & di chuyển (W)">
          ✥ Di chuyển
        </button>
        <button className={T(ed.tool === 'select' && ed.gizmo === 'rotate')} disabled={disabled} onClick={() => setTool('select', { gizmo: 'rotate' })} title="Xoay (E)">
          ⟳ Xoay
        </button>
        <button className={T(ed.tool === 'terrain')} disabled={disabled} onClick={() => setTool(ed.tool === 'terrain' ? 'select' : 'terrain')} title="Bút địa hình (T)">
          ⛰ Địa hình
        </button>
        {ed.tool === 'place' && (
          <span className="chip" style={{ '--c': '#16A34A' }}>
            Đang đặt: {getType(ed.placeType)?.label} · Esc để huỷ
          </span>
        )}
      </div>
      {ed.tool === 'terrain' && (
        <div className="st-group" aria-label="Bút địa hình">
          {[
            ['raise', 'Đắp'],
            ['lower', 'Đào'],
            ['flatten', 'San phẳng'],
            ['smooth', 'Làm mịn'],
          ].map(([m, l]) => (
            <button key={m} className={T(b.mode === m)} onClick={() => editor.set({ brush: { ...b, mode: m } })}>
              {l}
            </button>
          ))}
          <label className="st-inline">
            Bán kính {b.radius} m
            <input type="range" min={2} max={80} value={b.radius} onChange={(e) => editor.set({ brush: { ...b, radius: Number(e.target.value) } })} />
          </label>
          <label className="st-inline">
            Cường độ
            <input type="range" min={0.1} max={2} step={0.1} value={b.strength} onChange={(e) => editor.set({ brush: { ...b, strength: Number(e.target.value) } })} />
          </label>
        </div>
      )}
      <div className="st-group" aria-label="Lưới & bắt dính">
        <button className={T(ed.grid)} onClick={() => editor.set({ grid: !ed.grid })} title="Bật/tắt lưới (G)">
          # Lưới
        </button>
        <select className="input input--sm" value={ed.gridSize} onChange={(e) => editor.set({ gridSize: Number(e.target.value) })} aria-label="Bước lưới">
          {[0.5, 1, 2, 5, 10].map((v) => (
            <option key={v} value={v}>
              {v} m
            </option>
          ))}
        </select>
        <button className={T(ed.snapGrid)} onClick={() => editor.set({ snapGrid: !ed.snapGrid })} title="Bắt dính lưới">
          ⌗ Dính lưới
        </button>
        <button className={T(ed.snapObject)} onClick={() => editor.set({ snapObject: !ed.snapObject })} title="Bắt dính cạnh/tâm đối tượng khác">
          ⧈ Dính đối tượng
        </button>
        <button className={T(ed.snapGround)} onClick={() => editor.set({ snapGround: !ed.snapGround })} title="Bám mặt đất khi di chuyển">
          ⤓ Bám đất
        </button>
      </div>
      <div className="st-group" aria-label="Chế độ xem">
        <button className={T(ed.view === 'persp')} onClick={() => editor.set({ view: 'persp' })}>
          ◭ Phối cảnh
        </button>
        <button className={T(ed.view === 'plan')} onClick={() => editor.set({ view: 'plan' })}>
          ▦ Mặt bằng
        </button>
        <button className={T(ed.cut.on)} onClick={() => editor.set({ cut: { ...ed.cut, on: !ed.cut.on } })} title="Chỉ hiện cấu kiện dưới cao độ cắt (xem theo tầng)">
          ✂ Cắt cao độ
        </button>
        {ed.cut.on && (
          <label className="st-inline">
            {ed.cut.y} m
            <input type="range" min={0} max={300} step={0.5} value={ed.cut.y} onChange={(e) => editor.set({ cut: { ...ed.cut, y: Number(e.target.value) } })} aria-label="Cao độ cắt" />
          </label>
        )}
      </div>
      <div className="st-group st-layers" aria-label="Lớp hiển thị">
        {CATEGORIES.filter((c) => c.id !== 'container').map((c) => (
          <label key={c.id} className="st-check" title={`Lớp: ${c.label}`}>
            <input type="checkbox" checked={ed.layers[c.id] !== false} onChange={(e) => editor.set({ layers: { ...ed.layers, [c.id]: e.target.checked } })} />
            {c.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Resources() {
  const sim = useProject((s) => s.sim);
  const doc = useProject((s) => s.doc);
  const used = {};
  for (const a of Object.values(sim.assign ?? {})) used[a.skill] = (used[a.skill] ?? 0) + a.crews;
  const eqs = Object.values(doc.nodes).filter((n) => getType(n.type)?.equip);
  const busy = new Set(Object.values(sim.assign ?? {}).flatMap((a) => (a.crews ? a.equipment : [])));
  const act = (fn) => {
    const r = fn(project.sim());
    if (r.error) project.notify(r.error, 'warn');
    else project.setSim(r.sim);
  };
  return (
    <div className="st-res">
      <table className="table">
        <thead>
          <tr>
            <th>Tổ đội (10 người/tổ)</th>
            <th>Số tổ</th>
            <th>Đang làm</th>
            <th>Lương/ngày</th>
            <th>Phí tuyển</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {Object.entries(SKILLS).map(([k, s]) => (
            <tr key={k}>
              <td>
                <i className="st-skill" style={{ '--c': s.color }}>
                  {s.label}
                </i>
              </td>
              <td>
                <b>{sim.crews[k]}</b>
              </td>
              <td>{used[k] ?? 0}</td>
              <td>{fmtMoney(s.wage * sim.crews[k])}</td>
              <td>{fmtMoney(s.hire)}</td>
              <td className="btn-row btn-row--tight">
                <button className="btn btn--sm" onClick={() => act((x) => hireCrew(x, k, 1))}>
                  ＋ Tuyển
                </button>
                <button className="btn btn--sm" disabled={!sim.crews[k]} onClick={() => act((x) => releaseCrew(x, k, 1))}>
                  − Cho nghỉ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <p className="small">
          Lương tổ đội: <b>{fmtMoney(dailyWages(sim))}/ngày</b> · chi phí ngày gần nhất: <b>{fmtMoney(sim.lastCost ?? 0)}</b>
        </p>
        <h4>Máy trên công trường ({eqs.length})</h4>
        <ul className="docs">
          {eqs.map((n) => (
            <li key={n.id}>
              <button className="idlink" onClick={() => (select(n.id), editor.set({ focusAt: Date.now() }))}>
                {getType(n.type).icon} {n.name}
              </button>
              <span className={`small ${busy.has(n.id) ? '' : 'muted'}`}>{busy.has(n.id) ? 'đang phục vụ' : 'chờ việc'} · {fmtMoney(getType(n.type).equip.daily)}/ngày</span>
            </li>
          ))}
          {!eqs.length && <li className="muted small">Chưa có máy. Đặt máy từ Thư viện → Máy móc thi công.</li>}
        </ul>
      </div>
    </div>
  );
}

function Missions() {
  const sim = useProject((s) => s.sim);
  return (
    <ul className="st-missions">
      {MISSIONS.map((m) => (
        <li key={m.id} className={sim.missions[m.id] ? 'is-done' : ''}>
          <span>{sim.missions[m.id] ? '✔' : '○'}</span>
          <span>{m.title}</span>
          <small className="muted">
            {m.reward.money ? `+${fmtMoney(m.reward.money)} ` : ''}
            {m.reward.xp ? `+${m.reward.xp} XP` : ''}
          </small>
        </li>
      ))}
    </ul>
  );
}

function Log() {
  const log = useProject((s) => s.sim.log);
  return (
    <ul className="st-log" aria-live="polite">
      {!log.length && <li className="muted">Chưa có hoạt động.</li>}
      {log.slice(0, 40).map((l, i) => (
        <li key={i} className={l.tone ? `tone-${l.tone}` : ''}>
          <time>Ngày {l.day}</time> {l.text}
        </li>
      ))}
    </ul>
  );
}

export default function BottomBar() {
  const tab = useEditor((s) => s.bottomTab);
  const TABS = [
    ['tools', 'Công cụ dựng'],
    ['res', 'Nhân lực & máy'],
    ['missions', 'Nhiệm vụ'],
    ['log', 'Nhật ký'],
  ];
  return (
    <section className="st-bottom panel">
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' is-active' : ''}`} onClick={() => editor.set({ bottomTab: id })}>
            {label}
          </button>
        ))}
      </div>
      <div className="st-bottom__body">{tab === 'tools' ? <Tools /> : tab === 'res' ? <Resources /> : tab === 'missions' ? <Missions /> : <Log />}</div>
    </section>
  );
}
