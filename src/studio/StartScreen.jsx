// Màn hình bắt đầu + hộp thoại TẠO DỰ ÁN MỚI (Universal Project Generator) + MỞ DỰ ÁN
import { useState, useRef } from 'react';
import { project, createProject, PROJECT_CATEGORIES } from '../engine/ProjectManager.js';
import { TERRAIN_TYPES, SITE_SHAPES } from '../engine/TerrainEngine.js';
import { listSaves, loadProject, deleteSave, importFile } from '../engine/SaveManager.js';
import { fmtMoney } from '../engine/EconomyManager.js';
import { editor, useEditor } from './editorStore.js';
import { loadSampleProject } from './sample.js';

function openEditor() {
  editor.set({ screen: 'editor', dialog: null, selection: [], tool: 'select', mode: 'edit' });
}

/** Mở kết quả đọc dự án (đã migrate/sửa); báo cáo sửa lỗi nếu có */
export function openResult(r) {
  if (r.errors?.length) {
    alert(`Không mở được dự án:\n- ${r.errors.join('\n- ')}`);
    return false;
  }
  project.load(r.doc, r.sim);
  if (r.fixes?.length) project.notify(`Đã tự sửa ${r.fixes.length} điểm không nhất quán khi mở: ${r.fixes[0]}${r.fixes.length > 1 ? '…' : ''}`, 'warn');
  else project.notify(`Đã mở “${r.doc.meta.name}”`, 'ok');
  openEditor();
  return true;
}

export function NewProjectDialog({ onClose }) {
  const [f, setF] = useState({
    name: 'Dự án mới',
    company: 'Công ty của tôi',
    category: PROJECT_CATEGORIES[0],
    width: 400,
    depth: 300,
    shape: 'rect',
    terrain: 'flat',
    budget: 150000,
    targetDays: 720,
    mode: 'simple',
    zones: 0,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  const valid = f.name.trim() && f.width >= 50 && f.width <= 4000 && f.depth >= 50 && f.depth <= 4000 && f.budget > 0;
  const create = () => {
    const { doc, sim } = createProject(f);
    // tạo sẵn N nút khu vực trống (tuỳ chọn) — người chơi tự đặt vị trí, không áp bố cục
    let seq = 0;
    for (let i = 0; i < Math.min(12, f.zones); i++) {
      seq++;
      const id = `GRP-${String(seq).padStart(4, '0')}`;
      doc.nodes[id] = { id, type: 'container', name: `Khu vực ${String.fromCharCode(65 + i)}`, parentId: null, order: i, t: { p: [0, 0, 0], ry: 0 }, params: { level: 'area' }, locked: false, hidden: false };
    }
    doc.seq = seq;
    project.load(doc, sim);
    project.notify('Đã tạo bản đồ trống. Chọn đối tượng ở Thư viện để bắt đầu xây.', 'ok');
    openEditor();
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Tạo dự án mới" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card panel st-dialog">
        <header className="modal__head">
          <h2>TẠO DỰ ÁN MỚI</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal__body st-form">
          <label>
            Tên dự án
            <input className="input" value={f.name} onChange={set('name')} />
          </label>
          <label>
            Tên công ty
            <input className="input" value={f.company} onChange={set('company')} />
          </label>
          <label>
            Loại hình (chỉ để gợi ý, không giới hạn)
            <select className="input" value={f.category} onChange={set('category')}>
              {PROJECT_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Điều kiện địa hình
            <select className="input" value={f.terrain} onChange={set('terrain')}>
              {TERRAIN_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bản đồ – chiều dài (m)
            <input className="input" type="number" min={50} max={4000} step={10} value={f.width} onChange={set('width')} />
          </label>
          <label>
            Bản đồ – chiều rộng (m)
            <input className="input" type="number" min={50} max={4000} step={10} value={f.depth} onChange={set('depth')} />
          </label>
          <label>
            Hình dạng ranh giới
            <select className="input" value={f.shape} onChange={set('shape')}>
              {SITE_SHAPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số khu vực tạo sẵn (để trống bố cục)
            <input className="input" type="number" min={0} max={12} value={f.zones} onChange={set('zones')} />
          </label>
          <label>
            Ngân sách (triệu đồng) · {fmtMoney(f.budget)}
            <input className="input" type="number" min={1000} step={1000} value={f.budget} onChange={set('budget')} />
          </label>
          <label>
            Thời gian mục tiêu (ngày)
            <input className="input" type="number" min={30} step={30} value={f.targetDays} onChange={set('targetDays')} />
          </label>
          <fieldset className="st-seg">
            <legend>Chế độ chơi</legend>
            <label>
              <input type="radio" checked={f.mode === 'simple'} onChange={() => setF({ ...f, mode: 'simple' })} /> Đơn giản: tự khởi công, tự tuyển tổ còn thiếu
            </label>
            <label>
              <input type="radio" checked={f.mode === 'advanced'} onChange={() => setF({ ...f, mode: 'advanced' })} /> Nâng cao: tự khởi công từng đối tượng, tự quản lý tổ đội
            </label>
          </fieldset>
          <p className="muted small st-full">
            Diện tích bản đồ: {((f.width * f.depth) / 10000).toLocaleString('vi-VN')} ha. Dự án bắt đầu từ bản đồ trống: không có bố cục áp sẵn.
          </p>
        </div>
        <footer className="modal__foot btn-row">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn btn--primary" disabled={!valid} onClick={create}>
            Tạo dự án
          </button>
        </footer>
      </div>
    </div>
  );
}

export function OpenDialog({ onClose }) {
  const [saves, setSaves] = useState(listSaves());
  const file = useRef();
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Mở dự án" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card panel st-dialog">
        <header className="modal__head">
          <h2>Mở dự án</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal__body">
          {!saves.length && <p className="muted">Chưa có dự án nào được lưu trong trình duyệt này.</p>}
          <ul className="st-saves">
            {saves.map((s) => (
              <li key={s.id}>
                <button className="row" onClick={() => openResult(loadProject(s.id))}>
                  <span className="row__main">
                    <strong>{s.name}</strong>
                    <small>
                      {s.category} · {s.objects} đối tượng · ngày {s.day} · lưu {new Date(s.savedAt).toLocaleString('vi-VN')} · {(s.size / 1024).toFixed(0)} KB
                    </small>
                  </span>
                </button>
                <button
                  className="btn btn--icon"
                  aria-label={`Xoá bản lưu ${s.name}`}
                  title="Xoá bản lưu"
                  onClick={() => {
                    if (confirm(`Xoá bản lưu “${s.name}”?`)) {
                      deleteSave(s.id);
                      setSaves(listSaves());
                    }
                  }}
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        </div>
        <footer className="modal__foot btn-row">
          <input ref={file} type="file" accept=".json,application/json" hidden onChange={async (e) => e.target.files[0] && openResult(await importFile(e.target.files[0]))} />
          <button className="btn" onClick={() => file.current.click()}>
            ⇪ Nhập tệp .json
          </button>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function StartScreen({ onDemo, onRpg }) {
  const dialog = useEditor((s) => s.dialog);
  const hasSaves = listSaves().length > 0;
  return (
    <div className="st-start">
      <div className="st-start__card panel">
        <div className="st-start__brand">
          <span className="brand__logo" aria-hidden>
            ⛫
          </span>
          <div>
            <h1>SITE 3D Studio</h1>
            <p className="muted">Nền tảng mô phỏng xây dựng 3D tự do: dựng công trình từ cấu kiện và tham số, tổ chức thi công, quản lý tài nguyên.</p>
          </div>
        </div>
        <div className="st-start__actions">
          <button className="btn btn--primary btn--lg" onClick={() => editor.set({ dialog: 'new' })}>
            ＋ TẠO DỰ ÁN MỚI
          </button>
          <button className="btn btn--lg" onClick={() => editor.set({ dialog: 'open' })}>
            📂 Mở dự án {hasSaves ? `(${listSaves().length})` : ''}
          </button>
          <button
            className="btn btn--lg"
            onClick={() => {
              loadSampleProject();
              project.notify('Dự án kiểm thử: toà nhà 25 tầng + nhà thép 10 nhịp trên cùng công trường', 'ok');
              openEditor();
            }}
          >
            🧪 Dự án kiểm thử (toà nhà + nhà thép)
          </button>
          {onRpg && (
            <button className="btn btn--lg" onClick={onRpg}>
              ⛑ Công trường ảo · Nhập vai
            </button>
          )}
          <button className="btn btn--lg" onClick={onDemo}>
            🏗 Xem Công trường mẫu v0.1
          </button>
        </div>
        <p className="muted small">Thông số hình học chỉ phục vụ gameplay, không phải kết quả thiết kế kết cấu đạt tiêu chuẩn kỹ thuật.</p>
      </div>
      {dialog === 'new' && <NewProjectDialog onClose={() => editor.set({ dialog: null })} />}
      {dialog === 'open' && <OpenDialog onClose={() => editor.set({ dialog: null })} />}
    </div>
  );
}
