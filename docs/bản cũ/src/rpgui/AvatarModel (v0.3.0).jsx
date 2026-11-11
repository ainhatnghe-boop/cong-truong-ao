// ============================================================
//  Nhân vật 3D procedural, tỷ lệ cơ thể tương đối thực (≈ 7,5 đầu), khớp hông–gối–vai–khuỷu.
//  Animation THEO THỜI GIAN (delta), không phụ thuộc FPS: idle · walk · run · interact.
//  PPE hiển thị theo danh sách đang mặc (mũ, áo phản quang, giày, kính, găng, chống ồn, dây an toàn, mặt nạ…).
//  Có thể thay bằng model GLB có skeleton về sau — giữ nguyên props { appearance, equipped, anim, speed, stateRef }.
// ============================================================
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveAppearance } from '../rpg/AvatarCustomizationSystem.js';

const matCache = new Map();
const mat = (color, rough = 0.75, metal = 0, extra = {}) => {
  const k = `${color}|${rough}|${metal}|${JSON.stringify(extra)}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
  return matCache.get(k);
};
const G = {
  limb: new THREE.CapsuleGeometry(1, 1, 4, 10),
  sphere: new THREE.SphereGeometry(1, 18, 14),
  hemi: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
};

/** Đoạn chi: trụ bán kính r, dài len, treo từ khớp xuống dưới + khớp cầu ở đầu trên */
function Limb({ r, len, material }) {
  return (
    <group>
      <mesh geometry={G.sphere} material={material} scale={r * 1.05} />
      <mesh geometry={G.cyl} material={material} scale={[r, len, r]} position={[0, -len / 2, 0]} castShadow />
    </group>
  );
}

export default function AvatarModel({ appearance, equipped = [], anim: animProp = 'idle', speed: speedProp = 0, shadow = true, stateRef }) {
  const a = useMemo(() => resolveAppearance(appearance), [appearance]);
  const has = (id) => equipped.includes(id);
  const s = a.height / 1.75;
  const w = a.bodyWidth;
  const skin = mat(a.skin, 0.7);
  const top = mat(a.outfitTop, 0.85);
  const bottom = mat(a.outfitBottom, 0.85);
  const hair = mat(a.hairColor, 0.9);
  const boots = mat(has('boots') ? a.bootsColor : '#6B6F76', 0.6);
  const gloveColor = has('insulated-gloves') ? '#E4572E' : has('gloves') ? '#E9C46A' : null;
  const vest = mat(a.vestColor, 0.55, 0, { emissive: a.vestColor, emissiveIntensity: 0.12 });
  const reflect = mat('#E8ECEF', 0.25, 0.6, { emissive: '#9AA4AE', emissiveIntensity: 0.25 });

  const root = useRef();
  const torso = useRef();
  const hipL = useRef();
  const hipR = useRef();
  const kneeL = useRef();
  const kneeR = useRef();
  const shL = useRef();
  const shR = useRef();
  const elL = useRef();
  const elR = useRef();
  const head = useRef();
  const phase = useRef(Math.random() * 6);
  const t = useRef(0);

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1);
    // stateRef (nếu có) cho phép game loop đổi animation mà không re-render React
    const anim = stateRef?.current?.anim ?? animProp;
    const speed = stateRef?.current?.speed ?? speedProp;
    t.current += dt;
    const moving = anim === 'walk' || anim === 'run';
    // nhịp bước theo quãng đường đi được → khớp chân với tốc độ thật
    phase.current += moving ? dt * Math.max(1.5, speed) * (anim === 'run' ? 1.55 : 2.1) : dt * 2;
    const p = phase.current;
    const amp = anim === 'run' ? 0.95 : anim === 'walk' ? 0.55 : 0;
    const k = Math.min(1, dt * 12);
    const lerp = (ref, axis, v) => ref.current && (ref.current.rotation[axis] += (v - ref.current.rotation[axis]) * k);
    lerp(hipL, 'x', Math.sin(p) * amp);
    lerp(hipR, 'x', -Math.sin(p) * amp);
    lerp(kneeL, 'x', moving ? Math.max(0, Math.sin(p + 1.6)) * amp * 1.3 : 0.02);
    lerp(kneeR, 'x', moving ? Math.max(0, Math.sin(p + 1.6 + Math.PI)) * amp * 1.3 : 0.02);
    if (anim === 'interact') {
      // thao tác dụng cụ: tay phải nâng – hạ, tay trái đỡ
      lerp(shR, 'x', -1.3 + Math.sin(t.current * 6) * 0.45);
      lerp(elR, 'x', -0.9);
      lerp(shL, 'x', -0.7);
      lerp(elL, 'x', -1.0);
    } else {
      lerp(shL, 'x', -Math.sin(p) * amp * 0.8);
      lerp(shR, 'x', Math.sin(p) * amp * 0.8);
      lerp(elL, 'x', moving ? -0.35 - (anim === 'run' ? 0.8 : 0) : -0.08);
      lerp(elR, 'x', moving ? -0.35 - (anim === 'run' ? 0.8 : 0) : -0.08);
    }
    lerp(shL, 'z', 0.06);
    lerp(shR, 'z', -0.06);
    if (torso.current) {
      torso.current.rotation.x += ((anim === 'run' ? 0.18 : anim === 'walk' ? 0.05 : 0) - torso.current.rotation.x) * k;
      torso.current.position.y = (moving ? Math.abs(Math.sin(p)) * (anim === 'run' ? 0.05 : 0.025) : 0) + Math.sin(t.current * 1.8) * 0.004;
    }
    if (head.current) head.current.rotation.y = anim === 'idle' ? Math.sin(t.current * 0.6) * 0.15 : 0;
  });

  const helmetColor = a.helmetColor;
  return (
    <group ref={root} scale={[s, s, s]}>
      {/* chân: hông → gối → bàn chân */}
      {[
        [-1, hipL, kneeL],
        [1, hipR, kneeR],
      ].map(([side, hip, knee]) => (
        <group key={side} ref={hip} position={[side * 0.1 * w, 0.95, 0]}>
          <Limb r={0.075 * w} len={0.45} material={bottom} />
          <group ref={knee} position={[0, -0.46, 0]}>
            <Limb r={0.06 * w} len={0.42} material={bottom} />
            <mesh geometry={G.box} material={boots} scale={[0.12, 0.09, 0.26]} position={[0, -0.44, 0.04]} castShadow={shadow} />
            {a.boots === 'rubber' && has('boots') && <mesh geometry={G.cyl} material={boots} scale={[0.075, 0.25, 0.075]} position={[0, -0.3, 0]} />}
          </group>
        </group>
      ))}
      <group ref={torso}>
        {/* hông & thân */}
        <mesh geometry={G.box} material={bottom} scale={[0.29 * w, 0.13, 0.19]} position={[0, 0.98, 0]} castShadow={shadow} />
        <mesh geometry={G.limb} material={top} scale={[0.17 * w, 0.17, 0.12]} position={[0, 1.24, 0]} castShadow={shadow} />
        {has('vest') && (
          <group>
            <mesh geometry={G.limb} material={vest} scale={[0.18 * w, 0.14, 0.13]} position={[0, 1.25, 0]} />
            <mesh geometry={G.box} material={reflect} scale={[0.33 * w, 0.028, 0.245]} position={[0, 1.17, 0]} />
            <mesh geometry={G.box} material={reflect} scale={[0.33 * w, 0.028, 0.245]} position={[0, 1.3, 0]} />
          </group>
        )}
        {has('harness') && (
          <group>
            <mesh geometry={G.box} material={mat('#1F2937')} scale={[0.04, 0.42, 0.27]} position={[-0.08 * w, 1.24, 0]} />
            <mesh geometry={G.box} material={mat('#1F2937')} scale={[0.04, 0.42, 0.27]} position={[0.08 * w, 1.24, 0]} />
          </group>
        )}
        {/* tay: vai → khuỷu → bàn tay */}
        {[
          [-1, shL, elL],
          [1, shR, elR],
        ].map(([side, sh, el]) => (
          <group key={side} ref={sh} position={[side * 0.23 * w, 1.43, 0]}>
            <Limb r={0.055 * w} len={0.29} material={top} />
            <group ref={el} position={[0, -0.29, 0]}>
              <Limb r={0.045 * w} len={0.25} material={top} />
              <mesh geometry={G.sphere} material={gloveColor ? mat(gloveColor, 0.8) : skin} scale={0.055} position={[0, -0.29, 0.01]} />
            </group>
          </group>
        ))}
        {/* cổ & đầu (~1/7,5 chiều cao) */}
        <mesh geometry={G.cyl} material={skin} scale={[0.05, 0.08, 0.05]} position={[0, 1.55, 0]} />
        <group ref={head} position={[0, 1.67, 0]}>
          <mesh geometry={G.sphere} material={skin} scale={[0.1, 0.12, 0.11]} castShadow={shadow} />
          {/* mặt */}
          {[-1, 1].map((x) => (
            <mesh key={x} geometry={G.sphere} material={mat('#1B1E24', 0.3)} scale={0.014} position={[x * 0.037, 0.02, 0.098]} />
          ))}
          {[-1, 1].map((x) => (
            <mesh key={`b${x}`} geometry={G.box} material={hair} scale={[0.04, 0.008, 0.01]} position={[x * 0.038, 0.048, 0.1]} rotation={[0, 0, a.face === 'smile' ? x * 0.15 : 0]} />
          ))}
          <mesh geometry={G.box} material={mat('#9A4F45', 0.6)} scale={[a.face === 'smile' ? 0.045 : 0.035, 0.008, 0.01]} position={[0, -0.05, 0.1]} />
          {a.face === 'beard' && <mesh geometry={G.sphere} material={hair} scale={[0.095, 0.07, 0.08]} position={[0, -0.065, 0.035]} />}
          {a.face === 'mustache' && <mesh geometry={G.box} material={hair} scale={[0.06, 0.012, 0.012]} position={[0, -0.034, 0.104]} />}
          {(a.face === 'glasses' || has('glasses')) && (
            <mesh geometry={G.box} material={has('glasses') ? mat('#9FD6F5', 0.05, 0.1, { transparent: true, opacity: 0.55 }) : mat('#222', 0.4)} scale={[0.11, 0.03, 0.01]} position={[0, 0.02, 0.112]} />
          )}
          {has('respirator') && <mesh geometry={G.box} material={mat('#E5E7EB')} scale={[0.07, 0.05, 0.04]} position={[0, -0.04, 0.1]} />}
          {/* tóc */}
          {a.hair !== 'buzz' && <mesh geometry={G.hemi} material={hair} scale={[0.106, a.hair === 'side' ? 0.1 : 0.085, 0.115]} position={[0, 0.025, -0.004]} />}
          {a.hair === 'buzz' && <mesh geometry={G.hemi} material={hair} scale={[0.102, 0.07, 0.112]} position={[0, 0.03, 0]} />}
          {a.hair === 'long' && <mesh geometry={G.limb} material={hair} scale={[0.035, 0.08, 0.035]} position={[0, -0.07, -0.11]} />}
          {a.hair === 'bun' && <mesh geometry={G.sphere} material={hair} scale={0.045} position={[0, 0.02, -0.12]} />}
          {/* mũ bảo hộ */}
          {has('helmet') && (
            <group position={[0, 0.045, 0]}>
              <mesh geometry={G.hemi} material={mat(helmetColor, 0.35, 0.05)} scale={[0.125, 0.11, 0.135]} castShadow={shadow} />
              <mesh geometry={G.cyl} material={mat(helmetColor, 0.35)} scale={[0.135, 0.008, 0.15]} position={[0, 0, 0.012]} />
              <mesh geometry={G.box} material={mat(helmetColor, 0.35)} scale={[0.1, 0.012, 0.06]} position={[0, 0, 0.14]} />
              {has('welding-mask') && <mesh geometry={G.box} material={mat('#2A2F37', 0.4)} scale={[0.17, 0.14, 0.01]} position={[0, 0.06, 0.14]} rotation={[-1.1, 0, 0]} />}
            </group>
          )}
          {has('earmuffs') &&
            [-1, 1].map((x) => <mesh key={`e${x}`} geometry={G.cyl} material={mat('#DC2626', 0.5)} scale={[0.04, 0.03, 0.04]} position={[x * 0.11, 0.005, 0]} rotation={[0, 0, Math.PI / 2]} />)}
        </group>
      </group>
    </group>
  );
}
