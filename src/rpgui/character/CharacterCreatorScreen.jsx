// ============================================================
//  CharacterCreatorScreen — màn hình TẠO NHÂN VẬT điện ảnh (bố cục 3 cột):
//   TRÁI  : hành trình 4 bước (thu gọn được), tiến độ, quay lại không mất dữ liệu
//   GIỮA  : studio 3D (xoay/zoom/reset, góc xem, animation, ánh sáng) — nạp lười
//   PHẢI  : bảng tuỳ chỉnh 5 tab
//  mode 'new'  : chưa có hồ sơ → bản nháp tự lưu; Tiếp tục = tạo hồ sơ
//  mode 'edit' : đã có hồ sơ → tự lưu vào hồ sơ; Tiếp tục = sang bước chọn nghề
// ============================================================
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { session } from '../session.js';
import { DATA } from '../../rpg/data.js';
import { useCharacterEditor } from './useCharacterEditor.js';
import CharacterCustomizationPanel from './CharacterCustomizationPanel.jsx';
import { LIGHT_PRESETS } from './studioPresets.js';
import './creator.css';

const CharacterPreview3D = lazy(() => import('./CharacterPreview3D.jsx'));

const VIEWS = [
  ['full', 'Toàn thân', '1'],
  ['face', 'Khuôn mặt', '2'],
  ['ppe', 'Chi tiết PPE', '3'],
];
const ANIMS = [
  ['idle', 'Đứng'],
  ['walk', 'Đi bộ'],
  ['run', 'Chạy'],
  ['interact', 'Tương tác'],
  ['jump', 'Nhảy'],
];

export function JourneyPanel({ current = 0, onJump, collapsed, onToggle, fresh = false }) {
  const p = fresh ? null : session.profile;
  const done = [!!p, !!p?.career?.roleId, !!(p?.currentSite && p.sites?.[p.currentSite]?.joined), false];
  const steps = [
    ['Tạo nhân vật', 'Ngoại hình, trang phục, PPE'],
    ['Chọn nghề', 'Vị trí & lộ trình nghề nghiệp'],
    ['Chọn công trường', 'Dự án, tổ đội, điều kiện vào'],
    ['Bắt đầu hành trình', 'Vào cổng công trường'],
  ];
  const pct = Math.round((done.filter(Boolean).length / 4) * 100);
  return (
    <nav className={`cc-journey${collapsed ? ' is-collapsed' : ''}`} aria-label="Hành trình">
      <button className="cc-journey__toggle" onClick={onToggle} aria-label={collapsed ? 'Mở bảng hành trình' : 'Thu gọn bảng hành trình'} aria-expanded={!collapsed}>
        {collapsed ? '»' : '«'}
      </button>
      <div className="cc-journey__brand">
        <span aria-hidden>⛑</span>
        {!collapsed && (
          <div>
            <b>Công trường ảo</b>
            <small>Hành trình nhập vai</small>
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="cc-progress" aria-label={`Tiến độ ${pct}%`}>
          <div className="cc-progress__bar" style={{ width: `${Math.max(pct, 6)}%` }} />
          <small>Tiến độ {pct}%</small>
        </div>
      )}
      <ol className="cc-steps">
        {steps.map(([t, d], i) => {
          const can = i === current || (onJump && (i <= current + 1 || done[i - 1]));
          return (
            <li key={t} className={`cc-step${i === current ? ' is-current' : ''}${done[i] ? ' is-done' : ''}`}>
              <button disabled={!can} onClick={() => i !== current && onJump?.(i)} aria-current={i === current ? 'step' : undefined} title={t}>
                <span className="cc-step__num">{done[i] && i !== current ? '✓' : i + 1}</span>
                {!collapsed && (
                  <span className="cc-step__text">
                    <b>{t}</b>
                    <small>{d}</small>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {!collapsed && <p className="cc-journey__foot">Mọi thay đổi được lưu tự động. Quay lại bước trước không làm mất dữ liệu.</p>}
    </nav>
  );
}

export function PreviewStage({ ed, compact = false, keyboard = true }) {
  const [view, setView] = useState('full');
  const [anim, setAnim] = useState('idle');
  const [resetAt, setResetAt] = useState(0);
  const [help, setHelp] = useState(false);
  const onStatus = useCallback((s) => ed.setAssetStatus(s), [ed.setAssetStatus]);

  useEffect(() => {
    if (!keyboard) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      // phím vật lý (e.code): không bị bộ gõ tiếng Việt ảnh hưởng
      const digit = /^(Digit|Numpad)([1-3])$/.exec(e.code ?? '')?.[2] ?? e.key;
      const v = VIEWS.find((x) => x[2] === digit);
      if (v) setView(v[0]);
      else if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') (setView('full'), setResetAt(Date.now()));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard]);

  const st = ed.assetStatus;
  return (
    <div className={`cc-stage${compact ? ' is-compact' : ''}`} data-testid="cc-stage">
      <Suspense
        fallback={
          <div className="cc-loading" role="status">
            <span className="cc-spinner" aria-hidden /> Đang tải studio 3D…
          </div>
        }
      >
        <CharacterPreview3D character={ed.character} equipped={ed.ppe.wearing} anim={anim} view={view} resetAt={resetAt} rendererId={ed.prefs.rendererId} onStatus={onStatus} preset={ed.prefs.preset} quality={ed.prefs.quality} keyboard={keyboard} />
      </Suspense>
      <div className="cc-stage__top">
        <div className="cc-seg" role="group" aria-label="Góc xem">
          {VIEWS.map(([id, l, k]) => (
            <button key={id} className={view === id ? 'is-on' : ''} aria-pressed={view === id} onClick={() => setView(id)} title={`${l} (phím ${k})`} data-view={id}>
              {l}
            </button>
          ))}
        </div>
        <button className="cc-icon" onClick={() => (setView('full'), setResetAt(Date.now()))} title="Đặt lại camera (R)" aria-label="Đặt lại camera" data-testid="btn-reset-cam">
          ⟲
        </button>
        <button className={`cc-icon${help ? ' is-on' : ''}`} onClick={() => setHelp((h) => !h)} aria-expanded={help} title="Hướng dẫn điều khiển camera" aria-label="Hướng dẫn điều khiển camera">
          ?
        </button>
      </div>
      {help && (
        <div className="cc-help" role="note">
          <b>Điều khiển camera</b>
          <ul>
            <li>Giữ chuột trái và kéo: xoay quanh nhân vật</li>
            <li>Cuộn chuột: phóng to / thu nhỏ (có giới hạn)</li>
            <li>← → ↑ ↓: xoay · + / −: phóng to / thu nhỏ</li>
            <li>1 / 2 / 3: toàn thân / khuôn mặt / chi tiết PPE · R: đặt lại</li>
          </ul>
        </div>
      )}
      {st?.state === 'error' && (
        <div className="cc-alert" role="alert">
          ⚠ {st.message}
        </div>
      )}
      {st?.state === 'loaded' && ed.asset.kind === 'gltf' && <div className="cc-chip-info">Model GLTF đã nạp · clip: {st.clips.join(', ') || 'không có'}</div>}
      <div className="cc-stage__bottom">
        <div className="cc-seg" role="group" aria-label="Thử chuyển động">
          {ANIMS.map(([id, l]) => (
            <button key={id} className={anim === id ? 'is-on' : ''} aria-pressed={anim === id} onClick={() => setAnim(id)} data-anim={id}>
              {l}
            </button>
          ))}
        </div>
        {!compact && <span className="cc-stage__light">💡 {LIGHT_PRESETS[ed.prefs.preset]?.label}</span>}
      </div>
    </div>
  );
}

export default function CharacterCreatorScreen({ mode = 'new', onBack, onContinue, onJump }) {
  const ed = useCharacterEditor(mode);
  const [tab, setTab] = useState('info');
  const [nameError, setNameError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1180);

  useEffect(() => {
    if (nameError && ed.character.name.trim()) setNameError('');
  }, [ed.character.name, nameError]);

  const next = () => {
    if (!ed.character.name.trim()) {
      setNameError('Hãy đặt tên nhân vật');
      setTab('info');
      return;
    }
    ed.flush();
    if (mode === 'new') {
      const r = session.createCharacter({ ...ed.character, name: ed.character.name.trim() });
      if (r.error) return setNameError(r.error);
      session.setSettings({ characterRenderer: ed.prefs.rendererId, lightPreset: ed.prefs.preset, creatorQuality: ed.prefs.quality });
    }
    onContinue?.();
  };
  const jump = (i) => {
    if (i === 0) return;
    if (mode === 'new' || !ed.character.name.trim()) return next();
    ed.flush();
    onJump?.(i);
  };

  const saved = ed.savedAt ? new Date(ed.savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;
  return (
    <div className="cc-screen" data-testid="cc-screen">
      <JourneyPanel current={0} fresh={mode === 'new'} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onJump={jump} />
      <main className="cc-main">
        <header className="cc-head">
          <div>
            <h1>{mode === 'new' ? 'TẠO NHÂN VẬT' : 'TUỲ CHỈNH NHÂN VẬT'}</h1>
            <p>
              Bước 1/4 · {ed.character.name.trim() || 'Nhân vật mới'} · <code>{ed.character.code}</code> · {DATA.outfitById[ed.character.outfit.id]?.label}
            </p>
          </div>
          <span className="cc-saved" aria-live="polite">
            {saved ? `✓ Đã lưu tự động ${saved}` : mode === 'new' ? 'Bản nháp được lưu tự động' : 'Thay đổi được lưu tự động'}
          </span>
        </header>
        <div className="cc-body">
          <PreviewStage ed={ed} />
          <CharacterCustomizationPanel ed={ed} tab={tab} setTab={setTab} nameError={nameError} />
        </div>
        <footer className="cc-foot">
          {onBack && (
            <button className="cc-btn" onClick={() => (ed.flush(), onBack())}>
              ← Quay lại
            </button>
          )}
          {confirmReset ? (
            <span className="cc-confirm" role="alertdialog" aria-label="Xác nhận khôi phục">
              Khôi phục ngoại hình, trang phục, PPE về mặc định? (giữ tên & mã)
              <button
                className="cc-btn cc-btn--danger cc-btn--sm"
                onClick={() => {
                  ed.reset();
                  setConfirmReset(false);
                }}
                autoFocus
              >
                Khôi phục
              </button>
              <button className="cc-btn cc-btn--sm" onClick={() => setConfirmReset(false)}>
                Huỷ
              </button>
            </span>
          ) : (
            <button className="cc-btn" onClick={() => setConfirmReset(true)} data-testid="btn-reset">
              ↺ Khôi phục mặc định
            </button>
          )}
          <span className="cc-spacer" />
          <button className="cc-btn cc-btn--primary" onClick={next} data-testid="btn-continue">
            Tiếp tục: Chọn nghề →
          </button>
        </footer>
      </main>
    </div>
  );
}
