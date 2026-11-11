// ============================================================
//  Cảnh 3D tổng mặt bằng công trường: nền, biển, đường nội bộ, hạng mục, nhân lực, thiết bị.
//  Camera bám theo id được chọn (focusOf) — tiền tố id quyết định cách lấy toạ độ.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Html } from '@react-three/drei';
import Worker from './Worker.jsx';
import Equipment from './Equipment.jsx';
import { BUILDERS } from './Structures.jsx';
import { Box, Cyl } from './Primitives.jsx';
import { PAL, SKY } from './palette.js';
import { runtime, initRuntime } from './runtime.js';
import { db, useDB } from '../store/db.js';
import { ui, useUI, select } from '../store/ui.js';
import { prefixOf } from '../data/index.js';
import { zoneMetrics, spiTone } from '../store/metrics.js';

const HOME = { pos: [-16, 104, 118], target: [-12, 0, -8] };
const SITE = { x0: -64, x1: 64, z0: -38, z1: 56 }; // ranh giới hàng rào (bờ biển ở z0)

/** Điểm nhìn cho 1 id: [x, y, z, khoảng cách] hoặc null */
export function focusOf(id) {
  const p = prefixOf(id);
  const rec = db.get(id);
  if (!rec) return null;
  if (p === 'ZONE') return [rec.center[0], 2, rec.center[1], Math.max(...rec.size) * 1.3 + 20];
  if (p === 'WK') {
    const r = runtime.workers[id];
    if (!r) return null;
    // hướng nhìn: từ tâm hạng mục ra phía người đứng → camera ở phía ngoài, công trình không che
    const zc = r.zoneId ? db.get(r.zoneId)?.center : null;
    let dx = zc ? r.x - zc[0] : 0;
    let dz = zc ? r.z - zc[1] : 1;
    const L = Math.hypot(dx, dz) || 1;
    dx /= L;
    dz /= L;
    return [r.x, 1, r.z, 16, 'out', dx, dz];
  }
  if (p === 'EQ') {
    const v = rec.pos ? { x: rec.pos[0], z: rec.pos[1] } : runtime.vehicles[id];
    return v ? [v.x, 2, v.z, rec.kind === 'towerCrane' ? 48 : 30] : null;
  }
  if (p === 'PKG') {
    const zs = db.list('zones', (z) => z.packageId === id);
    if (!zs.length) return null;
    const cx = zs.reduce((a, z) => a + z.center[0], 0) / zs.length;
    const cz = zs.reduce((a, z) => a + z.center[1], 0) / zs.length;
    return [cx, 0, cz, 75];
  }
  if (p === 'MS') return focusOf(rec.packageId);
  if (rec.zoneId) return focusOf(rec.zoneId);
  return null;
}

function CameraRig() {
  const ref = useRef();
  const lastAt = useRef(0);
  useEffect(() => {
    ref.current?.setLookAt(...HOME.pos, ...HOME.target, false);
  }, []);
  useEffect(
    () =>
      ui.subscribe(() => {
        const sel = ui.get().selection;
        const c = ref.current;
        if (!c || !sel || sel.at === lastAt.current) return;
        lastAt.current = sel.at;
        if (sel.id === 'HOME' || prefixOf(sel.id) === 'PRJ') {
          c.setLookAt(...HOME.pos, ...HOME.target, true);
          return;
        }
        const t = focusOf(sel.id);
        if (t?.[4] === 'out') c.setLookAt(t[0] + t[5] * 14, 20, t[2] + t[6] * 14, t[0], t[1], t[2], true);
        // nhìn từ hướng Tây-Nam, hơi cao để tránh cột cẩu tháp đứng chắn phía Đông
        else if (t) c.setLookAt(t[0] - t[3] * 0.3, t[3] * 0.85, t[2] + t[3] * 0.8, t[0], t[1], t[2], true);
      }),
    [],
  );
  return <CameraControls ref={ref} makeDefault minDistance={6} maxDistance={190} minPolarAngle={0.12} maxPolarAngle={1.3} smoothTime={0.5} />;
}

function Ground({ night }) {
  return (
    <group>
      {/* đất liền */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, (SITE.z0 + 140) / 2]} receiveShadow>
        <planeGeometry args={[320, 140 - SITE.z0]} />
        <meshStandardMaterial color={PAL.sand} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, (SITE.z0 + SITE.z1) / 2]} receiveShadow>
        <planeGeometry args={[SITE.x1 - SITE.x0, SITE.z1 - SITE.z0]} />
        <meshStandardMaterial color={PAL.pad} roughness={1} />
      </mesh>
      {/* biển */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, SITE.z0 - 80]}>
        <planeGeometry args={[400, 160]} />
        <meshStandardMaterial color={night ? '#1C3A55' : PAL.sea} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.3, SITE.z0 - 0.2]}>
        <boxGeometry args={[320, 0.6, 0.6]} />
        <meshStandardMaterial color={PAL.concreteDark} />
      </mesh>
    </group>
  );
}

function Roads() {
  const routes = useDB(() => db.list('routes'));
  const segs = useMemo(() => {
    const out = [];
    for (const r of routes) {
      const pts = r.loop ? [...r.points, r.points[0]] : r.points;
      for (let i = 0; i < pts.length - 1; i++) out.push({ a: pts[i], b: pts[i + 1], w: r.width ?? 6, id: `${r.id}-${i}` });
    }
    return out;
  }, [routes]);
  return segs.map(({ a, b, w, id }) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const rot = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const dashes = Math.floor(L / 4);
    return (
      <group key={id} position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation={[0, rot, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <planeGeometry args={[w, L + w]} />
          <meshStandardMaterial color={PAL.asphalt} roughness={0.95} />
        </mesh>
        {Array.from({ length: dashes }, (_, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -L / 2 + 2 + i * 4]}>
            <planeGeometry args={[0.18, 1.6]} />
            <meshBasicMaterial color={PAL.roadLine} />
          </mesh>
        ))}
      </group>
    );
  });
}

function Fence() {
  const { x0, x1, z0, z1 } = SITE;
  const posts = [];
  const add = (x, z) => posts.push([x, z]);
  for (let x = x0; x <= x1; x += 8) if (Math.abs(x + 36) > 5) add(x, z1);
  for (let z = z0; z <= z1; z += 8) {
    add(x0, z);
    add(x1, z);
  }
  return (
    <group>
      {posts.map(([x, z], i) => (
        <Box key={i} size={[0.25, 2.2, 0.25]} position={[x, 1.1, z]} color={PAL.steel} outline={false} />
      ))}
      <Box size={[x1 - x0, 1.8, 0.08]} position={[0, 1, z1]} color="#2F6B4F" outline={false} />
      <Box size={[0.08, 1.8, z1 - z0]} position={[x0, 1, (z0 + z1) / 2]} color="#2F6B4F" outline={false} />
      <Box size={[0.08, 1.8, z1 - z0]} position={[x1, 1, (z0 + z1) / 2]} color="#2F6B4F" outline={false} />
    </group>
  );
}

/** Cột đèn pha: sáng khi ca đêm */
function Floodlights({ night }) {
  const spots = [
    [-60, -30],
    [60, -30],
    [-60, 30],
    [60, 30],
    [0, 0],
    [-30, 10],
    [30, 10],
  ];
  return spots.map(([x, z]) => (
    <group key={`${x},${z}`} position={[x, 0, z]}>
      <Cyl r={0.2} h={12} position={[0, 6, 0]} color={PAL.steel} outline={false} />
      <Box size={[1.8, 0.8, 0.5]} position={[0, 12.2, 0]} color={PAL.steelDark} outline={false} />
      <mesh position={[0, 12.1, 0.3]}>
        <boxGeometry args={[1.6, 0.6, 0.05]} />
        <meshBasicMaterial color={night ? '#FFF4C2' : '#E5E7EB'} />
      </mesh>
      {night && <pointLight position={[0, 11, 0]} intensity={260} distance={46} decay={1.6} color="#FFE7B0" />}
    </group>
  ));
}

function Trees() {
  const pts = useMemo(() => {
    const out = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const side = i % 3;
      const x = side === 0 ? -70 - rnd() * 40 : side === 1 ? 70 + rnd() * 40 : -100 + rnd() * 200;
      const z = side === 2 ? 62 + rnd() * 30 : -30 + rnd() * 110;
      out.push([x, z, 0.8 + rnd() * 0.7]);
    }
    return out;
  }, []);
  return pts.map(([x, z, s], i) => (
    <group key={i} position={[x, 0, z]} scale={s}>
      <Cyl r={0.3} h={2} position={[0, 1, 0]} color={PAL.trunk} outline={false} seg={6} />
      <mesh position={[0, 3.4, 0]} castShadow>
        <coneGeometry args={[1.8, 3.6, 7]} />
        <meshStandardMaterial color={PAL.tree} flatShading />
      </mesh>
    </group>
  ));
}

function Zone({ id }) {
  const z = useDB(() => db.get(id));
  const pkg = useDB(() => db.get(z.packageId));
  const m = useDB(() => zoneMetrics(id));
  const isSel = useUI((s) => s.selection?.id === id);
  const filter = useUI((s) => s.packageFilter);
  const [hover, setHover] = useState(false);
  const B = BUILDERS[z.kind];
  const p = z.support ? 1 : (m?.actual ?? 0) / 100;
  const dim = filter !== 'ALL' && filter !== z.packageId;
  const water = z.kind === 'jetty';
  return (
    <group
      position={[z.center[0], 0, z.center[1]]}
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
      {!water && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
          <planeGeometry args={z.size} />
          <meshStandardMaterial color={pkg.color} transparent opacity={isSel ? 0.35 : hover ? 0.25 : 0.12} />
        </mesh>
      )}
      {(isSel || hover) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[Math.max(...z.size) * 0.5 + 1, Math.max(...z.size) * 0.5 + 1.6, 4, 1, Math.PI / 4]} />
          <meshBasicMaterial color={pkg.color} transparent opacity={isSel ? 0.9 : 0.5} />
        </mesh>
      )}
      <group visible={!dim}>{B && <B p={p} params={z.params ?? {}} size={z.size} />}</group>
      <Html position={[0, z.signY ?? 10, 0]} center zIndexRange={[12, 0]}>
        <button className={`zone-sign${isSel ? ' is-active' : ''}${dim ? ' is-dim' : ''}`} style={{ '--c': pkg.color }} onClick={() => select(id)}>
          <span className="zone-sign__code">{z.code}</span>
          <span className="zone-sign__name">{z.name}</span>
          {m && <span className={`zone-sign__pct tone-${spiTone(m.spi)}`}>{m.actual}%</span>}
        </button>
      </Html>
    </group>
  );
}

export default function Site3D() {
  initRuntime();
  const zones = useDB(() => db.list('zones'));
  const workers = useDB(() => db.list('workers', (w) => w.status === 'on-site'));
  const equipment = useDB(() => db.list('equipment'));
  const night = useUI((s) => s.night);
  const sky = night ? SKY.night : SKY.day;
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: HOME.pos, fov: 38, near: 0.5, far: 600 }} onPointerMissed={() => select(null)} gl={{ antialias: true }}>
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.fog, 150, 320]} />
      <hemisphereLight args={[sky.hemiSky, sky.hemiGround, sky.hemi]} />
      <directionalLight
        position={[60, 90, 40]}
        intensity={sky.sun}
        color={sky.sunColor}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-far={300}
        shadow-bias={-0.0005}
      />
      <CameraRig />
      <Ground night={night} />
      <Roads />
      <Fence />
      <Trees />
      <Floodlights night={night} />
      {zones.map((z) => (
        <Zone key={z.id} id={z.id} />
      ))}
      {workers.map((w) => (
        <Worker key={w.id} id={w.id} />
      ))}
      {equipment.map((e) => (
        <Equipment key={e.id} id={e.id} />
      ))}
    </Canvas>
  );
}
