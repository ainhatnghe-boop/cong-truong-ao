// Panel phải: thông số đối tượng đang chọn. Form tham số SINH TỰ ĐỘNG từ lược đồ trong ObjectRegistry
// → sửa là mô hình 3D tái tạo ngay (thanh trượt gộp thành 1 bước Undo).
import { project, useProject, updateNode, deleteNodes, duplicateNodes, groupNodes, ungroup, reparent, setWorld, updateMeta } from '../engine/ProjectManager.js';
import { getType, LEVELS, isBuildable } from '../engine/ObjectRegistry.js';
import { progressOf, startNodes, estimateDays } from '../engine/ConstructionSimulationEngine.js';
import { worldOf } from '../engine/PlacementSystem.js';
import { sample, earthwork, TERRAIN_TYPES } from '../engine/TerrainEngine.js';
import { build } from '../engine/ParametricGeometryEngine.js';
import { SKILLS, MATERIALS } from '../engine/materials.js';
import { fmtMoney, fmtDays, actPayment } from '../engine/EconomyManager.js';
import { editor, useEditor, select } from './editorStore.js';

const deg = (r) => Math.round(((r * 180) / Math.PI) * 10) / 10;

function Num({ label, value, onChange, min, max, step = 0.1, unit, slider = true }) {
  return (
    <label className="st-field">
      <span>
        {label}
        {unit && <small className="muted"> ({unit})</small>}
      </span>
      <div className="st-field__row">
        {slider && min != null && <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />}
        <input className="input" type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? Math.round(value * 1000) / 1000 : ''} onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))} />
      </div>
    </label>
  );
}

function ParamField({ node, p }) {
  const v = node.params[p.key];
  const set = (val) => updateNode(node.id, { params: { [p.key]: val } }, { coalesce: `param:${node.id}:${p.key}`, label: `Sửa ${p.label.toLowerCase()} · ${node.name}` });
  if (p.type === 'enum')
    return (
      <label className="st-field">
        <span>{p.label}</span>
        <select className="input" value={v} onChange={(e) => set(e.target.value)}>
          {p.options.map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </select>
      </label>
    );
  if (p.type === 'bool')
    return (
      <label className="st-check">
        <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} /> {p.label}
      </label>
    );
  return <Num label={p.label} unit={p.unit} value={v} min={p.min} max={p.max} step={p.step} onChange={set} />;
}

function Construction({ node, editable }) {
  const sim = useProject((s) => s.sim);
  const mode = useProject((s) => s.doc.meta.mode);
  const st = sim.nodes[node.id];
  const pr = progressOf(node, st);
  const asg = sim.assign?.[node.id];
  const crewsAvg = Math.max(1, Math.round(Object.values(sim.crews).reduce((a, b) => a + b, 0) / 5));
  return (
    <section className="section">
      <header className="section__head">
        <h3>Thi công</h3>
        <span className={`chip st-status st-status--${pr.status}`}>{pr.status === 'done' ? 'Đã bàn giao' : pr.status === 'active' ? 'Đang thi công' : 'Kế hoạch'}</span>
      </header>
      <div className="progress">
        <div className="progress__bar" style={{ width: `${pr.overall * 100}%` }} />
      </div>
      <p className="small muted">
        {Math.round(pr.overall * 100)}% · {pr.geo.totals.parts.toLocaleString('vi-VN')} cấu kiện · {Math.round(pr.geo.totals.volume).toLocaleString('vi-VN')} m³ hình học
      </p>
      <ul className="st-acts">
        {pr.geo.plan.map((a, k) => (
          <li key={k} className={k === pr.k && pr.status === 'active' ? 'is-current' : ''}>
            <div className="st-acts__head">
              <span>
                {k + 1}. {a.label}
              </span>
              <i className="st-skill" style={{ '--c': SKILLS[a.skill].color }}>
                {SKILLS[a.skill].label}
              </i>
            </div>
            <div className="progress">
              <div className="progress__bar" style={{ width: `${pr.frac[k] * 100}%`, background: SKILLS[a.skill].color }} />
            </div>
            <small className="muted">
              {Math.round(a.work)} tổ-ngày · vật tư {fmtMoney(a.cost)} · thanh toán {fmtMoney(actPayment(a))} · {a.idx.length} cấu kiện
            </small>
          </li>
        ))}
      </ul>
      {asg && pr.status === 'active' && (
        <p className={`small ${asg.crews ? '' : 'bad'}`}>
          {asg.crews ? `Đang có ${asg.crews} tổ ${SKILLS[asg.skill].label} · hệ số máy ×${asg.factor.toFixed(2)}` : `Chờ tổ ${SKILLS[asg.skill].label}`}
          {asg.liftMissing && ' · thiếu cẩu cho cấu kiện cao (năng suất giảm)'}
        </p>
      )}
      <dl className="kv">
        <div>
          <dt>Dự toán vật tư</dt>
          <dd>{fmtMoney(pr.geo.totals.cost)}</dd>
        </div>
        <div>
          <dt>Tổng công</dt>
          <dd>{Math.round(pr.geo.totals.work).toLocaleString('vi-VN')} tổ-ngày</dd>
        </div>
        <div>
          <dt>Thời gian ước tính</dt>
          <dd>{fmtDays(estimateDays(node, crewsAvg))} (với ~{crewsAvg} tổ/kỹ năng)</dd>
        </div>
        {st?.spent != null && (
          <div>
            <dt>Đã chi vật tư</dt>
            <dd>{fmtMoney(st.spent)}</dd>
          </div>
        )}
      </dl>
      {!st?.started && (
        <button className="btn btn--primary" onClick={() => project.setSim(startNodes(project.doc(), project.sim(), [node.id]))}>
          ⚒ Khởi công {mode === 'simple' ? '(chế độ Đơn giản tự khởi công khi Vận hành)' : ''}
        </button>
      )}
    </section>
  );
}

function NodeInspector({ id }) {
  const doc = useProject((s) => s.doc);
  const mode = useEditor((s) => s.mode);
  const node = doc.nodes[id];
  const T = getType(node.type);
  const editable = mode === 'edit' && !node.locked;
  const containers = Object.values(doc.nodes).filter((n) => getType(n.type).container && n.id !== id);
  const w = worldOf(doc, id);
  const ground = sample(doc.site.terrain, w.p[0], w.p[2]);
  const setPos = (k, v) => {
    const p = [...node.t.p];
    p[k] = v;
    updateNode(id, { t: { p } }, { coalesce: `pos:${id}:${k}`, label: `Di chuyển ${node.name}` });
  };
  return (
    <>
      <div className="st-insp__head">
        <span className="st-insp__icon">{T.icon}</span>
        <div>
          <input className="input st-insp__name" value={node.name} onChange={(e) => updateNode(id, { name: e.target.value }, { coalesce: `name:${id}`, label: 'Đổi tên' })} aria-label="Tên đối tượng" />
          <small className="muted">
            {T.label} · <code>{id}</code>
          </small>
        </div>
      </div>
      {node.locked && <p className="small muted">🔒 Đối tượng đang khoá: không di chuyển, sửa thông số hay xoá được.</p>}
      <fieldset className="st-fs" disabled={!editable}>
        <legend>Vị trí & hướng</legend>
        <label className="st-field">
          <span>Thuộc nút</span>
          <select className="input" value={node.parentId ?? ''} onChange={(e) => reparent(id, e.target.value || null)}>
            <option value="">(gốc dự án)</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="st-xyz">
          <Num label="X" value={node.t.p[0]} onChange={(v) => setPos(0, v)} slider={false} step={0.5} />
          <Num label="Cao độ Y" value={node.t.p[1]} onChange={(v) => setPos(1, v)} slider={false} step={0.1} />
          <Num label="Z" value={node.t.p[2]} onChange={(v) => setPos(2, v)} slider={false} step={0.5} />
        </div>
        <Num label="Góc xoay" unit="°" value={deg(node.t.ry)} min={-180} max={180} step={1} onChange={(v) => updateNode(id, { t: { ry: (v * Math.PI) / 180 } }, { coalesce: `rot:${id}`, label: `Xoay ${node.name}` })} />
        <p className="small muted">
          Toạ độ thế giới: {w.p.map((v) => v.toFixed(1)).join(' · ')} · mặt đất {ground.toFixed(2)} m
        </p>
        {!T.container && (
          <button className="btn btn--sm" onClick={() => setWorld(id, { p: [w.p[0], ground, w.p[2]], ry: w.ry }, { label: 'Đặt xuống mặt đất' })}>
            ⤓ Đặt xuống mặt đất
          </button>
        )}
      </fieldset>
      {!!T.params.length && (
        <fieldset className="st-fs" disabled={!editable}>
          <legend>{T.container ? 'Phân cấp' : 'Thông số (tạo hình theo tham số)'}</legend>
          {T.params.map((p) => (
            <ParamField key={p.key} node={node} p={p} />
          ))}
        </fieldset>
      )}
      {T.equip && (
        <section className="section">
          <header className="section__head">
            <h3>Máy móc</h3>
          </header>
          <dl className="kv">
            <div>
              <dt>Phạm vi tác động</dt>
              <dd>{T.equip.range} m (vòng vàng trên mặt đất)</dd>
            </div>
            <div>
              <dt>Tăng năng suất</dt>
              <dd>
                {Object.entries(T.equip.boost)
                  .map(([k, v]) => `${SKILLS[k].label} +${Math.round(v * 100)}%`)
                  .join(' · ')}
              </dd>
            </div>
            {T.equip.lift && (
              <div>
                <dt>Nâng hạ</dt>
                <dd>Cho phép thi công cấu kiện cao &gt; 12 m</dd>
              </div>
            )}
            <div>
              <dt>Huy động / vận hành</dt>
              <dd>
                {fmtMoney(T.equip.mobilize)} một lần · {fmtMoney(T.equip.daily)}/ngày
              </dd>
            </div>
          </dl>
        </section>
      )}
      {isBuildable(node.type) && <Construction node={node} editable={editable} />}
      <div className="btn-row">
        <button className="btn" disabled={mode !== 'edit'} onClick={() => select(duplicateNodes([id])[0])} title="Nhân bản (Ctrl+D)">
          ⧉ Nhân bản
        </button>
        {T.container && (
          <button className="btn" disabled={mode !== 'edit'} onClick={() => ungroup(id) && select(null)} title="Bỏ nhóm (Ctrl+Shift+G)">
            ⊟ Bỏ nhóm
          </button>
        )}
        <button className="btn" onClick={() => editor.set({ focusAt: Date.now() })} title="Đưa camera tới (F)">
          ◎ Xem
        </button>
        <button className="btn st-danger" disabled={mode !== 'edit' || node.locked} onClick={() => deleteNodes([id]) && select(null)} title="Xoá (Delete)">
          🗑 Xoá
        </button>
      </div>
    </>
  );
}

function MultiInspector({ ids }) {
  const doc = useProject((s) => s.doc);
  const mode = useEditor((s) => s.mode);
  const nodes = ids.map((id) => doc.nodes[id]).filter(Boolean);
  const cost = nodes.reduce((s, n) => s + (build(n)?.totals.cost ?? 0), 0);
  return (
    <>
      <h2 className="st-insp__title">{nodes.length} đối tượng được chọn</h2>
      <p className="small muted">Dự toán vật tư cộng dồn: {fmtMoney(cost)}</p>
      <ul className="docs">
        {nodes.map((n) => (
          <li key={n.id}>
            <button className="idlink" onClick={() => select(n.id)}>
              {getType(n.type).icon} {n.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="btn-row">
        {LEVELS.slice(0, 3).map((l) => (
          <button key={l.id} className="btn" disabled={mode !== 'edit'} onClick={() => select(groupNodes(ids, l.id, `${l.label} mới`))}>
            ⊞ Nhóm thành {l.label.toLowerCase()}
          </button>
        ))}
        <button className="btn" disabled={mode !== 'edit'} onClick={() => editor.set({ selection: duplicateNodes(ids) })}>
          ⧉ Nhân bản
        </button>
        <button className="btn" onClick={() => project.setSim(startNodes(doc, project.sim(), ids))}>
          ⚒ Khởi công
        </button>
        <button className="btn st-danger" disabled={mode !== 'edit'} onClick={() => deleteNodes(ids) && select(null)}>
          🗑 Xoá
        </button>
      </div>
    </>
  );
}

function ProjectInspector() {
  const doc = useProject((s) => s.doc);
  const sim = useProject((s) => s.sim);
  const nodes = Object.values(doc.nodes);
  const built = nodes.filter((n) => isBuildable(n.type));
  const cost = built.reduce((s, n) => s + build(n).totals.cost, 0);
  const done = built.filter((n) => sim.nodes[n.id]?.complete).length;
  const ew = earthwork(doc.site.terrain);
  return (
    <>
      <h2 className="st-insp__title">Thông tin dự án</h2>
      <label className="st-field">
        <span>Tên dự án</span>
        <input className="input" value={doc.meta.name} onChange={(e) => e.target.value.trim() && updateMeta({ name: e.target.value })} />
      </label>
      <label className="st-field">
        <span>Công ty</span>
        <input className="input" value={doc.meta.company} onChange={(e) => updateMeta({ company: e.target.value })} />
      </label>
      <dl className="kv">
        <div>
          <dt>Loại hình</dt>
          <dd>{doc.meta.category}</dd>
        </div>
        <div>
          <dt>Bản đồ</dt>
          <dd>
            {doc.site.width} × {doc.site.depth} m · {TERRAIN_TYPES.find((t) => t.id === doc.site.terrain.type)?.label} · ô lưới {doc.site.terrain.cell} m
          </dd>
        </div>
        <div>
          <dt>Đối tượng</dt>
          <dd>
            {nodes.length} (công trình/cấu kiện {built.length}, đã bàn giao {done})
          </dd>
        </div>
        <div>
          <dt>Dự toán vật tư toàn dự án</dt>
          <dd className={cost > doc.meta.budget ? 'bad' : ''}>
            {fmtMoney(cost)} / ngân sách {fmtMoney(doc.meta.budget)}
          </dd>
        </div>
        <div>
          <dt>Đào / đắp đất</dt>
          <dd>
            {Math.round(ew.cut).toLocaleString('vi-VN')} m³ / {Math.round(ew.fill).toLocaleString('vi-VN')} m³
          </dd>
        </div>
        <div>
          <dt>Vật liệu</dt>
          <dd className="small">{Object.values(MATERIALS).filter((m) => m.price).length} loại PBR có đơn giá mô phỏng</dd>
        </div>
      </dl>
      <p className="small muted">Bấm vào đối tượng trong cảnh hoặc cây dự án để xem & sửa thông số. Shift+bấm để chọn nhiều rồi nhóm.</p>
    </>
  );
}

export default function Inspector() {
  const selection = useEditor((s) => s.selection);
  const exists = useProject((s) => selection.filter((id) => s.doc.nodes[id]));
  return (
    <aside className="st-right panel" aria-label="Thông số">
      <div className="st-right__body">{exists.length === 1 ? <NodeInspector id={exists[0]} key={exists[0]} /> : exists.length > 1 ? <MultiInspector ids={exists} /> : <ProjectInspector />}</div>
    </aside>
  );
}
