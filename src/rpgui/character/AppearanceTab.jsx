// Tab NGOẠI HÌNH: vóc dáng, tỷ lệ cơ thể, khuôn mặt, da, tóc. Nhóm không được bộ dựng hỗ trợ → khoá kèm lý do.
import { DATA } from '../../rpg/data.js';
import { Section, Cards, Swatches, Slider } from './controls.jsx';
import { BuildThumb, FaceThumb, EyesThumb, NoseThumb, MouthThumb, BeardThumb, HairThumb } from './Thumbs.jsx';

export default function AppearanceTab({ ed }) {
  const A = DATA.appearance;
  const a = ed.character.appearance;
  const set = (k) => (v) => ed.patch('appearance', (x) => ({ ...x, [k]: v }));
  const lk = (f) => ed.locked.includes(f);
  const why = `Bộ dựng “${ed.asset.label}” chưa hỗ trợ tuỳ chọn này — chọn bộ dựng khác ở tab Thông tin để mở khoá.`;
  return (
    <div className="cc-tab" data-testid="tab-appearance">
      <Section title="Tỷ lệ cơ thể" hint="Thay đổi trực tiếp hình khối">
        {!lk('height') ? (
          <Slider label="Chiều cao" min={A.height.min} max={A.height.max} step={A.height.step} value={a.height} onChange={set('height')} format={(v) => `${v.toFixed(2)} m`} testid="sl-height" />
        ) : (
          <p className="cc-lock">🔒 Chiều cao: {why}</p>
        )}
        {!lk('shoulders') ? <Slider label={A.shoulders.label} min={A.shoulders.min} max={A.shoulders.max} value={a.shoulders} onChange={set('shoulders')} format={(v) => `${Math.round(v * 100)}%`} testid="sl-shoulders" /> : <p className="cc-lock">🔒 Vai: {why}</p>}
        {!lk('torso') ? <Slider label={A.torso.label} min={A.torso.min} max={A.torso.max} value={a.torso} onChange={set('torso')} format={(v) => `${Math.round(v * 100)}%`} testid="sl-torso" /> : <p className="cc-lock">🔒 Tỷ lệ thân: {why}</p>}
      </Section>
      <Section title="Thể hình" locked={lk('build')} lockText={why}>
        <Cards label="Thể hình" options={A.build.options} value={a.build} onChange={set('build')} thumb={(o) => <BuildThumb girth={o.girth} />} testid="cards-build" />
      </Section>
      <Section title="Khuôn mặt" locked={lk('faceShape')} lockText={why}>
        <Cards label="Khuôn mặt" options={A.faceShape.options} value={a.faceShape} onChange={set('faceShape')} thumb={(o) => <FaceThumb shape={o.id} />} testid="cards-face" />
      </Section>
      <Section title="Mắt" locked={lk('eyes')} lockText={why}>
        <Cards label="Mắt" options={A.eyes.options} value={a.eyes} onChange={set('eyes')} thumb={(o) => <EyesThumb opt={o} />} />
      </Section>
      <Section title="Mũi" locked={lk('nose')} lockText={why}>
        <Cards label="Mũi" options={A.nose.options} value={a.nose} onChange={set('nose')} thumb={(o) => <NoseThumb scale={o.scale} />} />
      </Section>
      <Section title="Miệng" locked={lk('mouth')} lockText={why}>
        <Cards label="Miệng" options={A.mouth.options} value={a.mouth} onChange={set('mouth')} thumb={(o) => <MouthThumb id={o.id} />} />
      </Section>
      {a.bodyFrame === 'male' && (
        <Section title="Râu" locked={lk('facialHair')} lockText={why}>
          <Cards label="Râu" options={A.facialHair.options} value={a.facialHair} onChange={set('facialHair')} thumb={(o) => <BeardThumb id={o.id} />} />
        </Section>
      )}
      <Section title="Màu da" locked={lk('skin')} lockText={why}>
        <Swatches label="Màu da" options={A.skin.options} value={a.skin} onChange={set('skin')} testid="sw-skin" />
      </Section>
      <Section title="Kiểu tóc" hint="Tự gọn lại khi đội mũ bảo hộ" locked={lk('hair')} lockText={why}>
        <Cards label="Kiểu tóc" options={A.hair.options} value={a.hair} onChange={set('hair')} thumb={(o) => <HairThumb id={o.id} color={a.hairColor} />} testid="cards-hair" />
      </Section>
      <Section title="Màu tóc" locked={lk('hairColor')} lockText={why}>
        <Swatches label="Màu tóc" options={A.hairColor.options} value={a.hairColor} onChange={set('hairColor')} />
      </Section>
    </div>
  );
}
