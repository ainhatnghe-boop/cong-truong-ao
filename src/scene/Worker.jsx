// Nhân lực low-poly: mũ bảo hộ theo màu nhà thầu, áo phản quang; đi theo runtime.path,
// thi công (vung tay), đứng kiểm tra, ngồi nghỉ tại nhà ăn; có bảng tên & bong bóng lời nói.
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Box } from './Primitives.jsx';
import { PAL } from './palette.js';
import { runtime } from './runtime.js';
import { db, useDB } from '../store/db.js';
import { select, useUI } from '../store/ui.js';

const SPEED = 3.2; // m/s — nhanh hơn thực tế để mô phỏng dễ theo dõi
export const WORKER_SCALE = 1.35; // phóng to nhẹ cho dễ nhìn trên mặt bằng lớn
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export default function Worker({ id }) {
  const w = useDB(() => db.get(id));
  const ctr = useDB(() => db.get(w.contractorId));
  const role = useDB(() => db.get(w.roleId));
  const bubble = useUI((s) => s.bubbles[id]);
  const isSel = useUI((s) => s.selection?.id === id);
  const labels = useUI((s) => s.labels);
  const [hover, setHover] = useState(false);

  const root = useRef();
  const body = useRef();
  const legL = useRef();
  const legR = useRef();
  const armL = useRef();
  const armR = useRef();
  const phase = useRef(Math.random() * 10);

  useFrame((_, dt) => {
    const r = runtime.workers[id];
    if (!r || !root.current) return;
    dt = Math.min(dt, 0.05);
    phase.current += dt;
    let walking = false;
    if (r.mode === 'walk' && r.path.length) {
      const t = r.path[0];
      const dx = t.x - r.x;
      const dz = t.z - r.z;
      const dist = Math.hypot(dx, dz);
      const stepLen = SPEED * dt;
      if (dist <= stepLen) {
        r.x = t.x;
        r.z = t.z;
        r.path.shift();
      } else {
        r.x += (dx / dist) * stepLen;
        r.z += (dz / dist) * stepLen;
        r.rot = lerpAngle(r.rot, Math.atan2(dx, dz), Math.min(1, dt * 10));
      }
      walking = true;
      if (!r.path.length) {
        r.mode = r.arrive.mode;
        r.zoneId = r.arrive.zoneId;
        r.faceTo = r.arrive.faceTo;
      }
    } else if (r.faceTo) {
      r.rot = lerpAngle(r.rot, Math.atan2(r.faceTo[0] - r.x, r.faceTo[1] - r.z), Math.min(1, dt * 6));
    }

    const p = phase.current;
    const sitting = r.mode === 'sit';
    const working = r.mode === 'work';
    root.current.position.set(r.x, 0, r.z);
    root.current.rotation.y = r.rot;
    const swing = walking ? Math.sin(p * 9) * 0.6 : 0;
    body.current.position.y = sitting ? -0.18 : walking ? Math.abs(Math.sin(p * 9)) * 0.05 : 0;
    legL.current.rotation.x = sitting ? -Math.PI / 2 : swing;
    legR.current.rotation.x = sitting ? -Math.PI / 2 : -swing;
    armL.current.rotation.x = working ? -0.6 : sitting ? -0.9 : -swing * 0.8;
    // vung búa / thao tác dụng cụ khi thi công
    armR.current.rotation.x = working ? -1.6 + Math.abs(Math.sin(p * 5)) * 1.2 : sitting ? -0.9 : swing * 0.8;
  });

  const { shirt, skin, vest, hair } = w.look;
  const r0 = runtime.workers[id];
  const showTag = labels || isSel || hover || !!bubble;

  return (
    <group
      ref={root}
      position={[r0?.x ?? 0, 0, r0?.z ?? 0]}
      onClick={(e) => {
        e.stopPropagation();
        select(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = '';
      }}
    >
      {(isSel || hover) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.6, 0.8, 28]} />
          <meshBasicMaterial color={ctr.color} transparent opacity={isSel ? 1 : 0.55} />
        </mesh>
      )}
      <group ref={body} scale={WORKER_SCALE}>
        <group ref={legL} position={[-0.11, 0.52, 0]}>
          <Box size={[0.17, 0.5, 0.2]} position={[0, -0.25, 0]} color="#2C3445" />
        </group>
        <group ref={legR} position={[0.11, 0.52, 0]}>
          <Box size={[0.17, 0.5, 0.2]} position={[0, -0.25, 0]} color="#2C3445" />
        </group>
        <Box size={[0.48, 0.56, 0.3]} position={[0, 0.8, 0]} color={shirt} />
        {vest && (
          <>
            <Box size={[0.5, 0.36, 0.32]} position={[0, 0.84, 0]} color={PAL.safety} outline={false} />
            <Box size={[0.51, 0.05, 0.33]} position={[0, 0.78, 0]} color="#E5E7EB" outline={false} />
          </>
        )}
        <group ref={armL} position={[-0.31, 1.03, 0]}>
          <Box size={[0.13, 0.48, 0.15]} position={[0, -0.22, 0]} color={shirt} />
          <Box size={[0.12, 0.1, 0.13]} position={[0, -0.49, 0]} color={skin} outline={false} />
        </group>
        <group ref={armR} position={[0.31, 1.03, 0]}>
          <Box size={[0.13, 0.48, 0.15]} position={[0, -0.22, 0]} color={shirt} />
          <Box size={[0.12, 0.1, 0.13]} position={[0, -0.49, 0]} color={skin} outline={false} />
          <Box size={[0.06, 0.06, 0.36]} position={[0, -0.52, 0.14]} color={PAL.steelDark} outline={false} />
        </group>
        <group position={[0, 1.32, 0]}>
          <Box size={[0.42, 0.42, 0.42]} color={skin} />
          <Box size={[0.06, 0.08, 0.02]} position={[-0.09, 0.02, 0.215]} color={PAL.ink} outline={false} />
          <Box size={[0.06, 0.08, 0.02]} position={[0.09, 0.02, 0.215]} color={PAL.ink} outline={false} />
          {hair === 'long' && <Box size={[0.44, 0.34, 0.1]} position={[0, -0.04, -0.21]} color="#2B211C" outline={false} />}
          {/* mũ bảo hộ: màu theo nhà thầu (contractors.json → helmet) */}
          <Box size={[0.48, 0.18, 0.48]} position={[0, 0.27, 0]} color={ctr.helmet} />
          <Box size={[0.54, 0.04, 0.6]} position={[0, 0.18, 0.04]} color={ctr.helmet} outline={false} />
        </group>
      </group>

      {showTag && (
        <Html position={[0, 2.7, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
          <div className="agent-tag" style={{ '--accent': ctr.color }}>
            {bubble && <div className="bubble">{bubble}</div>}
            <div className={`agent-tag__name${isSel ? ' is-active' : ''}`}>
              <i className="dot" style={{ background: ctr.helmet }} />
              {w.name}
              {(isSel || hover) && <span className="agent-tag__role"> · {role.title}</span>}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
