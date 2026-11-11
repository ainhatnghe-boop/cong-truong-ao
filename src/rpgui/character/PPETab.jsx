// Tab BẢO HỘ PPE: mặc/tháo PPE đã cấp (được công nhận trong gameplay), xem thử PPE chưa cấp (chỉ hình ảnh),
// kiểm tra xung đột, màu/kiểu mũ – áo – giày (ngoại hình; màu mũ có thể bị quy định theo từng dự án).
import { DATA } from '../../rpg/data.js';
import { conflictsWith } from '../../rpg/PPEManagementSystem.js';
import { Section, Cards, Swatches, Badge } from './controls.jsx';
import { HelmetThumb } from './Thumbs.jsx';

const label = (id) => DATA.ppeById[id]?.label ?? id;

function Item({ it, ed }) {
  const P = ed.ppe;
  const owned = P.owned.includes(it.id);
  const on = P.wearing.includes(it.id);
  const previewing = P.preview.includes(it.id);
  const recognized = owned && on && !previewing;
  const hidden = P.hiddenByPreview.includes(it.id);
  const lock = on ? P.lockReason(it.id) : null;
  const replaces = on ? [] : conflictsWith(P.wearing, it.id);
  const required = it.satisfies.some((s) => P.required.includes(s));
  return (
    <div className={`cc-item cc-ppe${on ? ' is-on' : ''}${previewing ? ' is-preview' : ''}`} data-id={it.id}>
      <span className="cc-item__icon" aria-hidden>
        {it.icon}
      </span>
      <span className="cc-item__body">
        <b>{it.label}</b>
        <span className="cc-badges">
          {owned ? <Badge tone="ok">Đã cấp</Badge> : <Badge tone="warn">Chưa cấp – xem thử</Badge>}
          {recognized && <Badge tone="ok">✓ PPE được công nhận</Badge>}
          {previewing && <Badge tone="warn">Đang xem thử – không được công nhận</Badge>}
          {required && <Badge tone="hl">Bắt buộc tại công trường</Badge>}
        </span>
        <small>{it.desc}</small>
        {it.use && <small className="muted">Dùng: {it.use}</small>}
        {replaces.length > 0 && <small className="cc-warn">Xung đột: sẽ thay {replaces.map(label).join(', ')}</small>}
        {hidden && <small className="cc-warn">Đang tạm ẩn vì bạn xem thử món khác cùng vị trí.</small>}
        {lock && <small className="cc-warn">🔒 {lock}</small>}
      </span>
      <button className={`cc-btn cc-btn--sm${on ? ' is-on' : ''}`} disabled={!!lock} onClick={() => P.toggle(it.id)} aria-pressed={on} aria-label={`${on ? 'Tháo' : owned ? 'Mặc' : 'Xem thử'} ${it.label}`}>
        {on ? (lock ? '🔒 Bắt buộc' : previewing ? 'Bỏ xem thử' : 'Tháo') : owned ? 'Mặc' : 'Xem thử'}
      </button>
    </div>
  );
}

export default function PPETab({ ed }) {
  const S = DATA.ppeStyles;
  const st = ed.character.ppeStyle;
  const set = (k) => (v) => ed.patch('ppeStyle', (x) => ({ ...x, [k]: v }));
  if (!ed.caps.includes('ppe'))
    return (
      <div className="cc-tab">
        <p className="cc-lock">🔒 Model “{ed.asset.label}” chưa tách PPE (mũ/áo/giày) thành khối riêng trong GLB — chọn bộ dựng khác (tab Thông tin) nếu muốn bật/tắt PPE trên người.</p>
      </div>
    );
  const rule = ed.helmetRule ? S.helmetColors.find((c) => c.id === ed.helmetRule) : null;
  return (
    <div className="cc-tab" data-testid="tab-ppe">
      <div className="cc-note cc-note--info">
        <b>Cách hệ thống an toàn công nhận PPE (mô phỏng):</b>
        <ul>
          <li>
            <Badge tone="ok">✓ PPE được công nhận</Badge> = món <b>đã được cấp</b> (ki-ốt cổng / kho) <b>và đang mặc</b>.
          </li>
          <li>
            <Badge tone="warn">Xem thử</Badge> chỉ đổi hình ảnh — không mở được vùng, không qua được kiểm tra cổng.
          </li>
          <li>Màu/kiểu mũ, áo, giày và phụ kiện là ngoại hình. Huấn luyện, quyền vào vùng và giấy phép làm việc (PTW) là điều kiện riêng, PPE không thay thế được.</li>
        </ul>
        {ed.mode === 'new' && <p className="small">Mũ, giày và áo phản quang là PPE cơ bản được cấp ngay khi tạo nhân vật. PPE theo nghề nhận tại ki-ốt cổng / kho.</p>}
      </div>
      {ed.ppe.preview.length > 0 && (
        <div className="cc-row">
          <span className="small">Đang xem thử {ed.ppe.preview.length} món</span>
          <button className="cc-btn cc-btn--sm" onClick={ed.ppe.clearPreview}>
            Bỏ tất cả xem thử
          </button>
        </div>
      )}
      {DATA.ppeCategories.map((cat) => (
        <Section key={cat.id} title={cat.label}>
          <div className="cc-items">
            {DATA.ppe
              .filter((x) => x.category === cat.id)
              .map((it) => (
                <Item key={it.id} it={it} ed={ed} />
              ))}
          </div>
          {cat.id === 'head' && (
            <div className="cc-sub">
              <span className="cc-sub__label">Màu mũ</span>
              <Swatches label="Màu mũ" options={S.helmetColors} value={st.helmetColor} onChange={set('helmetColor')} testid="sw-helmet" />
              {rule ? (
                <p className={`small ${st.helmetColor === rule.id ? 'good' : 'cc-warn'}`}>
                  Quy định dự án này: vị trí của bạn dùng mũ <b>{rule.label.toLowerCase()}</b>
                  {st.helmetColor === rule.id ? ' ✓' : ' — sẽ bị yêu cầu đổi khi kiểm tra PPE.'}
                </p>
              ) : (
                <p className="small muted">Màu mũ theo vị trí do từng dự án quy định (không cố định). Nếu dự án có quy định, hệ thống kiểm tra khi qua cổng.</p>
              )}
              <span className="cc-sub__label">Kiểu mũ</span>
              <Cards label="Kiểu mũ" cols={2} options={S.helmetStyles} value={st.helmetStyle} onChange={set('helmetStyle')} thumb={(o) => <HelmetThumb style={o.id} color={S.helmetColors.find((c) => c.id === st.helmetColor)?.color} />} />
            </div>
          )}
          {cat.id === 'foot' && (
            <div className="cc-sub">
              <span className="cc-sub__label">Màu giày</span>
              <Swatches label="Màu giày" options={S.bootColors} value={st.bootsColor} onChange={set('bootsColor')} />
            </div>
          )}
          {cat.id === 'other' && (
            <div className="cc-sub">
              <span className="cc-sub__label">Màu áo phản quang</span>
              <Swatches label="Màu áo phản quang" options={S.vestColors} value={st.vestColor} onChange={set('vestColor')} />
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}
