// ============================================================
//  SITE 3D Studio — khung ứng dụng: bố cục panel, vòng lặp mô phỏng, phím tắt, tự lưu, thông báo.
//  Bố cục: Trên = dự án/tiền/XP/thời gian · Trái = cây dự án & thư viện · Giữa = 3D
//          Phải = thông số · Dưới = công cụ, nhân lực & máy, nhiệm vụ, nhật ký
// ============================================================
import { useEffect, useState } from 'react';
import { project, useProject, deleteNodes, duplicateNodes, groupNodes, ungroup } from '../engine/ProjectManager.js';
import { tick, autoHire, progressOf } from '../engine/ConstructionSimulationEngine.js';
import { build } from '../engine/ParametricGeometryEngine.js';
import { getType } from '../engine/ObjectRegistry.js';
import { saveProject } from '../engine/SaveManager.js';
import { editor, useEditor, select, setTool } from './editorStore.js';
import StudioScene from './StudioScene.jsx';
import StudioTopBar, { doSave, setRunning } from './StudioTopBar.jsx';
import LeftPanel from './LeftPanel.jsx';
import Inspector from './Inspector.jsx';
import BottomBar from './BottomBar.jsx';
import StartScreen, { OpenDialog } from './StartScreen.jsx';
import './studio.css';

const AUTOSAVE_MS = 60000;

// Hook CHỈ ĐỌC cho kiểm thử tự động (scripts E2E): tóm tắt trạng thái, không cho phép sửa.
if (typeof window !== 'undefined')
  window.__ctao = () => {
    const { doc, sim, past } = project.get();
    if (!doc) return null;
    const sel = editor.get().selection;
    const n = doc.nodes[sel[0]];
    const B = Object.values(doc.nodes).find((x) => x.type === 'asm.building');
    return {
      site: { width: doc.site.width, depth: doc.site.depth, type: doc.site.terrain.type },
      nodes: Object.keys(doc.nodes).length,
      types: Object.values(doc.nodes).map((x) => x.type),
      selection: sel,
      selectedType: n?.type,
      selectedRy: n?.t.ry,
      selectedX: n?.t.p[0],
      selectedParts: n ? build(n)?.totals.parts : null,
      history: past.length,
      day: sim.day,
      money: sim.money,
      progressB: B ? progressOf(B, sim.nodes[B.id])?.overall : null,
    };
  };

/** Vòng lặp mô phỏng: speed ngày / giây */
function useSimulationLoop() {
  const running = useProject((s) => s.sim?.running);
  const speed = useProject((s) => s.sim?.speed ?? 1);
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      const { doc, sim } = project.get();
      if (!sim?.running) return;
      let s = tick(doc, sim);
      if (doc.meta.mode === 'simple' && s.day % 5 === 0) s = autoHire(doc, s);
      project.setSim(s);
    }, 1000 / speed);
    return () => clearInterval(t);
  }, [running, speed]);
}

/** Dọn lựa chọn trỏ tới đối tượng không còn tồn tại (sau Undo/Xoá/Mở dự án) */
function useSelectionHygiene() {
  const doc = useProject((s) => s.doc);
  useEffect(
    () => {
      if (!doc) return;
      const sel = editor.get().selection;
      const keep = sel.filter((id) => doc.nodes[id]);
      if (keep.length !== sel.length) editor.set({ selection: keep });
    },
    [doc],
  );
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || editor.get().screen !== 'editor') return;
      const ed = editor.get();
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const edit = ed.mode === 'edit';
      if (ctrl && k === 'z' && !e.shiftKey) return e.preventDefault(), project.undo();
      if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) return e.preventDefault(), project.redo();
      if (ctrl && k === 's') return e.preventDefault(), doSave();
      if (ctrl && k === 'd' && edit && ed.selection.length) return e.preventDefault(), editor.set({ selection: duplicateNodes(ed.selection) });
      if (ctrl && k === 'g' && edit) {
        e.preventDefault();
        if (e.shiftKey) ed.selection.forEach((id) => getType(project.doc().nodes[id]?.type)?.container && ungroup(id));
        else if (ed.selection.length) select(groupNodes(ed.selection, 'group'));
        return;
      }
      if ((k === 'delete' || k === 'backspace') && edit && ed.selection.length) return deleteNodes(ed.selection) && select(null);
      if (k === 'escape') return setTool('select', { placeType: null }), editor.set({ selection: ed.tool === 'select' ? [] : ed.selection });
      if (k === ' ' && ed.mode === 'play') return e.preventDefault(), setRunning(!project.sim().running);
      if (ctrl) return;
      if (k === 'q' || k === 'w') setTool('select', { gizmo: 'translate' });
      if (k === 'e' && edit) setTool('select', { gizmo: 'rotate' });
      if (k === 't' && edit) setTool(ed.tool === 'terrain' ? 'select' : 'terrain');
      if (k === 'g') editor.set({ grid: !ed.grid });
      if (k === 'f') editor.set({ focusAt: Date.now() });
      if (k === 'p') editor.set({ view: ed.view === 'plan' ? 'persp' : 'plan' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function useAutosave() {
  useEffect(() => {
    const t = setInterval(() => {
      const s = project.get();
      if (!s.doc || !s.dirty || editor.get().screen !== 'editor') return;
      const r = saveProject(s.doc, s.sim);
      if (r.ok) project.markSaved();
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, []);
}

function Notice() {
  const notice = useProject((s) => s.notice);
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (!notice) return undefined;
    setShown(notice);
    const t = setTimeout(() => setShown((n) => (n === notice ? null : n)), 4200);
    return () => clearTimeout(t);
  }, [notice]);
  if (!shown) return null;
  return (
    <div className={`st-notice tone-bg-${shown.tone}`} role="status">
      {shown.text}
    </div>
  );
}

function Editor({ onHome }) {
  const panels = useEditor((s) => s.panels);
  const dialog = useEditor((s) => s.dialog);
  const tool = useEditor((s) => s.tool);
  const mode = useEditor((s) => s.mode);
  useSimulationLoop();
  useSelectionHygiene();
  return (
    <div className={`st-app${panels.left ? '' : ' no-left'}${panels.right ? '' : ' no-right'}${panels.bottom ? '' : ' no-bottom'}`}>
      <div className="st-stage">
        <StudioScene />
      </div>
      <StudioTopBar onHome={onHome} />
      {panels.left && <LeftPanel />}
      {panels.right && <Inspector />}
      {panels.bottom && <BottomBar />}
      <p className="st-hint">
        {mode === 'play'
          ? 'Đang VẬN HÀNH · Space: tạm dừng/tiếp tục · bấm đối tượng để theo dõi tiến độ'
          : tool === 'place'
            ? 'Bấm lên mặt đất hoặc lên công trình để đặt · Shift: đặt liên tiếp · Esc: huỷ'
            : tool === 'terrain'
              ? 'Kéo chuột trái để vẽ địa hình · chuột phải để xoay camera · T: thoát'
              : 'Q/W di chuyển · E xoay · Del xoá · Ctrl+D nhân bản · Ctrl+G nhóm · Ctrl+Z/Y · F xem · P mặt bằng · mũi tên: bay camera'}
      </p>
      <Notice />
      {dialog === 'open' && <OpenDialog onClose={() => editor.set({ dialog: null })} />}
    </div>
  );
}

export default function StudioApp({ onDemo, onRpg }) {
  const screen = useEditor((s) => s.screen);
  const hasDoc = useProject((s) => !!s.doc);
  useShortcuts();
  useAutosave();
  if (screen !== 'editor' || !hasDoc) return <StartScreen onDemo={onDemo} onRpg={onRpg} />;
  return (
    <Editor
      onHome={() => {
        const s = project.get();
        if (s.dirty && confirm('Dự án có thay đổi chưa lưu. Lưu trước khi thoát?')) doSave();
        project.setSim({ ...project.sim(), running: false });
        editor.set({ screen: 'start', selection: [] });
      }}
    />
  );
}
