// Panel trái: Cây dự án (tìm kiếm, lọc, ẩn/khoá) + Thư viện đối tượng (theo danh mục, mở khoá theo cấp)
import { useMemo, useState } from 'react';
import { useProject, updateNode, addNode, reparent } from '../engine/ProjectManager.js';
import { CATEGORIES, LEVELS, getType, typesIn } from '../engine/ObjectRegistry.js';
import { progressOf } from '../engine/ConstructionSimulationEngine.js';
import { levelOf } from '../engine/EconomyManager.js';
import { editor, useEditor, select, setTool } from './editorStore.js';
import { cameraRef } from './StudioScene.jsx';
import * as THREE from 'three';

function TreeNode({ id, doc, sim, children, depth, visibleIds, open, setOpen, selection }) {
  const n = doc.nodes[id];
  const T = getType(n.type);
  const kids = children[id] ?? [];
  if (visibleIds && !visibleIds.has(id)) return null;
  const pr = T.gen ? progressOf(n, sim.nodes[id]) : null;
  const isOpen = open[id] !== false;
  const lvl = T.container ? LEVELS.find((l) => l.id === n.params.level)?.label : null;
  return (
    <li>
      <div
        className={`st-tree__row${selection.includes(id) ? ' is-active' : ''}${n.hidden ? ' is-hidden' : ''}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        draggable={!n.locked}
        onDragStart={(e) => e.dataTransfer.setData('text/node', id)}
        onDragOver={(e) => T.container && e.preventDefault()}
        onDrop={(e) => {
          const src = e.dataTransfer.getData('text/node');
          if (src && src !== id) reparent(src, id);
        }}
      >
        {kids.length ? (
          <button className="st-tree__twist" onClick={() => setOpen({ ...open, [id]: !isOpen })} aria-label={isOpen ? 'Thu gọn' : 'Mở rộng'}>
            {isOpen ? '▾' : '▸'}
          </button>
        ) : (
          <span className="st-tree__twist" />
        )}
        <button className="st-tree__name" onClick={(e) => select(id, e.shiftKey || e.ctrlKey)} onDoubleClick={() => (select(id), editor.set({ focusAt: Date.now() }))} title={`${T.label} · ${id}`}>
          <span className="st-tree__icon">{T.icon}</span>
          <span className="ellipsis">{n.name}</span>
          {lvl && <small className="muted"> · {lvl}</small>}
        </button>
        {pr && <i className={`st-dot st-dot--${pr.status}`} title={`${pr.status === 'done' ? 'Đã bàn giao' : pr.status === 'active' ? 'Đang thi công' : 'Kế hoạch'} · ${Math.round(pr.overall * 100)}%`} />}
        <button className="st-tree__flag" onClick={() => updateNode(id, { hidden: !n.hidden }, { label: n.hidden ? `Hiện ${n.name}` : `Ẩn ${n.name}` })} title={n.hidden ? 'Hiện' : 'Ẩn'} aria-label={n.hidden ? 'Hiện' : 'Ẩn'}>
          {n.hidden ? '◌' : '◉'}
        </button>
        <button className="st-tree__flag" onClick={() => updateNode(id, { locked: !n.locked }, { label: n.locked ? `Mở khoá ${n.name}` : `Khoá ${n.name}` })} title={n.locked ? 'Mở khoá' : 'Khoá'} aria-label={n.locked ? 'Mở khoá' : 'Khoá'}>
          {n.locked ? '🔒' : '🔓'}
        </button>
      </div>
      {isOpen && kids.length > 0 && (
        <ul>
          {kids.map((c) => (
            <TreeNode key={c} id={c} doc={doc} sim={sim} children={children} depth={depth + 1} visibleIds={visibleIds} open={open} setOpen={setOpen} selection={selection} />
          ))}
        </ul>
      )}
    </li>
  );
}

function ProjectTree() {
  const doc = useProject((s) => s.doc);
  const sim = useProject((s) => s.sim);
  const selection = useEditor((s) => s.selection);
  const search = useEditor((s) => s.search);
  const filterCat = useEditor((s) => s.filterCat);
  const [open, setOpen] = useState({});
  const children = useMemo(() => {
    const m = { __root: [] };
    for (const n of Object.values(doc.nodes)) (m[n.parentId ?? '__root'] ??= []).push(n.id);
    for (const k of Object.keys(m)) m[k].sort((a, b) => doc.nodes[a].order - doc.nodes[b].order);
    return m;
  }, [doc.nodes]);
  // lọc: giữ nút khớp + toàn bộ tổ tiên của nó
  const visibleIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && filterCat === 'all') return null;
    const keep = new Set();
    for (const n of Object.values(doc.nodes)) {
      const T = getType(n.type);
      const hit = (!q || n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || T.label.toLowerCase().includes(q)) && (filterCat === 'all' || T.category === filterCat);
      if (!hit) continue;
      for (let c = n; c; c = c.parentId ? doc.nodes[c.parentId] : null) keep.add(c.id);
    }
    return keep;
  }, [doc.nodes, search, filterCat]);
  const count = Object.keys(doc.nodes).length;
  const addContainer = (level) => {
    const c = cameraRef.current;
    const t = c ? c.getTarget(new THREE.Vector3()) : { x: 0, z: 0 };
    const lv = LEVELS.find((l) => l.id === level);
    const id = addNode('container', { world: { p: [t.x, 0, t.z], ry: 0 }, params: { level }, name: `${lv.label} mới` });
    if (id) select(id);
  };
  return (
    <div className="st-tree">
      <div className="st-tree__tools">
        <input className="input" placeholder="Tìm đối tượng, id, loại…" value={search} onChange={(e) => editor.set({ search: e.target.value })} aria-label="Tìm đối tượng" />
        <select className="input" value={filterCat} onChange={(e) => editor.set({ filterCat: e.target.value })} aria-label="Lọc theo loại">
          <option value="all">Mọi loại</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="btn-row btn-row--tight">
        <button className="btn btn--sm" onClick={() => addContainer('area')}>
          ＋ Khu vực
        </button>
        <button className="btn btn--sm" onClick={() => addContainer('zone')}>
          ＋ Hạng mục
        </button>
        <button className="btn btn--sm" onClick={() => addContainer('structure')}>
          ＋ Công trình
        </button>
      </div>
      <p className="muted small">
        {count} đối tượng · kéo thả vào nút ▣ để chuyển cấp · Shift+bấm để chọn nhiều
      </p>
      <ul
        className="st-tree__list"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (e.target.closest('.st-tree__row')) return;
          const src = e.dataTransfer.getData('text/node');
          if (src) reparent(src, null);
        }}
      >
        <li className="st-tree__root muted small">◆ {doc.meta.name}</li>
        {(children.__root ?? []).map((id) => (
          <TreeNode key={id} id={id} doc={doc} sim={sim} children={children} depth={0} visibleIds={visibleIds} open={open} setOpen={setOpen} selection={selection} />
        ))}
        {!count && <li className="muted small st-empty">Bản đồ trống. Mở tab Thư viện để thêm cấu kiện hoặc công trình tham số.</li>}
      </ul>
    </div>
  );
}

function Library() {
  const placeType = useEditor((s) => s.placeType);
  const tool = useEditor((s) => s.tool);
  const mode = useEditor((s) => s.mode);
  const xp = useProject((s) => s.sim.xp);
  const lv = levelOf(xp);
  return (
    <div className="st-lib">
      {mode !== 'edit' && <p className="muted small">Chuyển sang ✎ Chỉnh sửa để đặt đối tượng.</p>}
      {CATEGORIES.filter((c) => c.id !== 'container').map((c) => (
        <section key={c.id}>
          <h4>{c.label}</h4>
          <div className="st-lib__grid">
            {typesIn(c.id).map((t) => {
              const locked = (t.unlock ?? 1) > lv;
              return (
                <button
                  key={t.type}
                  className={`st-lib__item${tool === 'place' && placeType === t.type ? ' is-active' : ''}`}
                  disabled={locked || mode !== 'edit'}
                  onClick={() => setTool('place', { placeType: t.type })}
                  title={locked ? `Mở khoá ở cấp ${t.unlock}` : `Đặt ${t.label} (bấm lên mặt đất; giữ Shift để đặt liên tiếp)`}
                >
                  <span className="st-lib__icon">{locked ? '🔒' : t.icon}</span>
                  <span>{t.label}</span>
                  {locked && <small>Cấp {t.unlock}</small>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function LeftPanel() {
  const tab = useEditor((s) => s.leftTab);
  return (
    <aside className="st-left panel">
      <div className="tabs" role="tablist">
        {[
          ['tree', 'Cây dự án'],
          ['lib', 'Thư viện'],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' is-active' : ''}`} onClick={() => editor.set({ leftTab: id })}>
            {label}
          </button>
        ))}
      </div>
      <div className="st-left__body">{tab === 'tree' ? <ProjectTree /> : <Library />}</div>
    </aside>
  );
}
