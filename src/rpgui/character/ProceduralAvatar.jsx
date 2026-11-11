// ============================================================
//  ProceduralAvatar v2 — nhân vật BÁN CHÂN THỰC dựng thủ tục (fallback khi chưa có model GLB có rig).
//  - Thân tiện tròn (Lathe) có ngực/eo/hông theo giới tính hình thể; chi bằng capsule có khớp
//  - Mặt: hộp sọ + hàm theo kiểu mặt, mắt (lòng trắng + tròng), mũi, miệng, tai, lông mày, râu
//  - Bàn tay 5 ngón; giày có đế, mũi; trang phục có cổ áo, nẹp, túi, khoá kéo, logo (CanvasTexture)
//  - PPE theo bộ phận; phụ kiện (chỉ ngoại hình)
//  Hình học & vật liệu được CACHE dùng chung, không tạo mới mỗi frame. Đây KHÔNG phải nhân vật photorealistic.
// ============================================================
import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { updatePose } from './CharacterAnimationController.js';

// ---------------- cache ----------------
const GEO = new Map();
const geo = (k, make) => GEO.get(k) ?? GEO.set(k, make()).get(k);
const sphere = () => geo('sph', () => new THREE.SphereGeometry(1, 28, 20));
const hemi = () => geo('hemi', () => new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2));
const box = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const cyl = () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 20));
// làm tròn kích thước → số hình học cache có giới hạn khi người chơi kéo thanh trượt
const cap = (r0, l0) => {
  const r = Math.round(r0 * 1000) / 1000;
  const l = Math.round(l0 * 100) / 100;
  return geo(`cap${r}|${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 16));
};
const torus = (arc) => geo(`tor${arc}`, () => new THREE.TorusGeometry(1, 0.06, 8, 32, arc));
// chi thon liền mạch (Lathe): từ bán kính r0 → r1 dọc chiều dài len (len âm = dựng lên trên), có thể phồng cơ tại bulgeT∈[0,1]
// thay cho capsule + khớp hình cầu rời rạc → không còn "khớp bóng" lộ rõ giữa đùi/bắp chân, vai/khuỷu tay
const limb = (r0, r1, len, bulgeT = -1, bulgeAmt = 0, n = 12) => {
  const k0 = Math.round(r0 * 2000) / 2000;
  const k1 = Math.round(r1 * 2000) / 2000;
  const kl = Math.round(len * 200) / 200;
  const kt = Math.round(bulgeT * 100) / 100;
  const ka = Math.round(bulgeAmt * 100) / 100;
  return geo(`limb${k0}|${k1}|${kl}|${kt}|${ka}`, () => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let r = r0 + (r1 - r0) * t;
      if (bulgeAmt > 0) {
        const d = Math.abs(t - bulgeT) / 0.35;
        if (d < 1) r *= 1 + bulgeAmt * Math.cos((d * Math.PI) / 2);
      }
      pts.push(new THREE.Vector2(Math.max(0.0015, r), -len * t));
    }
    return new THREE.LatheGeometry(pts, 16);
  });
};
const halfDisc = () => geo('hdisc', () => new THREE.CylinderGeometry(1, 1, 1, 32, 1, false, -Math.PI / 2, Math.PI));
const shell = () => geo('shield', () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, true, -0.95, 1.9));

const PROFILES = {
  male: [[0, 0.15], [0.05, 0.158], [0.18, 0.15], [0.3, 0.14], [0.45, 0.152], [0.62, 0.172], [0.75, 0.178], [0.86, 0.17], [0.93, 0.14], [0.98, 0.085], [1, 0.06]],
  female: [[0, 0.162], [0.06, 0.17], [0.2, 0.15], [0.33, 0.122], [0.47, 0.135], [0.62, 0.158], [0.72, 0.16], [0.84, 0.15], [0.93, 0.125], [0.98, 0.075], [1, 0.055]],
};
/** Lathe một đoạn profile (y0..y1), phóng bán kính k, có thể chừa khe phía trước (áo mở) */
function lathe(frame, y0 = 0, y1 = 1, k = 1, gap = 0) {
  return geo(`lathe${frame}|${y0}|${y1}|${k}|${gap}`, () => {
    const prof = PROFILES[frame];
    const r = (y) => {
      for (let i = 1; i < prof.length; i++)
        if (y <= prof[i][0]) {
          const [ya, ra] = prof[i - 1];
          const [yb, rb] = prof[i];
          return ra + ((rb - ra) * (y - ya)) / (yb - ya);
        }
      return prof.at(-1)[1];
    };
    const pts = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const y = y0 + ((y1 - y0) * i) / n;
      pts.push(new THREE.Vector2(r(y) * k, y));
    }
    return new THREE.LatheGeometry(pts, 32, gap, Math.PI * 2 - gap * 2);
  });
}
/** bán kính profile tại y (dùng để đặt chi tiết lên bề mặt áo) */
const profR = (frame, y) => {
  const prof = PROFILES[frame];
  for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) return prof[i - 1][1] + ((prof[i][1] - prof[i - 1][1]) * (y - prof[i - 1][0])) / (prof[i][0] - prof[i - 1][0]);
  return prof.at(-1)[1];
};

const MAT = new Map();
export function mat(color, rough = 0.75, metal = 0, extra = {}) {
  const k = `${color}|${rough}|${metal}|${JSON.stringify(extra)}`;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
  return MAT.get(k);
}
const shade = (hex, f) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
};

const LOGO = new Map();
function logoTexture(text, bg = '#F4F7FA', fg = '#13253B') {
  const k = `${text}|${bg}|${fg}`;
  if (LOGO.has(k)) return LOGO.get(k);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#FFBF36';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 246, 118);
  g.fillStyle = fg;
  g.font = `800 ${text.length > 6 ? 40 : 58}px "Be Vietnam Pro", system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text.toUpperCase(), 128, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  LOGO.set(k, t);
  return t;
}

const M = ({ g, m, s = 1, p = [0, 0, 0], r, cast = true, ...rest }) => <mesh geometry={g} material={m} scale={s} position={p} rotation={r} castShadow={cast} receiveShadow {...rest} />;

// ---------------- chi tiết ----------------
function Hand({ skin, glove, fingersRef, side }) {
  const m = glove ? mat(glove.color, 0.85) : skin;
  const fx = [-0.022, -0.007, 0.008, 0.022];
  return (
    <group rotation={[0, side * -Math.PI / 2, 0]}>
      <M g={sphere()} m={m} s={[0.042, 0.05, 0.02]} p={[0, -0.045, 0]} />
      {fx.map((x, i) => (
        <group key={i} position={[x, -0.085, 0]} ref={(el) => (fingersRef.current[i + (side > 0 ? 5 : 0)] = el)}>
          <M g={cap(0.0085, i === 0 || i === 3 ? 0.036 : 0.044)} m={m} p={[0, -0.025, 0]} cast={false} />
        </group>
      ))}
      <group position={[0.034 * side * -1, -0.04, 0.012]} rotation={[0.3, 0, side * 0.6]}>
        <M g={cap(0.009, 0.03)} m={m} p={[0, -0.022, 0]} cast={false} />
      </group>
      {glove && <M g={cyl()} m={mat(shade(glove.color, 0.8), 0.9)} s={[0.046, 0.04, 0.03]} p={[0, 0.002, 0]} />}
    </group>
  );
}

function Boot({ color, rubber, sole }) {
  const m = mat(color, 0.55, 0.05);
  return (
    <group>
      <M g={box()} m={mat(sole, 0.9)} s={[0.108, 0.03, 0.27]} p={[0, -0.055, 0.045]} />
      <M g={sphere()} m={m} s={[0.058, 0.055, 0.135]} p={[0, -0.02, 0.05]} />
      <M g={sphere()} m={mat(shade(color, 0.7), 0.4, 0.2)} s={[0.052, 0.04, 0.05]} p={[0, -0.03, 0.14]} />
      <M g={cyl()} m={m} s={[0.06, 0.08, 0.06]} p={[0, 0.02, 0]} />
      {[0, 1, 2].map((i) => (
        <M key={i} g={box()} m={mat('#C9C3B6', 0.9)} s={[0.05, 0.005, 0.008]} p={[0, 0.01 + i * 0.012, 0.055 - i * 0.012]} cast={false} />
      ))}
      {rubber && <M g={cyl()} m={m} s={[0.066, 0.26, 0.066]} p={[0, 0.17, 0]} />}
    </group>
  );
}

function Hair({ style, m, helmet }) {
  if (style === 'bald') return null;
  const capS = style === 'buzz' ? [0.099, 0.112, 0.108] : [0.104, 0.12, 0.113];
  return (
    <group>
      {(!helmet || style === 'long' || style === 'bun') && <M g={hemi()} m={m} s={capS} p={[0, 0.012, -0.006]} />}
      {helmet && <M g={sphere()} m={m} s={[0.101, 0.07, 0.11]} p={[0, -0.005, -0.012]} cast={false} />}
      {style === 'side' && !helmet && <M g={sphere()} m={m} s={[0.07, 0.03, 0.09]} p={[0.04, 0.09, 0.02]} r={[0, 0, -0.3]} />}
      {style === 'curly' &&
        !helmet &&
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return <M key={i} g={sphere()} m={m} s={0.032} p={[Math.cos(a) * 0.07, 0.085 + (i % 2) * 0.02, Math.sin(a) * 0.075 - 0.01]} cast={false} />;
        })}
      {style === 'long' && <M g={cap(0.03, 0.12)} m={m} p={[0, -0.09, -0.11]} r={[0.25, 0, 0]} />}
      {style === 'bun' && <M g={sphere()} m={m} s={0.045} p={[0, helmet ? -0.03 : 0.05, -0.115]} />}
    </group>
  );
}

function Face({ s, skin, lip, hairM }) {
  const eye = s.eyeOpt;
  const es = 0.0125 * eye.size;
  const ns = s.noseScale;
  return (
    <group>
      {/* mắt */}
      {[-1, 1].map((x) => (
        <group key={x} position={[x * 0.034, 0.016, 0.086]}>
          <M g={sphere()} m={mat('#F4F1EA', 0.3)} s={[es, es * eye.squint, es * 0.6]} cast={false} />
          <M g={sphere()} m={mat('#3A2A1E', 0.25)} s={[es * 0.62, es * 0.62 * Math.min(1, eye.squint + 0.2), es * 0.4]} p={[0, 0, es * 0.42]} cast={false} />
          <M g={sphere()} m={mat('#0B0B0C', 0.2)} s={es * 0.28} p={[0, 0, es * 0.62]} cast={false} />
          <M g={box()} m={hairM} s={[0.03, 0.0055, 0.008]} p={[0, 0.024, 0.004]} r={[0, 0, x * -0.08]} cast={false} />
        </group>
      ))}
      {/* mũi */}
      <M g={box()} m={skin} s={[0.014 * ns[0], 0.04 * ns[1], 0.02 * ns[2]]} p={[0, -0.002, 0.098]} r={[-0.25, 0, 0]} cast={false} />
      <M g={sphere()} m={skin} s={[0.015 * ns[0], 0.012 * ns[1], 0.013 * ns[2]]} p={[0, -0.024, 0.106 + 0.004 * (ns[2] - 1)]} cast={false} />
      {/* miệng */}
      {s.mouth === 'smile' && <M g={torus(Math.PI * 0.75)} m={lip} s={[0.022, 0.022, 0.06]} p={[0, -0.04, 0.092]} r={[0, 0, Math.PI * 1.125]} cast={false} />}
      {s.mouth === 'neutral' && <M g={cap(0.0045, 0.026)} m={lip} p={[0, -0.051, 0.093]} r={[0, 0, Math.PI / 2]} cast={false} />}
      {s.mouth === 'serious' && <M g={cap(0.0032, 0.03)} m={mat(shade('#9A4F45', 0.8), 0.6)} p={[0, -0.052, 0.093]} r={[0, 0, Math.PI / 2]} cast={false} />}
      {s.mouth === 'full' && (
        <>
          <M g={cap(0.0065, 0.024)} m={lip} p={[0, -0.047, 0.093]} r={[0, 0, Math.PI / 2]} cast={false} />
          <M g={cap(0.0075, 0.022)} m={lip} p={[0, -0.058, 0.091]} r={[0, 0, Math.PI / 2]} cast={false} />
        </>
      )}
      {/* tai */}
      {[-1, 1].map((x) => (
        <M key={`e${x}`} g={sphere()} m={skin} s={[0.014, 0.03, 0.02]} p={[x * 0.095, 0.002, 0]} cast={false} />
      ))}
      {/* râu */}
      {s.facialHair === 'mustache' && <M g={cap(0.006, 0.03)} m={hairM} p={[0, -0.04, 0.097]} r={[0, 0, Math.PI / 2]} cast={false} />}
      {s.facialHair === 'beard' && <M g={sphere()} m={hairM} s={[0.082 * s.jaw[0], 0.065 * s.jaw[1], 0.075 * s.jaw[2]]} p={[0, -0.068, 0.025]} />}
      {s.facialHair === 'stubble' && <M g={sphere()} m={mat('#2B241F', 0.9, 0, { transparent: true, opacity: 0.32 })} s={[0.08 * s.jaw[0], 0.066 * s.jaw[1], 0.074 * s.jaw[2]]} p={[0, -0.063, 0.022]} cast={false} />}
    </group>
  );
}

function Helmet({ s }) {
  const hm = mat(s.helmetColor, 0.32, 0.05);
  const sk = s.skull;
  return (
    <group position={[0, 0.032, 0]}>
      <M g={hemi()} m={hm} s={[0.118 * sk[0], 0.108 * sk[1], 0.13 * sk[2]]} />
      <M g={box()} m={hm} s={[0.022, 0.016, 0.22 * sk[2]]} p={[0, 0.103 * sk[1], 0]} />
      {s.helmetStyle === 'full' ? (
        <M g={cyl()} m={hm} s={[0.152 * sk[0], 0.006, 0.168 * sk[2]]} p={[0, 0.004, 0.005]} />
      ) : (
        <>
          <M g={cyl()} m={hm} s={[0.122 * sk[0], 0.008, 0.134 * sk[2]]} p={[0, 0.002, 0]} />
          <M g={halfDisc()} m={hm} s={[0.11, 0.008, 0.07]} p={[0, 0.0, 0.118 * sk[2]]} r={[-0.08, 0, 0]} />
        </>
      )}
      {/* quai cài cằm */}
      <M g={torus(Math.PI)} m={mat('#1F2328', 0.8)} s={[0.098 * sk[0], 0.15 * sk[1], 0.04]} p={[0, -0.004, 0.012]} r={[-0.22, 0, Math.PI]} cast={false} />
      {s.logo.enabled && (
        <mesh position={[0, 0.06 * sk[1], 0.118 * sk[2]]} rotation={[-0.45, 0, 0]}>
          <planeGeometry args={[0.06, 0.03]} />
          <meshStandardMaterial map={logoTexture(s.logo.text)} roughness={0.5} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      )}
    </group>
  );
}

/** Các bộ phận PPE & phụ kiện gắn lên ĐẦU — xuất dùng lại cho GltfAvatar (gắn vào bone đầu của model GLB) */
export function HeadGear({ s }) {
  const P = s.parts;
  const lens = mat('#BFE4FF', 0.05, 0.1, { transparent: true, opacity: 0.35 });
  const frame = mat('#1F2328', 0.4);
  return (
    <group>
      {P.glasses && (
        <group position={[0, 0.018, 0.104]}>
          <M g={box()} m={lens} s={[0.11, 0.032, 0.004]} cast={false} />
          <M g={box()} m={frame} s={[0.114, 0.006, 0.006]} p={[0, 0.018, 0]} cast={false} />
          {[-1, 1].map((x) => (
            <M key={x} g={box()} m={frame} s={[0.004, 0.006, 0.1]} p={[x * 0.056, 0.012, -0.05]} cast={false} />
          ))}
        </group>
      )}
      {P.goggles && (
        <group position={[0, 0.018, 0]}>
          <M g={torus(Math.PI * 2)} m={mat('#2B3442', 0.8)} s={[0.106, 0.106, 0.18]} r={[Math.PI / 2, 0, 0]} cast={false} />
          <M g={box()} m={mat('#9FD3F0', 0.08, 0.1, { transparent: true, opacity: 0.45 })} s={[0.11, 0.042, 0.03]} p={[0, 0, 0.096]} cast={false} />
        </group>
      )}
      {P.eyeglasses && !P.goggles && (
        <group position={[0, 0.018, 0.101]}>
          {[-1, 1].map((x) => (
            <M key={x} g={torus(Math.PI * 2)} m={frame} s={[0.016, 0.014, 0.05]} p={[x * 0.034, 0, 0]} cast={false} />
          ))}
          <M g={box()} m={frame} s={[0.02, 0.003, 0.003]} cast={false} />
        </group>
      )}
      {P.faceShield && <M g={shell()} m={mat('#DDF0FF', 0.05, 0.1, { transparent: true, opacity: 0.28, side: THREE.DoubleSide })} s={[0.135, 0.17, 0.14]} p={[0, -0.03, 0.01]} cast={false} />}
      {P.weldingMask && (
        <group>
          <M g={shell()} m={mat('#2A2F37', 0.45, 0.1, { side: THREE.DoubleSide })} s={[0.13, 0.17, 0.135]} p={[0, -0.025, 0.012]} />
          <M g={box()} m={mat('#1B4B2E', 0.1, 0.3)} s={[0.07, 0.03, 0.005]} p={[0, 0.02, 0.143]} cast={false} />
        </group>
      )}
      {P.respirator && (
        <group position={[0, -0.04, 0.09]}>
          <M g={sphere()} m={mat('#E5E7EB', 0.6)} s={[0.045, 0.035, 0.03]} />
          {[-1, 1].map((x) => (
            <M key={x} g={cyl()} m={mat('#E4572E', 0.6)} s={[0.018, 0.02, 0.018]} p={[x * 0.04, -0.01, 0.01]} r={[Math.PI / 2, 0, x * 0.5]} cast={false} />
          ))}
        </group>
      )}
      {P.earmuffs && (
        <group>
          <M g={torus(Math.PI)} m={mat('#DC2626', 0.5)} s={[0.13, 0.15, 0.1]} p={[0, 0.0, 0]} r={[0, 0, 0]} cast={false} />
          {[-1, 1].map((x) => (
            <M key={x} g={cyl()} m={mat('#DC2626', 0.5)} s={[0.04, 0.03, 0.04]} p={[x * 0.112, 0.0, 0]} r={[0, 0, Math.PI / 2]} />
          ))}
        </group>
      )}
      {P.earplugs &&
        [-1, 1].map((x) => <M key={`p${x}`} g={sphere()} m={mat('#F58220', 0.5)} s={0.009} p={[x * 0.1, 0.002, 0.005]} cast={false} />)}
    </group>
  );
}

// ---------------- nhân vật ----------------
function ProceduralAvatar({ spec: s, stateRef, anim = 'idle', speed = 0, shadow = true }) {
  const frame = s.bodyFrame;
  const g = s.girth;
  const t = s.torso;
  const legMul = 1 + (1 - t) * 0.8;
  const torsoL = 0.56 * t;
  const thigh = 0.42 * legMul;
  const shin = 0.42 * legMul;
  const hipY = 0.08 + thigh + shin;
  const neckY = hipY + torsoL - 0.01;
  const headY = neckY + 0.12;
  const natural = headY + 0.13;
  const scale = s.height / natural;
  const shoulderX = 0.19 * s.shoulders * Math.sqrt(g) * (frame === 'female' ? 0.93 : 1);
  const depth = frame === 'female' ? 0.66 : 0.68;
  const o = s.outfit;
  const P = s.parts;

  const skin = mat(s.skin, 0.62);
  const lip = mat(shade(s.skin, 0.72), 0.55);
  const hairM = mat(s.hairColor, 0.85);
  const top = mat(o.top, 0.88);
  const topDark = mat(shade(o.top, 0.78), 0.88);
  const bottom = mat(o.bottom, 0.9);
  const seam = mat(shade(o.top, 0.6), 0.9);
  const glove = P.gloves ? { color: P.gloves.style === 'insulated' ? '#E4572E' : P.gloves.style === 'cut' ? '#8C9AA8' : '#E9C46A' } : null;
  const shortSleeve = o.sleeves === 'short';
  const chestZ = (y) => profR(frame, y) * g * depth + 0.004;
  const rig = {
    pelvis: useRef(),
    spine: useRef(),
    head: useRef(),
    hipL: useRef(),
    hipR: useRef(),
    kneeL: useRef(),
    kneeR: useRef(),
    ankleL: useRef(),
    ankleR: useRef(),
    shL: useRef(),
    shR: useRef(),
    elL: useRef(),
    elR: useRef(),
    fingers: useRef([]),
  };
  const mem = useRef({ phase: Math.random() * 6, t: 0 });
  useFrame((_, dt) => updatePose(rig, mem.current, stateRef?.current ?? { anim, speed }, dt));
  const logo = useMemo(() => (s.logo.enabled ? logoTexture(s.logo.text) : null), [s.logo.enabled, s.logo.text]);
  const vestM = mat(s.vestColor, 0.6, 0, { emissive: s.vestColor, emissiveIntensity: 0.08 });
  const reflect = mat('#E8ECEF', 0.22, 0.65, { emissive: '#8C96A0', emissiveIntensity: 0.3 });

  const thighR0 = 0.084 * g, thighR1 = 0.058 * g, shinR1 = 0.04 * g;
  const leg = (side, hipRef, kneeRef, ankleRef) => (
    <group ref={hipRef} position={[side * 0.092 * Math.sqrt(g), hipY, 0]}>
      <M g={limb(thighR0, thighR1, thigh, 0.22, 0.14)} m={bottom} />
      {o.bottomStyle === 'cargo' && <M g={box()} m={mat(shade(o.bottom, 0.85), 0.9)} s={[0.03, 0.1, 0.08]} p={[side * 0.07 * g, -thigh * 0.55, 0]} />}
      {P.harness && <M g={torus(Math.PI * 2)} m={mat('#1F2937', 0.7)} s={[0.082 * g, 0.082 * g, 0.12]} p={[0, -0.09, 0]} r={[Math.PI / 2, 0, 0]} cast={false} />}
      <group ref={kneeRef} position={[0, -thigh, 0]}>
        <M g={limb(thighR1, shinR1, shin, 0.42, 0.16)} m={bottom} />
        <group ref={ankleRef} position={[0, -shin + 0.035, 0]}>
          <Boot color={P.rubberBoots ? '#2E4A2E' : P.boots ? s.bootsColor : '#3F444C'} rubber={!!P.rubberBoots} sole={P.boots || P.rubberBoots ? '#1A1C1F' : '#55595F'} />
        </group>
      </group>
    </group>
  );

  const arm = (side, shRef, elRef) => {
    const sleeveM = top;
    const foreM = shortSleeve ? skin : top;
    const upperLen = 0.29;
    const foreLen = 0.265;
    const shoulderR = 0.05 * g, elbowR = 0.036 * g, wristR = 0.027 * g;
    return (
      // toạ độ tương đối so với nhóm thân (spine) — vai ngay dưới chân cổ
      <group ref={shRef} position={[side * shoulderX, torsoL - 0.06, 0]}>
        <M g={limb(shoulderR, elbowR, upperLen, 0.22, 0.24)} m={shortSleeve ? skin : sleeveM} />
        {shortSleeve && <M g={limb(shoulderR * 1.04, elbowR * 1.3, upperLen * 0.38, 0.3, 0.12)} m={sleeveM} />}
        <group ref={elRef} position={[0, -upperLen, 0]}>
          <M g={limb(elbowR, wristR, foreLen, 0.3, 0.14)} m={foreM} />
          {!shortSleeve && <M g={cyl()} m={topDark} s={[elbowR * 1.08, 0.025, elbowR * 1.08]} p={[0, -0.01, 0]} cast={false} />}
          {side < 0 && P.watch && <M g={torus(Math.PI * 2)} m={mat('#1F2328', 0.3, 0.6)} s={[0.04, 0.04, 0.25]} p={[0, -0.235, 0]} r={[Math.PI / 2, 0, 0]} cast={false} />}
          <group position={[0, -foreLen, 0]}>
            <Hand skin={skin} glove={glove} fingersRef={rig.fingers} side={side} />
            {side < 0 && P.tablet && <M g={box()} m={mat('#1E293B', 0.3, 0.3)} s={[0.012, 0.2, 0.15]} p={[0.03, -0.07, 0.05]} r={[0, 0, 0.1]} />}
          </group>
        </group>
      </group>
    );
  };

  return (
    <group scale={scale}>
      <group ref={rig.pelvis}>
        {leg(-1, rig.hipL, rig.kneeL, rig.ankleL)}
        {leg(1, rig.hipR, rig.kneeR, rig.ankleR)}
        {/* hông (quần) */}
        <M g={lathe(frame, 0, 0.16, 1.02)} m={bottom} s={[g, 1, depth * g]} p={[0, hipY - 0.07, 0]} />
        <group ref={rig.spine} position={[0, hipY - 0.04, 0]}>
          {/* thân áo */}
          <M g={lathe(frame, 0.08, 1)} m={top} s={[g, torsoL, depth * g]} />
          {o.topStyle === 'coverall' && <M g={box()} m={mat('#B8BEC6', 0.3, 0.7)} s={[0.012, torsoL * 0.75, 0.006]} p={[0, torsoL * 0.48, chestZ(0.6) - 0.002]} cast={false} />}
          <M g={torus(Math.PI * 2)} m={o.topStyle === 'coverall' ? topDark : mat(o.bottom === o.top ? shade(o.bottom, 0.7) : '#2A2420', 0.6)} s={[0.145 * g, 0.145 * g * depth, 0.5]} p={[0, 0.07, 0]} r={[Math.PI / 2, 0, 0]} />
          {/* nẹp, túi, cổ áo theo kiểu áo */}
          {(o.topStyle === 'shirt' || o.topStyle === 'polo') && (
            <>
              <M g={box()} m={seam} s={[0.014, torsoL * (o.topStyle === 'polo' ? 0.18 : 0.62), 0.004]} p={[0, torsoL * (o.topStyle === 'polo' ? 0.88 : 0.6), chestZ(o.topStyle === 'polo' ? 0.88 : 0.62)]} cast={false} />
              {[0.92, 0.82, 0.72].slice(0, o.topStyle === 'polo' ? 2 : 3).map((y) => (
                <M key={y} g={sphere()} m={mat('#E5E7EB', 0.4)} s={0.0045} p={[0, torsoL * y, chestZ(y) + 0.003]} cast={false} />
              ))}
              {[-1, 1].map((x) => (
                <M key={x} g={box()} m={seam} s={[0.055, 0.035, 0.012]} p={[x * 0.035, torsoL * 0.99, 0.045 * g]} r={[0.5, x * 0.4, x * 0.5]} cast={false} />
              ))}
            </>
          )}
          {(o.topStyle === 'shirt' || o.topStyle === 'workjacket' || o.topStyle === 'coverall') &&
            [-1, 1].map((x) => (
              <group key={`pk${x}`} position={[x * 0.065 * g, torsoL * 0.72, chestZ(0.72)]} rotation={[0, x * 0.35, 0]}>
                <M g={box()} m={topDark} s={[0.055, 0.06, 0.006]} cast={false} />
                <M g={box()} m={seam} s={[0.057, 0.014, 0.008]} p={[0, 0.028, 0.001]} cast={false} />
              </group>
            ))}
          {o.topStyle === 'workjacket' && <M g={box()} m={mat('#A9AFB8', 0.3, 0.7)} s={[0.01, torsoL * 0.8, 0.006]} p={[0, torsoL * 0.5, chestZ(0.55)]} cast={false} />}
          {o.topStyle === 'jacket' && (
            <>
              <M g={box()} m={mat(o.inner, 0.8)} s={[0.06, torsoL * 0.48, 0.006]} p={[0, torsoL * 0.72, chestZ(0.72) + 0.001]} cast={false} />
              {[-1, 1].map((x) => (
                <M key={`l${x}`} g={box()} m={topDark} s={[0.035, torsoL * 0.36, 0.008]} p={[x * 0.04, torsoL * 0.76, chestZ(0.76) + 0.002]} r={[0, 0, x * 0.18]} cast={false} />
              ))}
            </>
          )}
          {(o.topStyle === 'workjacket' || o.topStyle === 'jacket' || o.topStyle === 'coverall') && <M g={torus(Math.PI * 2)} m={topDark} s={[0.062, 0.05, 0.6]} p={[0, torsoL * 0.985, 0]} r={[Math.PI / 2, 0, 0]} cast={false} />}
          {logo && (
            <mesh position={[-0.07 * g, torsoL * 0.79, chestZ(0.79) + 0.004]} rotation={[0, -0.3, 0]}>
              <planeGeometry args={[0.06, 0.03]} />
              <meshStandardMaterial map={logo} roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
          )}
          {/* áo phản quang: mở phía trước + 2 dải phản quang */}
          {P.vest && (
            <group>
              <M g={lathe(frame, 0.22, 0.97, 1.06, 0.32)} m={vestM} s={[g, torsoL, depth * g]} />
              <M g={lathe(frame, 0.38, 0.44, 1.075, 0.32)} m={reflect} s={[g, torsoL, depth * g]} cast={false} />
              <M g={lathe(frame, 0.56, 0.62, 1.075, 0.32)} m={reflect} s={[g, torsoL, depth * g]} cast={false} />
            </group>
          )}
          {P.harness && (
            <group>
              {[-1, 1].map((x) => (
                <M key={x} g={box()} m={mat('#1F2937', 0.7)} s={[0.025, torsoL * 0.85, 0.32 * g]} p={[x * 0.075 * g, torsoL * 0.55, 0]} cast={false} />
              ))}
              <M g={box()} m={mat('#1F2937', 0.7)} s={[0.2 * g, 0.022, 0.29 * g]} p={[0, torsoL * 0.62, 0]} cast={false} />
              <M g={torus(Math.PI * 2)} m={mat('#B8BEC6', 0.3, 0.8)} s={[0.025, 0.025, 0.4]} p={[0, torsoL * 0.8, -chestZ(0.8) - 0.01]} cast={false} />
            </group>
          )}
          {P.radio && (
            <group position={[0.07 * g, torsoL * 0.82, chestZ(0.82) + (P.vest ? 0.012 : 0.006)]}>
              <M g={box()} m={mat('#1F2328', 0.5)} s={[0.035, 0.075, 0.022]} />
              <M g={cyl()} m={mat('#1F2328', 0.5)} s={[0.004, 0.06, 0.004]} p={[0.01, 0.065, 0]} cast={false} />
            </group>
          )}
          {P.lanyard && (
            <group>
              <M g={torus(Math.PI * 2)} m={mat('#168BFF', 0.6)} s={[0.075, 0.07, 0.05]} p={[0, torsoL * 0.9, 0.03]} r={[1.3, 0, 0]} cast={false} />
              <M g={box()} m={mat('#F4F7FA', 0.5)} s={[0.04, 0.055, 0.004]} p={[0, torsoL * 0.62, chestZ(0.62) + (P.vest ? 0.016 : 0.008)]} cast={false} />
            </group>
          )}
          {P.toolbelt && (
            <group position={[0, 0.06, 0]}>
              <M g={torus(Math.PI * 2)} m={mat('#5B3A24', 0.7)} s={[0.152 * g, 0.152 * g * depth, 0.9]} r={[Math.PI / 2, 0, 0]} />
              {[-1, 1].map((x) => (
                <M key={x} g={box()} m={mat('#6B4A2E', 0.8)} s={[0.07, 0.09, 0.05]} p={[x * 0.14 * g, -0.04, 0.03]} />
              ))}
            </group>
          )}
          {P.backpack && <M g={box()} m={mat('#2A3644', 0.7)} s={[0.24 * g, torsoL * 0.62, 0.12]} p={[0, torsoL * 0.6, -0.12 * g * depth - 0.05]} />}
          {/* tay */}
          {arm(-1, rig.shL, rig.elL)}
          {arm(1, rig.shR, rig.elR)}
          {/* cổ & đầu — cổ thon liền (không còn hình trụ cứng) */}
          <M g={limb(0.052, 0.044, -0.12, -1, 0)} m={skin} p={[0, torsoL - 0.02, 0.004]} />
          <group ref={rig.head} position={[0, torsoL + 0.15, 0.01]}>
            <M g={sphere()} m={skin} s={[0.095 * s.skull[0], 0.115 * s.skull[1], 0.105 * s.skull[2]]} />
            <M g={sphere()} m={skin} s={[0.08 * s.jaw[0], 0.07 * s.jaw[1], 0.085 * s.jaw[2]]} p={[0, -0.048, 0.012]} />
            <Face s={s} skin={skin} lip={lip} hairM={hairM} />
            <Hair style={s.hair} m={hairM} helmet={!!P.helmet} />
            {P.helmet && <Helmet s={s} />}
            <HeadGear s={s} />
          </group>
        </group>
      </group>
    </group>
  );
}

export default memo(ProceduralAvatar);
