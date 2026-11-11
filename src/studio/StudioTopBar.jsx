// Thanh trên của Studio: dự án, tiền, XP/cấp, ngày; Edit/Play; tốc độ; Undo/Redo; Lưu/Mở/Xuất/Nhập; chất lượng; panel
import { useRef } from 'react';
import { project, useProject, updateMeta } from '../engine/ProjectManager.js';
import { saveProject, exportFile, importFile } from '../engine/SaveManager.js';
import { startNodes, autoHire } from '../engine/ConstructionSimulationEngine.js';
import { isBuildable } from '../engine/ObjectRegistry.js';
import { levelOf, xpForLevel, fmtMoney } from '../engine/EconomyManager.js';
import { editor, useEditor, togglePanel, QUALITY } from './editorStore.js';
import { openResult } from './StartScreen.jsx';

export function doSave() {
  const { doc, sim } = project.get();
  const r = saveProject(doc, sim);
  if (r.ok) {
    project.markSaved();
    project.notify(`Đã lưu “${doc.meta.name}” (${(r.size / 1024).toFixed(0)} KB)`, 'ok');
  } else project.notify(r.error, 'bad');
  return r.ok;
}

/** Vận hành: Đơn giản → tự khởi công mọi đối tượng chưa khởi công + tự tuyển tổ thiếu */
export function setRunning(run) {
  const { doc, sim } = project.get();
  if (!run) return project.setSim({ ...sim, running: false });
  let s = sim;
  if (doc.meta.mode === 'simple') {
    s = startNodes(doc, s, Object.values(doc.nodes).filter((n) => isBuildable(n.type) && !n.hidden).sort((a, b) => a.order - b.order).map((n) => n.id));
    s = autoHire(doc, s);
  }
  if (!Object.values(s.nodes).some((x) => x.started && !x.complete)) project.notify('Chưa có đối tượng nào được khởi công. Chọn đối tượng → “Khởi công”, hoặc dùng chế độ Đơn giản.', 'warn');
  project.setSim({ ...s, running: true });
  editor.set({ mode: 'play', tool: 'select' });
}

export default function StudioTopBar({ onHome }) {
  const meta = useProject((s) => s.doc.meta);
  const sim = useProject((s) => s.sim);
  const canUndo = useProject((s) => s.past.length > 0);
  const canRedo = useProject((s) => s.future.length > 0);
  const dirty = useProject((s) => s.dirty);
  const mode = useEditor((s) => s.mode);
  const quality = useEditor((s) => s.quality);
  const panels = useEditor((s) => s.panels);
  const night = useEditor((s) => s.night);
  const file = useRef();
  const lv = levelOf(sim.xp);
  const lo = xpForLevel(lv);
  const hi = xpForLevel(lv + 1);
  const late = sim.day > meta.targetDays;
  const allHidden = !panels.left && !panels.right && !panels.bottom;
  return (
    <header className="st-top panel">
      <button className="brand" onClick={onHome} title="Về màn hình bắt đầu">
        <span className="brand__logo" aria-hidden>
          ⛫
        </span>
        <span>
          <strong className="ellipsis">
            {meta.name}
            {dirty ? ' •' : ''}
          </strong>
          <small className="ellipsis">
            {meta.company} · {meta.category}
          </small>
        </span>
      </button>
      <div className="st-stats">
        <span className={`kpi${sim.money < 0 ? ' kpi--bad' : ''}`} title="Tiền hiện có (triệu đồng)">
          💰 <b>{fmtMoney(sim.money)}</b>
        </span>
        <span className="kpi st-xp" title={`${sim.xp} XP · cấp kế tiếp ở ${hi} XP`}>
          ★ <b>Cấp {lv}</b>
          <i style={{ width: `${Math.min(100, ((sim.xp - lo) / (hi - lo)) * 100)}%` }} />
        </span>
        <span className={`kpi${late ? ' kpi--warn' : ''}`} title={`Mục tiêu ${meta.targetDays} ngày`}>
          📅 <b>Ngày {sim.day}</b>
          <small>/{meta.targetDays}</small>
        </span>
      </div>
      <div className="st-seg-btn" role="group" aria-label="Chế độ">
        <button className={`btn${mode === 'edit' ? ' btn--primary' : ''}`} onClick={() => (setRunning(false), editor.set({ mode: 'edit' }))} title="Chỉnh sửa công trường (dừng mô phỏng)">
          ✎ <span className="btn__label">Chỉnh sửa</span>
        </button>
        <button className={`btn${mode === 'play' ? ' btn--primary' : ''}`} onClick={() => setRunning(true)} title="Vận hành thi công">
          ▶ <span className="btn__label">Vận hành</span>
        </button>
      </div>
      {mode === 'play' && (
        <div className="st-seg-btn" role="group" aria-label="Tốc độ">
          <button className="btn btn--icon" onClick={() => (sim.running ? setRunning(false) : setRunning(true))} aria-label={sim.running ? 'Tạm dừng' : 'Tiếp tục'} title={sim.running ? 'Tạm dừng (Space)' : 'Tiếp tục (Space)'}>
            {sim.running ? '❚❚' : '▶'}
          </button>
          {[1, 2, 5, 10].map((v) => (
            <button key={v} className={`btn btn--sm${sim.speed === v ? ' btn--primary' : ''}`} onClick={() => project.setSim({ ...project.sim(), speed: v })} title={`${v} ngày mô phỏng / giây`}>
              ×{v}
            </button>
          ))}
        </div>
      )}
      <label className="st-mode" title="Đơn giản: tự khởi công & tự tuyển tổ. Nâng cao: tự quản lý.">
        <select className="input" value={meta.mode} onChange={(e) => updateMeta({ mode: e.target.value })} aria-label="Cấp độ tương tác">
          <option value="simple">Đơn giản</option>
          <option value="advanced">Nâng cao</option>
        </select>
      </label>
      <nav className="actions">
        <button className="btn btn--icon" disabled={!canUndo} onClick={project.undo} title="Hoàn tác (Ctrl+Z)" aria-label="Hoàn tác">
          ↶
        </button>
        <button className="btn btn--icon" disabled={!canRedo} onClick={project.redo} title="Làm lại (Ctrl+Y)" aria-label="Làm lại">
          ↷
        </button>
        <button className="btn" onClick={doSave} title="Lưu vào trình duyệt (Ctrl+S)">
          💾 <span className="btn__label">Lưu</span>
        </button>
        <button className="btn btn--icon" onClick={() => editor.set({ dialog: 'open' })} title="Mở dự án" aria-label="Mở dự án">
          📂
        </button>
        <button className="btn btn--icon" onClick={() => exportFile(project.doc(), project.sim())} title="Xuất tệp .json" aria-label="Xuất tệp">
          ⇩
        </button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={async (e) => e.target.files[0] && openResult(await importFile(e.target.files[0]))} />
        <button className="btn btn--icon" onClick={() => file.current.click()} title="Nhập tệp .json" aria-label="Nhập tệp">
          ⇪
        </button>
        <select className="input st-quality" value={quality} onChange={(e) => editor.set({ quality: e.target.value })} title="Chất lượng đồ hoạ" aria-label="Chất lượng đồ hoạ">
          {Object.entries(QUALITY).map(([k, q]) => (
            <option key={k} value={k}>
              Đồ hoạ: {q.label}
            </option>
          ))}
        </select>
        <button className="btn btn--icon" onClick={() => editor.set({ night: !night })} title={night ? 'Ban ngày' : 'Ban đêm'} aria-label="Ngày/đêm">
          {night ? '☀' : '☾'}
        </button>
        <button
          className={`btn btn--icon${allHidden ? ' btn--primary' : ''}`}
          onClick={() => editor.set({ panels: allHidden ? { left: true, right: true, bottom: true } : { left: false, right: false, bottom: false } })}
          title="Phóng to không gian 3D (ẩn/hiện mọi panel)"
          aria-label="Phóng to 3D"
        >
          ⛶
        </button>
        <button className={`btn btn--icon${panels.left ? '' : ' is-off'}`} onClick={() => togglePanel('left')} title="Ẩn/hiện panel trái" aria-label="Panel trái">
          ◧
        </button>
        <button className={`btn btn--icon${panels.right ? '' : ' is-off'}`} onClick={() => togglePanel('right')} title="Ẩn/hiện panel phải" aria-label="Panel phải">
          ◨
        </button>
        <button className={`btn btn--icon${panels.bottom ? '' : ' is-off'}`} onClick={() => togglePanel('bottom')} title="Ẩn/hiện thanh dưới" aria-label="Thanh dưới">
          ⬓
        </button>
      </nav>
    </header>
  );
}
