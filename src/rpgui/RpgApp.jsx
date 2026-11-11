// ============================================================
//  CÔNG TRƯỜNG ẢO – NHẬP VAI: luồng màn hình + điều khiển bàn phím.
//  Lần đầu: TẠO NHÂN VẬT → CHỌN NGHỀ → CHỌN CÔNG TRƯỜNG → xuất hiện tại cổng.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { session, useSession } from './session.js';
import CharacterCreatorScreen from './character/CharacterCreatorScreen.jsx';
import RoleSelect from './RoleSelect.jsx';
import SiteSelect from './SiteSelect.jsx';
import WorldView, { camState, releaseMouse } from './WorldView.jsx';
import Hud, { Journal, GuideHistory, ControlsHelp, WorkflowPanel } from './Hud.jsx';
import { WorldMap } from './MapView.jsx';
import DialogLayer from './Dialogs.jsx';
import GameMenu from './GameMenu.jsx';
import { DATA } from '../rpg/data.js';
import { levelOf } from '../rpg/RoleManagementSystem.js';
import './rpg.css';

function TitleScreen({ go, onStudio, onDemo, fixes }) {
  const p = session.profile;
  return (
    <div className="st-start">
      <div className="st-start__card panel">
        <div className="st-start__brand">
          <span className="brand__logo" aria-hidden>
            ⛑
          </span>
          <div>
            <h1>Công trường ảo · Nhập vai</h1>
            <p className="muted">Tạo nhân vật, chọn nghề, vào công trường 3D, học quy trình thi công (đơn giản hoá cho trò chơi) cùng AI hướng dẫn.</p>
          </div>
        </div>
        <div className="st-start__actions">
          {p && p.currentSite && p.sites[p.currentSite]?.joined && (
            <button className="btn btn--primary btn--lg" onClick={() => go('world')}>
              ▶ Tiếp tục: {p.character.name} · {DATA.roleById[p.sites[p.currentSite].joined.roleId]?.title} · cấp {levelOf(p.career.xp)}
            </button>
          )}
          {p && (
            <button className="btn btn--lg" onClick={() => go(p.career.roleId ? 'site' : 'role')}>
              🏗 Chọn công trường khác
            </button>
          )}
          {p && (
            <button className="btn btn--lg" onClick={() => go('customize')} data-testid="btn-customize">
              ☺ Tùy chỉnh nhân vật: {p.character.name}
            </button>
          )}
          <button
            className={`btn btn--lg${p ? '' : ' btn--primary'}`}
            onClick={() => {
              if (p && !confirm('Tạo nhân vật mới sẽ thay thế hồ sơ hiện tại. Tiếp tục?')) return;
              go('create');
            }}
          >
            ＋ {p ? 'Tạo nhân vật mới' : 'TẠO NHÂN VẬT'}
          </button>
          <button className="btn btn--lg" onClick={onStudio}>
            ⛫ SITE 3D Studio (xây dựng tự do)
          </button>
          <button className="btn btn--lg" onClick={onDemo}>
            🏗 Công trường mẫu v0.1
          </button>
        </div>
        {fixes?.length > 0 && <p className="small muted">Đã tự sửa hồ sơ khi mở: {fixes.join('; ')}</p>}
        <p className="small muted">Quy trình, PPE, giấy phép và vùng an toàn trong game là mô phỏng học tập, không thay thế quy định an toàn thực tế.</p>
      </div>
    </div>
  );
}

function World({ onExit, onChangeSite, onOpenStudio }) {
  const input = useRef({ f: 0, r: 0, run: false });
  const keys = useRef(new Set());
  const [overlay, setOverlay] = useState(null); // 'menu' | 'journal' | 'guide' | 'help' | 'workflow'
  const [camMode, setCamMode] = useState('third');
  const dialog = useSession((s) => s.dialog);
  const mapOpen = useSession((s) => s.mapOpen);
  const blocking = !!dialog || !!overlay || mapOpen;

  useEffect(() => {
    const typing = (e) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
    // Dùng PHÍM VẬT LÝ (e.code) → không bị bộ gõ tiếng Việt (Telex: W → ư) làm hỏng; mũi tên cũng di chuyển được
    const MOVE = { KeyW: 'w', ArrowUp: 'w', KeyS: 's', ArrowDown: 's', KeyA: 'a', ArrowLeft: 'a', KeyD: 'd', ArrowRight: 'd', ShiftLeft: 'shift', ShiftRight: 'shift' };
    const keyOf = (e) => MOVE[e.code] ?? (e.code?.startsWith('Key') ? e.code.slice(3).toLowerCase() : e.key === 'Escape' ? 'escape' : (e.key ?? '').toLowerCase());
    const recompute = () => {
      const k = keys.current;
      input.current = { f: (k.has('w') ? 1 : 0) - (k.has('s') ? 1 : 0), r: (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0), run: k.has('shift') };
    };
    const down = (e) => {
      if (typing(e)) return;
      const k = keyOf(e);
      if (k === 'escape') {
        if (session.dialog) session.closeDialog();
        else if (session.mapOpen) session.closeMap();
        else setOverlay((o) => (o ? null : 'menu'));
        return;
      }
      if (session.dialog || session.mapOpen || overlayRef.current) return;
      if (MOVE[e.code]) {
        keys.current.add(k);
        recompute();
        e.preventDefault();
      }
      if (k === 'e' && !e.repeat) {
        session.setHold(true);
        session.pressInteract();
      }
      if (e.code === 'Space' && !e.repeat) {
        session.pressJump();
        e.preventDefault();
      }
      if (k === 'm') session.openMap();
      if (k === 'j') setOverlay('journal');
      if (k === 'h') setOverlay('guide');
      if (k === 'c') setCamMode((m) => (m === 'third' ? 'free' : 'third'));
    };
    const up = (e) => {
      const k = keyOf(e);
      keys.current.delete(k);
      recompute();
      if (k === 'e') session.setHold(false);
    };
    const blur = () => {
      keys.current.clear();
      recompute();
      session.setHold(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
  const overlayRef = useRef(null);
  overlayRef.current = overlay;
  const [mouseLocked, setMouseLocked] = useState(false);
  const mouseLook = useSession((s) => s.profile?.settings?.mouseLook !== false);
  useEffect(() => {
    const on = () => setMouseLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', on);
    return () => document.removeEventListener('pointerlockchange', on);
  }, []);
  // vào / rời công trường đối xứng trong vòng đời component (an toàn với React StrictMode)
  const [ready, setReady] = useState(!!session.world);
  useEffect(() => {
    if (!session.world) session.enterSite(session.profile.currentSite);
    camState.yaw = session.char.yaw + Math.PI;
    setReady(true);
    return () => session.leaveSite({ silent: true });
  }, []);
  useEffect(() => {
    if (blocking) {
      releaseMouse();
      keys.current.clear();
      input.current = { f: 0, r: 0, run: false };
    }
  }, [blocking]);

  if (!ready || !session.world) return <div className="rp-loading">Đang dựng công trường…</div>;
  return (
    <div className="rp-world">
      <div className="rp-stage">
        <WorldView inputRef={input} active={!blocking} camMode={camMode} />
      </div>
      <Hud onMenu={() => setOverlay('menu')} onWorkflow={() => setOverlay('workflow')} onJournal={() => setOverlay('journal')} onHelp={() => setOverlay('help')} />
      {camMode === 'free' && <div className="rp-cam-badge">Camera tự do · C để quay lại góc nhìn thứ ba</div>}
      {camMode === 'third' && !blocking && (
        <div className={`rp-mouse-hint${mouseLocked ? ' is-locked' : ''}`} data-testid="mouse-hint">
          {mouseLocked ? '🖱 Di chuột để xoay camera · Esc để thả · Chuột phải: tự đi tới' : mouseLook ? '🖱 Bấm trái để xoay camera · Chuột phải vào mặt đất: tự đi tới' : '🖱 Giữ chuột trái & kéo để xoay · Chuột phải vào mặt đất: tự đi tới'}
        </div>
      )}
      {mapOpen && <WorldMap />}
      {overlay === 'journal' && <Journal onClose={() => setOverlay(null)} />}
      {overlay === 'guide' && <GuideHistory onClose={() => setOverlay(null)} />}
      {overlay === 'help' && <ControlsHelp onClose={() => setOverlay(null)} />}
      {overlay === 'workflow' && <WorkflowPanel onClose={() => setOverlay(null)} />}
      {overlay === 'menu' && <GameMenu onClose={() => setOverlay(null)} onLeave={onExit} onChangeSite={onChangeSite} onOpenStudio={onOpenStudio} onHelp={() => setOverlay('help')} />}
      <DialogLayer />
    </div>
  );
}

export default function RpgApp({ onStudio, onDemo, onOpenStudio }) {
  const [screen, setScreen] = useState(null);
  const [fixes, setFixes] = useState([]);
  useSession();
  useEffect(() => {
    const r = session.load();
    setFixes(r.fixes ?? []);
    // vào game lần đầu: thẳng tới TẠO NHÂN VẬT
    setScreen(session.profile ? 'title' : 'create');
  }, []);
  const go = (s) => {
    setScreen(s); // World tự vào công trường khi mount
  };
  if (!screen) return null;
  // Hành trình 4 bước: 0 tạo nhân vật · 1 chọn nghề · 2 chọn công trường · 3 vào công trường
  const jump = (i) => {
    const p = session.profile;
    if (i === 1) setScreen('role');
    else if (i === 2 && p?.career?.roleId) setScreen('site');
    else if (i === 3 && p?.currentSite && p.sites?.[p.currentSite]?.joined) go('world');
    else setScreen(p?.career?.roleId ? 'site' : 'role');
  };
  if (screen === 'create' || screen === 'customize')
    return (
      <CharacterCreatorScreen
        key={screen}
        mode={screen === 'create' ? 'new' : 'edit'}
        onBack={session.profile ? () => setScreen('title') : null}
        onContinue={() => setScreen('role')}
        onJump={jump}
      />
    );
  if (screen === 'role')
    return (
      <RoleSelect
        onBack={() => setScreen('customize')}
        onChoose={(id) => {
          session.chooseRole(id);
          setScreen('site');
        }}
      />
    );
  if (screen === 'site') return <SiteSelect onBack={() => setScreen('role')} onJoined={() => go('world')} />;
  if (screen === 'world')
    return (
      <World
        onExit={() => setScreen('title')}
        onChangeSite={() => setScreen('site')}
        onOpenStudio={() => {
          const { doc, sim } = session.world;
          setScreen('title');
          onOpenStudio(doc, sim);
        }}
      />
    );
  return <TitleScreen go={go} fixes={fixes} onStudio={onStudio} onDemo={onDemo} />;
}
