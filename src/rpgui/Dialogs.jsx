// Hộp thoại game: văn bản, câu hỏi, danh sách kiểm tra, huấn luyện, PPE, giấy phép (mô phỏng), nghiệm thu, bảng HSE
import { useState } from 'react';
import { session, useSession } from './session.js';
import { DATA, ppeLabel } from '../rpg/data.js';

function Shell({ title, children, footer, npc, wide }) {
  return (
    <div className="modal rp-dialog-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal__card panel rp-dialog${wide ? ' is-wide' : ''}`}>
        <header className="modal__head">
          <h2>
            {npc && <span className="rp-npc-badge">NPC</span>} {title}
          </h2>
          <button className="btn btn--icon" onClick={() => session.closeDialog()} aria-label="Đóng (Esc)">
            ✕
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot btn-row">{footer}</footer>}
      </div>
    </div>
  );
}

function Feedback({ d }) {
  return d.feedback ? <p className="bad small rp-feedback">✗ {d.feedback}</p> : null;
}

function Quiz({ d }) {
  const [sel, setSel] = useState(null);
  return (
    <Shell title={d.title} footer={<button className="btn btn--primary" disabled={sel == null} onClick={() => session.submitDialog(sel)}>Xác nhận</button>}>
      <p>
        <b>{d.question}</b>
      </p>
      <div className="rp-options">
        {d.options.map((o, i) => (
          <label key={i} className={`rp-option${sel === i ? ' is-active' : ''}`}>
            <input type="radio" checked={sel === i} onChange={() => setSel(i)} /> {o}
          </label>
        ))}
      </div>
      <Feedback d={d} />
    </Shell>
  );
}

function Checklist({ d, items, title, intro, extra }) {
  const [sel, setSel] = useState([]);
  const toggle = (i) => setSel(sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i]);
  return (
    <Shell title={title ?? d.title} footer={<button className="btn btn--primary" onClick={() => session.submitDialog(sel)}>Xác nhận</button>}>
      {intro && <p className="small muted">{intro}</p>}
      <div className="rp-options">
        {items.map((t, i) => (
          <label key={i} className={`rp-option${sel.includes(i) ? ' is-active' : ''}`}>
            <input type="checkbox" checked={sel.includes(i)} onChange={() => toggle(i)} /> {t}
          </label>
        ))}
      </div>
      {extra}
      <Feedback d={d} />
    </Shell>
  );
}

function Training({ d }) {
  const [ans, setAns] = useState({});
  return (
    <Shell title={d.title} npc footer={<button className="btn btn--primary" disabled={Object.keys(ans).length < d.questions.length} onClick={() => session.submitDialog(d.questions.map((_, i) => ans[i]))}>Nộp bài</button>}>
      {d.questions.map((q, i) => (
        <div key={i} className="rp-q">
          <p>
            <b>
              {i + 1}. {q.q}
            </b>
          </p>
          <div className="rp-options">
            {q.options.map((o, j) => (
              <label key={j} className={`rp-option${ans[i] === j ? ' is-active' : ''}`}>
                <input type="radio" checked={ans[i] === j} onChange={() => setAns({ ...ans, [i]: j })} /> {o}
              </label>
            ))}
          </div>
        </div>
      ))}
      <Feedback d={d} />
    </Shell>
  );
}

function PPE({ d }) {
  const owned = useSession((s) => s.profile.ppe.owned);
  const optional = (d.optional ?? []).filter((x) => !owned.includes(x.id));
  return (
    <Shell title={d.title} footer={<button className="btn btn--primary" onClick={() => session.submitDialog({})}>{d.missing.length || d.helmetWrong ? 'Nhận & mặc PPE còn thiếu' : 'Xác nhận đủ PPE'}</button>}>
      <p className="small muted">PPE bắt buộc theo công trường và theo nghề của bạn. Chỉ PPE đã được cấp và đang mặc mới được công nhận; khi đã ở trong công trường, không thể tháo PPE bắt buộc.</p>
      <ul className="rp-ppe">
        {d.required.map((id) => (
          <li key={id} className={d.missing.includes(id) ? 'is-missing' : ''}>
            {DATA.ppeById[id]?.icon} {ppeLabel(id)} — {d.missing.includes(id) ? 'THIẾU' : 'đang mặc ✓'}
          </li>
        ))}
      </ul>
      {d.helmetRule && (
        <p className={`small ${d.helmetWrong ? 'bad' : 'good'}`}>
          Quy định dự án: vị trí của bạn đội mũ màu <b>{d.helmetRule.toLowerCase()}</b>
          {d.helmetWrong ? ' — mũ hiện tại chưa đúng, sẽ được đổi khi xác nhận.' : ' ✓'}
        </p>
      )}
      {optional.length > 0 && (
        <>
          <p className="small muted">PPE tuỳ chọn có thể nhận thêm vào kho cá nhân (mặc/tháo trong Menu → Trang phục & PPE):</p>
          <div className="rp-chips">
            {optional.map((x) => (
              <button key={x.id} className="rp-chip" onClick={() => session.issueOptional(x.id)}>
                ＋ {x.icon} {x.label}
              </button>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

function Inspect({ d }) {
  const [sel, setSel] = useState(null);
  return (
    <Shell title={d.title} footer={<button className="btn btn--primary" disabled={sel == null} onClick={() => session.submitDialog(sel)}>Kết luận</button>}>
      <p>
        <b>Kết quả kiểm tra hiện trường (mô phỏng):</b>
      </p>
      <ul>
        {d.findings.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
      <div className="rp-options">
        {d.options.map((o, i) => (
          <label key={i} className={`rp-option${sel === i ? ' is-active' : ''}`}>
            <input type="radio" checked={sel === i} onChange={() => setSel(i)} /> {o}
          </label>
        ))}
      </div>
      <Feedback d={d} />
    </Shell>
  );
}

function HseBoard({ d }) {
  const L = Object.fromEntries(DATA.safety.levels.map((l) => [l.id, l]));
  return (
    <Shell title={d.title} wide footer={<button className="btn btn--primary" onClick={() => session.ackDialog()}>Đóng</button>}>
      <h4>Cảnh báo khu vực</h4>
      <ul className="rp-zone-list">
        {d.zones.map((z) => (
          <li key={z.id}>
            <i style={{ background: L[z.level].color }} /> <b>{z.name}</b> <span className="small muted">· {L[z.level].label}</span>
            <div className={`small ${z.allowed ? 'ok-text' : 'bad'}`}>{z.allowed ? 'Bạn đủ điều kiện tiếp cận' : z.reasons.join(' · ')}</div>
          </li>
        ))}
      </ul>
      <h4>Giấy phép làm việc (mô phỏng)</h4>
      <ul className="small">
        {d.permits.map((p) => (
          <li key={p.id}>
            {p.id} · {DATA.permitById[p.type].label} · {p.active ? 'đang hiệu lực' : 'hết hiệu lực'} · {p.approvedBy}
          </li>
        ))}
        {!d.permits.length && <li className="muted">Chưa có.</li>}
      </ul>
      <div className="rp-chips">
        {d.permitTypes.map((t) => (
          <button key={t.id} className="rp-chip" onClick={() => session.openPermit(t.id)}>
            Xin PTW: {t.label}
          </button>
        ))}
      </div>
      <p className="small muted">Đây là cơ chế học tập trong trò chơi, không phải hệ thống cấp giấy phép làm việc thực.</p>
    </Shell>
  );
}

export default function DialogLayer() {
  const d = useSession((s) => s.dialog);
  if (!d) return null;
  const key = d.id;
  if (d.kind === 'quiz') return <Quiz key={key} d={d} />;
  if (d.kind === 'checklist') return <Checklist key={key} d={d} items={d.items} intro="Chọn TẤT CẢ điều kiện đúng, KHÔNG chọn điều kiện mất an toàn." />;
  if (d.kind === 'permit')
    return <Checklist key={key} d={d} items={d.conditions} intro={`Giấy phép mô phỏng, hiệu lực ${d.validityMin} phút chơi. Chọn đúng các điều kiện an toàn đã đáp ứng.`} />;
  if (d.kind === 'training') return <Training key={key} d={d} />;
  if (d.kind === 'ppe') return <PPE key={key} d={d} />;
  if (d.kind === 'inspect') return <Inspect key={key} d={d} />;
  if (d.kind === 'hse') return <HseBoard key={key} d={d} />;
  return (
    <Shell
      key={key}
      title={d.title}
      npc={d.npc}
      footer={
        <>
          {d.trainings?.map((t) => (
            <button key={t.id} className="btn" onClick={() => session.openTraining(t.id)}>
              🎓 Huấn luyện: {t.label}
            </button>
          ))}
          <span className="spacer" />
          <button className="btn btn--primary" onClick={() => session.ackDialog()} autoFocus>
            Đã hiểu
          </button>
        </>
      }
    >
      {d.lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </Shell>
  );
}
