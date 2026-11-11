// HUD nhập vai: chỉ hiển thị điều quan trọng NHẤT tại mỗi thời điểm; panel thu gọn được
import { useState } from 'react';
import { session, useSession } from './session.js';
import { Minimap } from './MapView.jsx';
import { xpForLevel } from '../rpg/RoleManagementSystem.js';
import { ONBOARD } from '../rpg/MissionSystem.js';
import { template } from '../rpg/DynamicWorkflowEngine.js';
import { DATA } from '../rpg/data.js';

const LEVEL_LABEL = { 1: 'Thông tin', 2: 'Chưa đủ điều kiện', 3: 'CẤM / NGUY HIỂM' };

export function ObjectiveCard({ onWorkflow, onHelp }) {
  const hud = useSession((s) => s.getHud());
  const [open, setOpen] = useState(true);
  const o = hud.objective;
  if (!o) return null;
  return (
    <section className={`rp-obj panel${open ? '' : ' is-collapsed'}`} aria-live="polite">
      <header>
        <small>{o.mission}</small>
        {o.step && <small className="muted"> · bước {o.step}</small>}
        <button className="btn btn--icon btn--sm" onClick={() => setOpen(!open)} aria-label={open ? 'Thu gọn' : 'Mở rộng'}>
          {open ? '▾' : '▸'}
        </button>
      </header>
      <h3>{o.title}</h3>
      {open && (
        <>
          <p className="small">{o.desc}</p>
          {!!o.blockers?.length && <p className="small bad">⛔ {o.blockers.join(' · ')}</p>}
          {o.next && <p className="small muted">Tiếp theo: {o.next}{o.parallel ? ' (có thể làm song song)' : ''}</p>}
          {hud.route && <p className="small rp-dist">➜ {hud.route.label}: {Math.round(hud.route.dist)} m</p>}
          <div className="btn-row btn-row--tight">
            <button className="btn btn--sm" onClick={() => session.openDialog({ kind: 'text', title: 'Tôi cần làm gì tiếp theo?', npc: true, lines: [o.title, o.desc, ...(o.blockers ?? []).map((b) => `Điều kiện còn thiếu: ${b}`), o.next ? `Sau đó: ${o.next}` : ''].filter(Boolean) })}>
              ❓ Tôi cần làm gì tiếp theo?
            </button>
            {o.target && (
              <button className="btn btn--sm btn--primary" onClick={() => session.routeTo(o.target, false, true)}>
                🧭 Dẫn tôi đến nơi làm việc
              </button>
            )}
            {session.route && (
              <button className="btn btn--sm" onClick={() => session.clearRoute()}>
                ✕ Huỷ tuyến
              </button>
            )}
            {session.sp?.task?.current && (
              <button className="btn btn--sm" onClick={onWorkflow}>
                📋 Xem quy trình
              </button>
            )}
            <button className="btn btn--sm" onClick={onHelp}>
              🎮 Trợ giúp điều khiển
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function StatusBar({ onMenu }) {
  const hud = useSession((s) => s.getHud());
  const lo = xpForLevel(hud.level);
  const hi = xpForLevel(hud.level + 1);
  return (
    <div className="rp-status panel">
      <button className="btn btn--icon btn--sm" onClick={onMenu} title="Menu (Esc)" aria-label="Menu">
        ☰
      </button>
      <span className="rp-status__name">
        <b>{hud.name}</b> · {hud.role}
        {hud.mode === 'intern' ? ' (thực tập)' : ''}
      </span>
      <span className="kpi" title={`${hud.xp} XP tổng · ${hud.roleXp} XP nghề`}>
        ★ Cấp {hud.level}
        <i className="rp-xpbar">
          <i style={{ width: `${Math.min(100, ((hud.xp - lo) / (hi - lo)) * 100)}%` }} />
        </i>
      </span>
      {hud.permits > 0 && <span className="kpi kpi--ok">📄 {hud.permits} PTW</span>}
      <span className="rp-status__site small muted ellipsis">{hud.site}</span>
    </div>
  );
}

function Prompt() {
  const hud = useSession((s) => s.getHud());
  if (!hud.prompt && hud.hold == null) return null;
  return (
    <div className="rp-prompt">
      {hud.prompt && (
        <div className="rp-prompt__box">
          <kbd>E</kbd> {hud.prompt.label.replace(/^(Giữ )?E – /, '')}
          {hud.prompt.label.startsWith('Giữ') && <small> (giữ phím)</small>}
          <small className="muted"> · {hud.prompt.target}</small>
        </div>
      )}
      {hud.hold != null && (
        <div className="rp-hold">
          <i style={{ width: `${Math.min(100, hud.hold * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function Warnings() {
  const hud = useSession((s) => s.getHud());
  const w = hud.warnings[0];
  if (!w) return null;
  return (
    <div className={`rp-warn rp-warn--${w.level}`} role="alert">
      <b>
        {w.level === 3 ? '⛔' : w.level === 2 ? '⚠' : 'ℹ'} Mức {w.level} · {LEVEL_LABEL[w.level]}
      </b>{' '}
      {w.name} {w.dist > 0 ? `(cách ${w.dist.toFixed(1)} m)` : '(bạn đang ở trong)'}
      {!!w.reasons.length && <div className="small">{w.reasons.join(' · ')}</div>}
    </div>
  );
}

function Notices() {
  const hud = useSession((s) => s.getHud());
  return (
    <div className="rp-notices">
      {hud.notices.map((n) => (
        <div key={n.id} className={`rp-notice tone-bg-${n.tone}`}>
          {n.text}
        </div>
      ))}
    </div>
  );
}

function GuideBubble() {
  const g = useSession((s) => s.guideBubble);
  if (!g) return null;
  return (
    <div className="rp-guide panel" role="status">
      <header>
        <span className="rp-npc-badge">NPC</span> 🤖 {DATA.dialogues.guideName}
      </header>
      {g.lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
      <div className="btn-row btn-row--tight">
        <button className="btn btn--sm btn--primary" onClick={() => session.dismissGuide()}>
          Đã hiểu
        </button>
        <small className="muted">H: xem lại hướng dẫn</small>
      </div>
    </div>
  );
}

/** Dải giai đoạn thi công / nhiệm vụ — gọn, có TÊN và trạng thái rõ ràng (✔ xong · ● đang làm · ○ chưa tới · ✗ hỏng),
 *  thay cho kiểu đánh số 1,2,3… vô nghĩa. Ưu tiên chuỗi nhập môn khi chưa xong, sau đó là quy trình đang làm. */
export function PhasePanel({ onOpenOnboarding, onOpenWorkflow }) {
  useSession();
  const [open, setOpen] = useState(true);
  const sp = session.sp;
  if (!sp) return null;
  let title;
  let steps; // [{ id, label, state: 'done'|'current'|'locked'|'failed' }]
  let onOpen;
  if (sp.onboarding.index < ONBOARD.steps.length) {
    title = ONBOARD.title;
    steps = ONBOARD.steps.map((s, i) => ({ id: s.id, label: s.title, state: i < sp.onboarding.index ? 'done' : i === sp.onboarding.index ? 'current' : 'locked' }));
    onOpen = onOpenOnboarding;
  } else if (sp.task?.current) {
    const inst = sp.task.current;
    const tpl = template(inst.templateId);
    title = `${tpl.label} · ${session.taskNode()?.name ?? ''}`;
    steps = tpl.steps
      .filter((s) => inst.status[s.id] !== 'dormant')
      .map((s) => ({ id: s.id, label: s.label, state: inst.status[s.id] === 'done' ? 'done' : inst.status[s.id] === 'failed' ? 'failed' : inst.status[s.id] === 'ready' ? 'current' : 'locked' }));
    onOpen = onOpenWorkflow;
  } else return null;
  const doneN = steps.filter((s) => s.state === 'done').length;
  return (
    <section className={`rp-phase panel${open ? '' : ' is-collapsed'}`} aria-label="Giai đoạn thi công">
      <header>
        <small title={title}>{title}</small>
        <small className="muted">
          {doneN}/{steps.length}
        </small>
        <button className="btn btn--icon btn--sm" onClick={() => setOpen(!open)} aria-label={open ? 'Thu gọn' : 'Mở rộng'}>
          {open ? '▾' : '▸'}
        </button>
      </header>
      {open && (
        <ol className="rp-phase__list">
          {steps.map((s) => (
            <li key={s.id} className={`is-${s.state}`} title={s.label}>
              <button onClick={onOpen} aria-current={s.state === 'current' ? 'step' : undefined}>
                <span className="rp-phase__dot" aria-hidden>
                  {s.state === 'done' ? '✔' : s.state === 'failed' ? '✗' : s.state === 'current' ? '●' : '○'}
                </span>
                <span className="rp-phase__label">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function WorkflowPanel({ onClose }) {
  useSession();
  const inst = session.sp?.task?.current;
  if (!inst) return null;
  const tpl = template(inst.templateId);
  const ICON = { done: '✔', ready: '▶', locked: '○', failed: '✗', skipped: '–', dormant: '·' };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Quy trình" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card panel rp-dialog">
        <header className="modal__head">
          <h2>📋 Quy trình: {tpl.label}</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal__body">
          <p className="small muted">Hạng mục: {session.taskNode()?.name}. Quy trình đơn giản hoá cho trò chơi, không phải biện pháp thi công được phê duyệt.</p>
          <ol className="rp-steps">
            {tpl.steps
              .filter((s) => inst.status[s.id] !== 'dormant' || !s.optional)
              .map((s) => (
                <li key={s.id} className={`is-${inst.status[s.id]}`}>
                  <span>{ICON[inst.status[s.id]]}</span>
                  <div>
                    <b>{s.label}</b>
                    {inst.status[s.id] === 'ready' && <div className="small">{s.hint}</div>}
                    {s.after?.length > 1 && inst.status[s.id] === 'locked' && <div className="small muted">Chờ: {s.after.map((a) => tpl.steps.find((x) => x.id === a).label).join(', ')}</div>}
                  </div>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

export function Journal({ onClose }) {
  useSession();
  const sp = session.sp;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Nhiệm vụ" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card panel rp-dialog is-wide">
        <header className="modal__head">
          <h2>📒 Nhiệm vụ (J)</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal__body">
          <h4>{ONBOARD.title}</h4>
          <ol className="rp-steps">
            {ONBOARD.steps.map((s, i) => {
              const st = i < sp.onboarding.index ? 'done' : i === sp.onboarding.index ? 'ready' : 'locked';
              return (
                <li key={s.id} className={`is-${st}`}>
                  <span>{st === 'done' ? '✔' : st === 'ready' ? '▶' : '○'}</span>
                  <div>
                    <b>{s.title}</b> <small className="muted">+{s.xp} XP{st === 'done' ? ' (đã nhận)' : ''}</small>
                    {st !== 'locked' && <div className="small">{s.desc}</div>}
                  </div>
                  {s.guide && st !== 'locked' && (
                    <button className="btn btn--sm" onClick={() => session.openDialog({ kind: 'text', title: `Hướng dẫn: ${s.title}`, npc: true, lines: session.profile.tutorial.history.find((h) => h.key === s.guide && h.siteKey === session.siteKey)?.lines ?? [s.desc] })}>
                      Hướng dẫn
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <h4>Nhiệm vụ theo nghề</h4>
          <p className="small">
            Đã hoàn thành {sp.task.done} nhiệm vụ. {sp.task.current ? `Đang làm: ${template(sp.task.current.templateId).label} — ${session.taskNode()?.name}` : 'Nhận nhiệm vụ mới tại Văn phòng chỉ huy.'}
          </p>
          <h4>Huấn luyện & giấy phép</h4>
          <p className="small">
            Huấn luyện: {session.trainings().map((t) => DATA.trainingById[t]?.label).join(', ') || 'chưa có'} · Giấy phép mô phỏng đang hiệu lực: {session.getHud().permits}
          </p>
          <h4>XP theo nghề</h4>
          <p className="small">
            {Object.entries(session.profile.career.roleXp)
              .map(([k, v]) => `${DATA.roleById[k].title}: ${v}`)
              .join(' · ')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GuideHistory({ onClose }) {
  const h = session.profile.tutorial.history.filter((x) => x.siteKey === session.siteKey);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Hướng dẫn" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card panel rp-dialog">
        <header className="modal__head">
          <h2>🤖 Xem lại hướng dẫn (H)</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal__body">
          {!h.length && <p className="muted">Chưa có hướng dẫn nào.</p>}
          {h.map((x, i) => (
            <div key={i} className="rp-q">
              {x.lines.map((l, j) => (
                <p key={j} className="small">
                  {l}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ControlsHelp({ onClose }) {
  const rows = [
    ['W A S D · ↑ ← ↓ →', 'Đi tới / trái / lùi / phải (dùng được cả khi đang bật bộ gõ tiếng Việt)'],
    ['Shift', 'Chạy'],
    ['Bấm vào cảnh rồi di chuột', 'Xoay camera (Esc để thả chuột) · cũng có thể giữ chuột & kéo · Cuộn: phóng to/thu nhỏ'],
    ['Chuột phải vào mặt đất', 'Nhân vật tự đi tới đó (tránh vật cản & vùng chưa được phép)'],
    ['E', 'Tương tác (giữ E với công việc cần thời gian)'],
    ['M', 'Bản đồ công trường'],
    ['J', 'Danh sách nhiệm vụ'],
    ['H', 'Xem lại hướng dẫn'],
    ['C', 'Đổi camera: thứ ba ↔ tự do'],
    ['Esc', 'Menu / đóng cửa sổ'],
  ];
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Trợ giúp điều khiển" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card panel rp-dialog">
        <header className="modal__head">
          <h2>🎮 Trợ giúp điều khiển</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal__body">
          <table className="table">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td>
                    <kbd>{k}</kbd>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Hud({ onMenu, onWorkflow, onJournal, onHelp }) {
  const explore = useSession((s) => s.profile.settings.explore);
  return (
    <>
      <StatusBar onMenu={onMenu} />
      {!explore && <ObjectiveCard onWorkflow={onWorkflow} onHelp={onHelp} />}
      <Minimap />
      {!explore && <PhasePanel onOpenOnboarding={onJournal} onOpenWorkflow={onWorkflow} />}
      <Warnings />
      <Prompt />
      <Notices />
      <GuideBubble />
      <p className="rp-keys">WASD / ↑↓←→ đi · Shift chạy · bấm vào cảnh rồi di chuột để xoay camera · chuột phải để tự đi tới · E tương tác · M bản đồ · J nhiệm vụ · H hướng dẫn · C camera · Esc menu</p>
    </>
  );
}
