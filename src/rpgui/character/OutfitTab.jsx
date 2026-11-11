// Tab TRANG PHỤC: bộ đồng phục theo vị trí, màu áo/quần trong bảng màu cho phép, logo. Trang phục là NGOẠI HÌNH, không phải PPE.
import { DATA } from '../../rpg/data.js';
import { defaultOutfit, LOGO_MAX_LEN } from '../../rpg/OutfitSystem.js';
import { Section, Cards, Swatches, Badge } from './controls.jsx';
import { OutfitThumb } from './Thumbs.jsx';

export default function OutfitTab({ ed }) {
  const o = ed.character.outfit;
  const def = DATA.outfitById[o.id];
  const set = (patch) => ed.patch('outfit', (x) => ({ ...x, ...patch }));
  if (!ed.caps.includes('outfit'))
    return (
      <div className="cc-tab">
        <p className="cc-lock">🔒 Model “{ed.asset.label}” đã tạc liền trang phục vào khối mesh (không tách rời được) — chọn bộ dựng khác (tab Thông tin) nếu muốn đổi trang phục.</p>
      </div>
    );
  const suggested = (def.accessories ?? []).filter((id) => !ed.character.accessories.includes(id));
  return (
    <div className="cc-tab" data-testid="tab-outfit">
      <Section title="Bộ trang phục" hint="Chỉ là ngoại hình — không thay PPE">
        <Cards
          label="Bộ trang phục"
          cols={2}
          options={DATA.outfits}
          value={o.id}
          onChange={(id) => ed.patch('outfit', (x) => ({ ...defaultOutfit(id), logo: x.logo }))}
          thumb={(d) => <OutfitThumb def={d} top={d.id === o.id ? o.top : d.top.color} bottom={d.id === o.id ? o.bottom : d.bottom.color} />}
          testid="cards-outfit"
        />
      </Section>
      <div className="cc-note">
        <b>{def.label}</b> · mã <code>{def.id}</code>
        <br />
        {def.desc}
      </div>
      <Section title="Màu áo">
        <Swatches label="Màu áo" options={def.top.palette} value={o.top} onChange={(c) => set({ top: c })} testid="sw-top" />
      </Section>
      {def.bottom.style !== 'coverall' && (
        <Section title="Màu quần">
          <Swatches label="Màu quần" options={def.bottom.palette} value={o.bottom} onChange={(c) => set({ bottom: c })} />
        </Section>
      )}
      <Section title="Logo trên ngực áo" hint={`Tối đa ${LOGO_MAX_LEN} ký tự`}>
        <label className="cc-check">
          <input type="checkbox" checked={o.logo.enabled} onChange={(e) => set({ logo: { ...o.logo, enabled: e.target.checked } })} /> Hiện logo
        </label>
        {o.logo.enabled && <input className="cc-input" maxLength={LOGO_MAX_LEN} value={o.logo.text} onChange={(e) => set({ logo: { ...o.logo, text: e.target.value } })} aria-label="Chữ logo" />}
      </Section>
      {suggested.length > 0 && (
        <Section title="Phụ kiện gợi ý theo trang phục">
          <div className="cc-row">
            {suggested.map((id) => (
              <button key={id} className="cc-btn cc-btn--sm" onClick={() => ed.patch('accessories', (l) => [...l, id])}>
                ＋ {DATA.accessoryById[id].icon} {DATA.accessoryById[id].label}
              </button>
            ))}
            <Badge>Chỉ ngoại hình</Badge>
          </div>
        </Section>
      )}
    </div>
  );
}
