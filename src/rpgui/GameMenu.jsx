// Menu ESC: tiếp tục, lưu, tủ đồ & PPE, đổi nghề, đổi công trường, sơ đồ tổ chức, cài đặt, chỉnh sửa công trình (khi có quyền)
import { useState } from 'react';
import { session, useSession } from './session.js';
import { useCharacterEditor } from './character/useCharacterEditor.js';
import { PreviewStage } from './character/CharacterCreatorScreen.jsx';
import CharacterCustomizationPanel from './character/CharacterCustomizationPanel.jsx';
import { RoleDetail } from './RoleSelect.jsx';
import { OrgChart } from './SiteSelect.jsx';
import { rolesByGroup } from '../rpg/RoleManagementSystem.js';
import { DATA } from '../rpg/data.js';
import './character/creator.css';

/** Tủ đồ trong game: dùng chung bộ tuỳ chỉnh với màn hình tạo nhân vật; PPE bắt buộc bị khoá khi đang ở công trường */
function Wardrobe() {
  useSession();
  const ed = useCharacterEditor('world');
  const [tab, setTab] = useState('ppe');
  return (
    <div className="cc-wardrobe" data-testid="wardrobe">
      <PreviewStage ed={ed} compact keyboard={false} />
      <CharacterCustomizationPanel ed={ed} tab={tab} setTab={setTab} />
    </div>
  );
}

function ChangeRole({ onDone }) {
  const [sel, setSel] = useState(session.roleId);
  const [msg, setMsg] = useState(null);
  return (
    <div className="rp-two">
      <div className="rp-list">
        {rolesByGroup().map((g) => (
          <section key={g.id}>
            <h4>
              {g.id}. {g.label}
            </h4>
            <div className="rp-chips">
              {g.roles.map((r) => (
                <button key={r.id} className={`rp-chip${sel === r.id ? ' is-active' : ''}`} onClick={() => (setSel(r.id), setMsg(null))}>
                  {r.title}
                  {r.id === session.roleId && ' ✓'}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div>
        <RoleDetail role={DATA.roleById[sel]} />
        {msg && <p className="bad small">{msg}</p>}
        <div className="btn-row">
          <button
            className="btn btn--primary"
            onClick={() => {
              const r = session.joinSite(session.siteKey, sel);
              if (r.error) return setMsg(`${r.error}${r.canIntern ? ' — bạn có thể xin chuyển ở chế độ thực tập.' : ''}`);
              session.chooseRole(sel);
              session.enterSite(session.siteKey);
              session.notify(`Đã chuyển sang vị trí ${DATA.roleById[sel].title}. Nhân vật và XP được giữ nguyên; nhiệm vụ & quyền truy cập đã cập nhật.`, 'ok');
              onDone();
            }}
          >
            Xin chuyển vị trí
          </button>
          <button
            className="btn"
            onClick={() => {
              const r = session.joinSite(session.siteKey, sel, 'intern');
              if (r.error) return setMsg(r.error);
              session.enterSite(session.siteKey);
              onDone();
            }}
          >
            Chuyển ở chế độ thực tập
          </button>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const s = useSession((x) => x.profile.settings);
  const set = (k) => (e) => session.setSettings({ [k]: e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value) });
  return (
    <div className="rp-settings">
      <label className="rp-field">
        <span>Tốc độ camera bám theo: {s.cameraSpeed.toFixed(1)}</span>
        <input type="range" min={0.3} max={2.5} step={0.1} value={s.cameraSpeed} onChange={set('cameraSpeed')} />
      </label>
      <label className="rp-field">
        <span>Độ nhạy chuột: {s.mouseSensitivity.toFixed(1)}</span>
        <input type="range" min={0.3} max={2.5} step={0.1} value={s.mouseSensitivity} onChange={set('mouseSensitivity')} />
      </label>
      <label className="st-check">
        <input type="checkbox" checked={s.mouseLook !== false} onChange={set('mouseLook')} /> Chuột điều khiển camera: bấm vào cảnh để khoá con trỏ, di chuột để xoay (Esc để thả). Tắt thì giữ chuột & kéo để xoay
      </label>
      <label className="rp-field">
        <span>Chất lượng đồ hoạ (công trường 3D)</span>
        <select className="input" value={s.graphicsQuality} onChange={(e) => session.setSettings({ graphicsQuality: e.target.value })}>
          <option value="low">Thấp — máy yếu, ưu tiên tốc độ</option>
          <option value="medium">Trung bình — cân bằng (mặc định)</option>
          <option value="high">Cao — bóng đổ nét hơn, có phản chiếu môi trường</option>
        </select>
      </label>
      <label className="st-check">
        <input type="checkbox" checked={s.beginner} onChange={set('beginner')} /> Chế độ người mới: tự hiện vạch dẫn đường tới mục tiêu
      </label>
      <label className="st-check">
        <input type="checkbox" checked={s.explore} onChange={set('explore')} /> Chế độ khám phá tự do: ẩn thẻ nhiệm vụ, không tự dẫn đường
      </label>
      <p className="small muted">Điều kiện an toàn bắt buộc (PPE, huấn luyện, vùng cấm) luôn được áp dụng ở mọi chế độ.</p>
    </div>
  );
}

export default function GameMenu({ onClose, onLeave, onChangeSite, onOpenStudio, onHelp }) {
  const [tab, setTab] = useState('main');
  const canEdit = session.canEdit();
  const TABS = [
    ['main', 'Menu'],
    ['wardrobe', 'Trang phục & PPE'],
    ['role', 'Đổi nghề / vị trí'],
    ['org', 'Sơ đồ tổ chức'],
    ['settings', 'Cài đặt'],
  ];
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Menu" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card panel rp-dialog is-wide">
        <header className="modal__head">
          <h2>Menu</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="tabs tabs--wrap">
          {TABS.map(([id, l]) => (
            <button key={id} className={`tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
              {l}
            </button>
          ))}
        </div>
        <div className="modal__body">
          {tab === 'main' && (
            <div className="rp-menu">
              <button className="btn btn--primary btn--lg" onClick={onClose}>
                ▶ Tiếp tục
              </button>
              <button className="btn btn--lg" onClick={() => (session.save().ok ? session.notify('Đã lưu game', 'ok') : session.notify('Không lưu được', 'bad'), onClose())}>
                💾 Lưu game
              </button>
              <button className="btn btn--lg" onClick={() => (onClose(), onHelp())}>
                🎮 Trợ giúp điều khiển
              </button>
              <button className="btn btn--lg" onClick={onChangeSite}>
                🏗 Đổi công trường
              </button>
              <button className="btn btn--lg" disabled={!canEdit} title={canEdit ? '' : 'Vị trí của bạn không có quyền chỉnh sửa công trình'} onClick={onOpenStudio}>
                ✎ Chế độ chỉnh sửa công trình {canEdit ? '' : '(không có quyền)'}
              </button>
              <button className="btn btn--lg" onClick={onLeave}>
                ⏏ Thoát về màn hình chính
              </button>
            </div>
          )}
          {tab === 'wardrobe' && <Wardrobe />}
          {tab === 'role' && <ChangeRole onDone={onClose} />}
          {tab === 'org' && <OrgChart site={session.world.site} siteProgress={session.sp} />}
          {tab === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
}
