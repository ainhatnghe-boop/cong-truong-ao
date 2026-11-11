// Tab PHỤ KIỆN: chỉ ngoại hình — không bao giờ được tính là PPE, không mở vùng, không thay huấn luyện / PTW.
import { DATA } from '../../rpg/data.js';
import { Section, Badge } from './controls.jsx';

export default function AccessoriesTab({ ed }) {
  const list = ed.character.accessories;
  if (!ed.caps.includes('accessories'))
    return (
      <div className="cc-tab">
        <p className="cc-lock">🔒 Bộ dựng “{ed.asset.label}” chưa hỗ trợ phụ kiện.</p>
      </div>
    );
  const toggle = (id) => ed.patch('accessories', (l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <div className="cc-tab" data-testid="tab-accessories">
      <div className="cc-note">
        <Badge>Chỉ ngoại hình</Badge> Phụ kiện không được hệ thống an toàn công nhận như PPE. Ví dụ: kính cận <b>không</b> thay kính bảo hộ.
      </div>
      <Section title="Phụ kiện">
        <div className="cc-items">
          {DATA.accessories.map((x) => {
            const on = list.includes(x.id);
            const clash = on && (x.conflicts ?? []).find((c) => ed.ppe.wearing.includes(c));
            return (
              <button key={x.id} className={`cc-item${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(x.id)} data-id={x.id}>
                <span className="cc-item__icon" aria-hidden>
                  {x.icon}
                </span>
                <span className="cc-item__body">
                  <b>{x.label}</b>
                  <small>{x.desc}</small>
                  {clash && <small className="cc-warn">Đang bị che bởi {DATA.ppeById[clash].label} (không đeo cùng lúc được).</small>}
                </span>
                <span className="cc-item__state">{on ? '✓ Đang đeo' : 'Đeo'}</span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
