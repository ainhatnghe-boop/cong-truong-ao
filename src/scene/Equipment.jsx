// ============================================================
//  Thiết bị thi công (equipment.json): cẩu tháp, cẩu bánh xích, xe tải, xe bồn, máy đào, sà lan cẩu.
//  status = working → có chuyển động; idle → đứng yên; maintenance → đứng yên + đèn đỏ.
//  Xe chạy theo tuyến routeId (routes.json); vị trí xe ghi vào runtime.vehicles để camera bám theo.
// ============================================================
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Box, Cyl } from './Primitives.jsx';
import { PAL } from './palette.js';
import { runtime } from './runtime.js';
import { routeGeometry, pointAt } from './layout.js';
import { db, useDB } from '../store/db.js';
import { select, useUI } from '../store/ui.js';

function useHover() {
  const [hover, setHover] = useState(false);
  return [
    hover,
    {
      onPointerOver: (e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        setHover(false);
        document.body.style.cursor = '';
      },
    },
  ];
}

function Beacon({ y, on, night }) {
  return (
    <mesh position={[0, y, 0]}>
      <sphereGeometry args={[0.35, 8, 6]} />
      <meshBasicMaterial color={on ? '#FF3B30' : night ? '#FFB020' : '#C2410C'} />
    </mesh>
  );
}

function Tag({ eq, y, show }) {
  if (!show) return null;
  return (
    <Html position={[0, y, 0]} center zIndexRange={[18, 8]} style={{ pointerEvents: 'none' }}>
      <div className="eq-tag">
        {eq.code} · <span>{eq.status === 'working' ? 'đang chạy' : eq.status === 'idle' ? 'chờ việc' : 'bảo dưỡng'}</span>
      </div>
    </Html>
  );
}

function TowerCrane({ eq, active, night }) {
  const { height = 26, jib = 24 } = eq.params;
  const slew = useRef();
  const trolley = useRef();
  const cable = useRef();
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime * 0.25 + seed;
    slew.current.rotation.y = Math.sin(t) * 1.4 + seed;
    const d = jib * (0.45 + 0.35 * Math.sin(t * 1.7));
    trolley.current.position.x = d;
    const L = height * (0.35 + 0.3 * (1 + Math.sin(t * 2.3)));
    cable.current.scale.y = L;
    cable.current.position.y = -L / 2;
  });
  return (
    <group>
      <Box size={[3, 1, 3]} position={[0, 0.5, 0]} color={PAL.concreteDark} />
      <Box size={[1.4, height, 1.4]} position={[0, height / 2 + 1, 0]} color={PAL.craneYellow} />
      <group ref={slew} position={[0, height + 1, 0]}>
        <Box size={[2, 1.6, 2]} position={[0, 0.8, 0]} color={PAL.craneYellow} />
        <Box size={[1.2, 1, 1.4]} position={[0.6, 0.6, 1.4]} color={PAL.white} />
        <Box size={[jib, 0.9, 0.9]} position={[jib / 2, 1.9, 0]} color={PAL.craneYellow} />
        <Box size={[jib * 0.35, 0.9, 0.9]} position={[-jib * 0.175, 1.9, 0]} color={PAL.craneYellow} />
        <Box size={[2.6, 1.8, 1.6]} position={[-jib * 0.3, 1.2, 0]} color={PAL.concrete} />
        <Box size={[0.6, 4, 0.6]} position={[0, 3.6, 0]} color={PAL.craneYellow} />
        <group ref={trolley} position={[jib * 0.6, 1.3, 0]}>
          <Box size={[1, 0.4, 1]} color={PAL.steelDark} outline={false} />
          <mesh ref={cable}>
            <boxGeometry args={[0.05, 1, 0.05]} />
            <meshBasicMaterial color={PAL.ink} />
          </mesh>
        </group>
        <Beacon y={5.8} on={eq.status === 'maintenance'} night={night} />
      </group>
    </group>
  );
}

function CrawlerCrane({ eq, active, night }) {
  const { boom = 24 } = eq.params;
  const slew = useRef();
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (!active) return;
    slew.current.rotation.y = Math.sin(clock.elapsedTime * 0.18 + seed) * 0.9 + seed;
  });
  return (
    <group>
      <Box size={[7, 1.2, 1.4]} position={[0, 0.6, 2]} color={PAL.steelDark} />
      <Box size={[7, 1.2, 1.4]} position={[0, 0.6, -2]} color={PAL.steelDark} />
      <group ref={slew} position={[0, 1.2, 0]}>
        <Box size={[5, 2.2, 3.6]} position={[-0.8, 1.1, 0]} color={PAL.craneYellow} />
        <Box size={[1.6, 1.6, 1.2]} position={[1.4, 1.4, 1.4]} color={PAL.white} />
        <Box size={[2, 2, 3.4]} position={[-3.6, 1.2, 0]} color={PAL.steelDark} />
        <group position={[1.6, 2, 0]} rotation={[0, 0, 1.05]}>
          <Box size={[boom, 0.8, 0.8]} position={[boom / 2, 0, 0]} color={PAL.craneYellow} />
        </group>
        <mesh position={[1.6 + Math.cos(1.05) * boom, 2 + Math.sin(1.05) * boom * 0.5, 0]}>
          <boxGeometry args={[0.05, Math.sin(1.05) * boom, 0.05]} />
          <meshBasicMaterial color={PAL.ink} />
        </mesh>
        <Beacon y={3} on={eq.status === 'maintenance'} night={night} />
      </group>
    </group>
  );
}

function Excavator({ eq, active }) {
  const arm = useRef();
  const cab = useRef();
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    arm.current.rotation.z = -0.4 + Math.sin(t * 1.2) * 0.35;
    cab.current.rotation.y = Math.sin(t * 0.5) * 0.8;
  });
  return (
    <group>
      <Box size={[3.4, 0.8, 0.7]} position={[0, 0.4, 1]} color={PAL.steelDark} />
      <Box size={[3.4, 0.8, 0.7]} position={[0, 0.4, -1]} color={PAL.steelDark} />
      <group ref={cab} position={[0, 0.8, 0]}>
        <Box size={[2.6, 1.2, 2.2]} position={[-0.3, 0.6, 0]} color={PAL.craneYellow} />
        <Box size={[1, 1.1, 1]} position={[0.5, 1.6, 0.5]} color={PAL.glass} />
        <group ref={arm} position={[1, 1, 0]}>
          <Box size={[3, 0.45, 0.45]} position={[1.5, 0, 0]} color={PAL.craneYellow} />
          <Box size={[0.4, 2, 0.4]} position={[3, -1, 0]} color={PAL.craneYellow} />
          <Box size={[0.9, 0.7, 0.9]} position={[3.2, -2, 0]} color={PAL.steelDark} />
        </group>
      </group>
    </group>
  );
}

function BargeCrane({ eq, active, night }) {
  const root = useRef();
  const slew = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    root.current.position.y = -0.4 + Math.sin(t * 0.8) * 0.12;
    root.current.rotation.z = Math.sin(t * 0.6) * 0.015;
    if (active) slew.current.rotation.y = Math.sin(t * 0.15) * 0.7 + 1.6;
  });
  const { boom = 20 } = eq.params;
  return (
    <group ref={root}>
      <Box size={[10, 1.2, 16]} position={[0, 0, 0]} color="#3F4A5C" />
      <group ref={slew} position={[0, 0.6, -4]}>
        <Box size={[4, 2.4, 4]} position={[0, 1.2, 0]} color={PAL.white} />
        <group position={[0, 2, 0]} rotation={[0, 0, 0.9]}>
          <Box size={[boom, 0.7, 0.7]} position={[boom / 2, 0, 0]} color="#E4572E" />
        </group>
        <Beacon y={3} on={eq.status === 'maintenance'} night={night} />
      </group>
    </group>
  );
}

/** Xe tải / xe bồn chạy theo tuyến */
function Vehicle({ eq, active }) {
  const root = useRef();
  const drum = useRef();
  const route = useDB(() => db.get(eq.routeId));
  const geo = useMemo(() => routeGeometry(route), [route]);
  const s = useRef((eq.params.offset ?? 0) * geo.length);
  const lane = route.loop ? 1.6 : 1.4;
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05);
    if (active) s.current += (eq.params.speed ?? 6) * dt;
    const q = pointAt(geo, s.current);
    // đi bên phải làn đường
    const ox = Math.cos(q.rot) * -lane;
    const oz = -Math.sin(q.rot) * -lane;
    root.current.position.set(q.x + ox, 0, q.z + oz);
    root.current.rotation.y = q.rot;
    runtime.vehicles[eq.id] = { x: q.x, z: q.z };
    if (drum.current && active) drum.current.rotation.z += dt * 2;
  });
  const mixer = eq.kind === 'mixer';
  const color = mixer ? PAL.white : '#E4572E';
  return (
    <group ref={root}>
      <Box size={[2.2, 1.6, 1.8]} position={[0, 1.3, 2.2]} color={color} />
      <Box size={[1.9, 0.7, 0.1]} position={[0, 1.6, 3.12]} color={PAL.glass} outline={false} />
      <Box size={[2.2, 0.5, 6]} position={[0, 0.7, 0]} color={PAL.steelDark} />
      {mixer ? (
        <group position={[0, 2, -0.8]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
          <mesh ref={drum} castShadow>
            <cylinderGeometry args={[0.7, 1.1, 3.6, 10]} />
            <meshStandardMaterial color={PAL.craneYellow} flatShading />
          </mesh>
        </group>
      ) : (
        <>
          <Box size={[2.3, 0.9, 4]} position={[0, 1.4, -0.9]} color={PAL.steel} />
          <Cyl r={0.35} h={3.6} rotation={[Math.PI / 2, 0, 0]} position={[-0.5, 2.2, -0.9]} color={PAL.primer} outline={false} />
          <Cyl r={0.35} h={3.6} rotation={[Math.PI / 2, 0, 0]} position={[0.3, 2.2, -0.9]} color={PAL.primer} outline={false} />
        </>
      )}
      {[-2, 0.3, 2.2].map((z) => (
        <Box key={z} size={[2.4, 0.7, 0.7]} position={[0, 0.35, z]} color="#1F2430" outline={false} />
      ))}
    </group>
  );
}

const KINDS = { towerCrane: TowerCrane, crawlerCrane: CrawlerCrane, excavator: Excavator, bargeCrane: BargeCrane, truck: Vehicle, mixer: Vehicle };
const TAG_Y = { towerCrane: (eq) => (eq.params.height ?? 26) + 8, crawlerCrane: () => 6, excavator: () => 5, bargeCrane: () => 6, truck: () => 4.5, mixer: () => 4.5 };

export default function Equipment({ id }) {
  const eq = useDB(() => db.get(id));
  const night = useUI((s) => s.night);
  const paused = useUI((s) => s.paused);
  const isSel = useUI((s) => s.selection?.id === id);
  const [hover, handlers] = useHover();
  const K = KINDS[eq.kind];
  if (!K) return null;
  const active = eq.status === 'working' && !paused;
  const moving = eq.kind === 'truck' || eq.kind === 'mixer';
  const body = <K eq={eq} active={active} night={night} />;
  const onClick = (e) => {
    e.stopPropagation();
    select(id);
  };
  if (moving)
    return (
      <group onClick={onClick} {...handlers}>
        {body}
        {/* tag xe: gắn trong Vehicle sẽ xoay theo xe; hiển thị qua panel là đủ */}
      </group>
    );
  return (
    <group position={[eq.pos[0], 0, eq.pos[1]]} onClick={onClick} {...handlers}>
      {(isSel || hover) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[3.6, 4.2, 32]} />
          <meshBasicMaterial color={PAL.amber} transparent opacity={isSel ? 1 : 0.6} />
        </mesh>
      )}
      {body}
      <Tag eq={eq} y={TAG_Y[eq.kind](eq)} show={isSel || hover} />
    </group>
  );
}
