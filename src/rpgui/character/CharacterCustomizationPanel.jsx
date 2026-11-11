// Bảng tuỳ chỉnh bên phải: tab Thông tin · Ngoại hình · Trang phục · Bảo hộ PPE · Phụ kiện (mỗi tab cuộn riêng)
import { session } from '../session.js';
import { DATA } from '../../rpg/data.js';
import { applyPreset, randomCharacter } from '../../rpg/AvatarCustomizationSystem.js';
import { defaultAppearance } from '../../rpg/AppearanceSystem.js';
import { listAssets } from '../../rpg/CharacterAssetRegistry.js';
import { Section, Cards, Badge } from './controls.jsx';
import { FrameThumb } from './Thumbs.jsx';
import { LIGHT_PRESETS, QUALITY } from './studioPresets.js';
import { DEV } from './useCharacterEditor.js';
import AppearanceTab from './AppearanceTab.jsx';
import OutfitTab from './OutfitTab.jsx';
import PPETab from './PPETab.jsx';
import AccessoriesTab from './AccessoriesTab.jsx';

export const TABS = [
  ['info', 'Thông tin', 'ⓘ'],
  ['appearance', 'Ngoại hình', '☺'],
  ['outfit', 'Trang phục', '👕'],
  ['ppe', 'Bảo hộ PPE', '⛑'],
  ['accessories', 'Phụ kiện', '🎒'],
];

function InfoTab({ ed, nameError }) {
  const c = ed.character;
  const roleId = session.profile?.career?.roleId;
  const role = roleId ? DATA.roleById[roleId] : null;
  const opts = (o) => Object.entries(o).map(([id, v]) => ({ id, label: v.label }));
  return (
    <div className="cc-tab" data-testid="tab-info">
      <Section title="Nhận dạng">
        <label className="cc-field">
          <span>Tên nhân vật</span>
          <input className={`cc-input${nameError ? ' is-bad' : ''}`} maxLength={24} value={c.name} placeholder="Ví dụ: Minh Anh" onChange={(e) => ed.patch('name', e.target.value)} aria-invalid={!!nameError} data-testid="inp-name" />
          {nameError && <small className="cc-warn">{nameError}</small>}
        </label>
        <div className="cc-kv">
          <span>Mã nhân vật</span>
          <code data-testid="char-code">{c.code}</code>
          <span>Vị trí hiện tại</span>
          <b>{role ? role.title : 'Chưa chọn (bước 2)'}</b>
        </div>
      </Section>
      <Section title="Dáng người" locked={ed.locked.includes('bodyFrame')} lockText={`Bộ dựng “${ed.asset.label}” chưa hỗ trợ đổi dáng người.`}>
        <Cards
          label="Dáng người"
          cols={2}
          options={DATA.appearance.bodyFrame.options}
          value={c.appearance.bodyFrame}
          onChange={(f) => ed.patch('appearance', (a) => ({ ...defaultAppearance(f), skin: a.skin, hairColor: a.hairColor }))}
          thumb={(o) => <FrameThumb frame={o.id} />}
          testid="cards-frame"
        />
      </Section>
      <Section title="Mẫu nhanh" hint="Giữ nguyên tên & mã">
        <div className="cc-row">
          {DATA.characterPresets.map((p) => (
            <button key={p.id} className="cc-btn cc-btn--sm" onClick={() => ed.setCharacter((x) => applyPreset(x, p))} data-id={p.id}>
              {p.label}
            </button>
          ))}
          <button className="cc-btn cc-btn--sm" onClick={() => ed.setCharacter((x) => ({ ...randomCharacter(), name: x.name, code: x.code }))} data-testid="btn-random">
            🎲 Ngẫu nhiên
          </button>
        </div>
      </Section>
      <Section title="Bộ dựng nhân vật">
        <div className="cc-items">
          {listAssets({ dev: DEV }).map((a) => (
            <button key={a.id} className={`cc-item${ed.prefs.rendererId === a.id ? ' is-on' : ''}`} aria-pressed={ed.prefs.rendererId === a.id} onClick={() => ed.setPref('rendererId', a.id)} data-id={a.id}>
              <span className="cc-item__icon" aria-hidden>
                {a.kind === 'gltf' ? '📦' : '🧩'}
              </span>
              <span className="cc-item__body">
                <b>{a.label}</b>
                <span className="cc-badges">
                  <Badge>{a.kind === 'gltf' ? 'GLTF + AnimationMixer' : 'Dựng thủ tục'}</Badge>
                  {a.dev && <Badge tone="warn">Kiểm thử</Badge>}
                </span>
                <small className="muted">Giấy phép: {a.license}</small>
              </span>
            </button>
          ))}
        </div>
        <p className="small muted">Nhân vật được dựng bằng hình khối thủ tục (bán thực tế, không phải photorealistic). Có thể thay bằng model GLB có rig hợp lệ — xem public/assets/characters/README.md.</p>
      </Section>
      <Section title="Hiển thị studio">
        <span className="cc-sub__label">Ánh sáng</span>
        <Cards label="Ánh sáng" cols={3} options={opts(LIGHT_PRESETS)} value={ed.prefs.preset} onChange={(v) => ed.setPref('preset', v)} testid="cards-light" />
        <span className="cc-sub__label">Chất lượng đồ hoạ</span>
        <Cards label="Chất lượng" cols={3} options={opts(QUALITY)} value={ed.prefs.quality} onChange={(v) => ed.setPref('quality', v)} testid="cards-quality" />
      </Section>
    </div>
  );
}

export default function CharacterCustomizationPanel({ ed, tab, setTab, nameError }) {
  return (
    <div className="cc-panel">
      <div className="cc-tabs" role="tablist" aria-label="Tuỳ chỉnh nhân vật">
        {TABS.map(([id, l, ic]) => (
          <button key={id} role="tab" id={`cc-tab-${id}`} aria-selected={tab === id} aria-controls="cc-tabpanel" className={`cc-tabbtn${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)} data-tab={id}>
            <span aria-hidden>{ic}</span> {l}
          </button>
        ))}
      </div>
      <div className="cc-panel__body" role="tabpanel" id="cc-tabpanel" aria-labelledby={`cc-tab-${tab}`}>
        {tab === 'info' && <InfoTab ed={ed} nameError={nameError} />}
        {tab === 'appearance' && <AppearanceTab ed={ed} />}
        {tab === 'outfit' && <OutfitTab ed={ed} />}
        {tab === 'ppe' && <PPETab ed={ed} />}
        {tab === 'accessories' && <AccessoriesTab ed={ed} />}
      </div>
    </div>
  );
}
