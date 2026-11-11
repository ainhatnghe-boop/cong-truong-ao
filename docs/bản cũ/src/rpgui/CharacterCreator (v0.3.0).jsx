// Màn hình TẠO NHÂN VẬT / TỦ ĐỒ: chọn ngoại hình, trang phục, PPE; xem trước 3D (xoay, zoom, thử animation)
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { AVATAR, sanitizeAppearance, randomAppearance } from '../rpg/AvatarCustomizationSystem.js';
import AvatarModel from './AvatarModel.jsx';

const ANIMS = [
  ['idle', 'Đứng'],
  ['walk', 'Đi'],
  ['run', 'Chạy'],
  ['interact', 'Tương tác'],
];

export function AvatarPreview({ appearance, equipped, height = 420 }) {
  const [anim, setAnim] = useState('idle');
  return (
    <div className="rp-preview" style={{ height }}>
      <Canvas shadows camera={{ position: [1.6, 1.5, 3.2], fov: 35 }} dpr={[1, 2]}>
        <color attach="background" args={['#DCE6EE']} />
        <hemisphereLight args={['#FFFFFF', '#8C7E62', 0.9]} />
        <directionalLight position={[3, 5, 3]} intensity={2} castShadow />
        <group position={[0, 0, 0]}>
          <AvatarModel appearance={appearance} equipped={equipped} anim={anim} speed={anim === 'run' ? 5 : anim === 'walk' ? 2.2 : 0} />
        </group>
        <ContactShadows position={[0, 0.001, 0]} opacity={0.45} scale={4} blur={2} far={2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.4, 40]} />
          <meshStandardMaterial color="#B9B2A2" roughness={1} />
        </mesh>
        <OrbitControls target={[0, 1, 0]} minDistance={1.4} maxDistance={6} maxPolarAngle={1.55} enablePan={false} />
      </Canvas>
      <div className="rp-preview__bar" role="group" aria-label="Thử animation">
        {ANIMS.map(([id, l]) => (
          <button key={id} className={`btn btn--sm${anim === id ? ' btn--primary' : ''}`} onClick={() => setAnim(id)}>
            {l}
          </button>
        ))}
      </div>
      <p className="rp-preview__hint">Kéo để xoay · cuộn để phóng to</p>
    </div>
  );
}

function Swatches({ list, value, onChange, label }) {
  return (
    <div className="rp-field">
      <span>{label}</span>
      <div className="rp-swatches">
        {list.map((x) => {
          const id = typeof x === 'string' ? x : x.id;
          const color = typeof x === 'string' ? x : x.color;
          return <button key={id} className={`rp-swatch${value === id ? ' is-active' : ''}`} style={{ background: color }} onClick={() => onChange(id)} title={x.label ?? id} aria-label={x.label ?? id} />;
        })}
      </div>
    </div>
  );
}

function Choice({ list, value, onChange, label }) {
  return (
    <label className="rp-field">
      <span>{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {list.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Bộ chỉnh ngoại hình dùng chung cho tạo mới & tủ đồ */
export function AppearanceEditor({ value, onChange }) {
  const set = (k) => (v) => onChange(sanitizeAppearance({ ...value, [k]: v }));
  return (
    <div className="rp-editor">
      <h4>Ngoại hình</h4>
      <Choice label="Vóc dáng" list={AVATAR.body} value={value.body} onChange={set('body')} />
      <label className="rp-field">
        <span>Chiều cao: {value.height.toFixed(2)} m</span>
        <input type="range" min={AVATAR.height.min} max={AVATAR.height.max} step={0.01} value={value.height} onChange={(e) => set('height')(Number(e.target.value))} />
      </label>
      <Swatches label="Màu da" list={AVATAR.skin} value={value.skin} onChange={set('skin')} />
      <Choice label="Khuôn mặt" list={AVATAR.face} value={value.face} onChange={set('face')} />
      <Choice label="Kiểu tóc" list={AVATAR.hair} value={value.hair} onChange={set('hair')} />
      <Swatches label="Màu tóc" list={AVATAR.hairColor} value={value.hairColor} onChange={set('hairColor')} />
      <h4>Trang phục & bảo hộ</h4>
      <Choice label="Trang phục" list={AVATAR.outfit} value={value.outfit} onChange={set('outfit')} />
      <Swatches label="Mũ bảo hộ" list={AVATAR.helmet} value={value.helmet} onChange={set('helmet')} />
      <Choice label="Giày bảo hộ" list={AVATAR.boots} value={value.boots} onChange={set('boots')} />
      <Swatches label="Áo phản quang" list={AVATAR.vest} value={value.vest} onChange={set('vest')} />
    </div>
  );
}

export default function CharacterCreator({ onCreate, onBack }) {
  const [name, setName] = useState('');
  const [look, setLook] = useState(() => sanitizeAppearance(AVATAR.defaults));
  const [err, setErr] = useState('');
  return (
    <div className="rp-screen">
      <header className="rp-screen__head">
        <h1>TẠO NHÂN VẬT</h1>
        <p className="muted">Bước 1/3 · Nhân vật được lưu tự động và có thể thay đổi ngoại hình, trang phục sau này.</p>
      </header>
      <div className="rp-create">
        <AvatarPreview appearance={look} equipped={['helmet', 'boots', 'vest']} />
        <div className="rp-create__form panel">
          <label className="rp-field">
            <span>Tên nhân vật</span>
            <input className="input" maxLength={24} value={name} placeholder="Ví dụ: Minh Anh" onChange={(e) => (setName(e.target.value), setErr(''))} autoFocus />
          </label>
          <AppearanceEditor value={look} onChange={setLook} />
          <p className="small muted">Mũ, giày bảo hộ và áo phản quang là PPE cơ bản được cấp phát ngay. Trang bị theo nghề sẽ nhận ở ki-ốt cổng / kho vật tư.</p>
          {err && <p className="bad small">{err}</p>}
          <div className="btn-row">
            {onBack && (
              <button className="btn" onClick={onBack}>
                ← Quay lại
              </button>
            )}
            <button className="btn" onClick={() => setLook(randomAppearance())}>
              🎲 Ngẫu nhiên
            </button>
            <span className="spacer" />
            <button
              className="btn btn--primary"
              onClick={() => {
                const r = onCreate(name, look);
                if (r?.error) setErr(r.error);
              }}
            >
              Tiếp tục →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
