// ============================================================
//  Cảnh 3D nhập vai (rendering layer). Logic ở GameSession; ở đây chỉ vẽ + đọc vị trí trong useFrame.
//  Dùng lại renderer của Studio (TerrainView, PartsView, EquipmentModel) → công trình hiển thị đúng tiến độ engine.
// ============================================================
import { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Line, Html, OrbitControls, Environment as EnvReflections, Lightformer, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { session, useSession } from './session.js';
import AvatarRenderer from './character/AvatarRenderer.jsx';
import TerrainView from '../studio/TerrainView.jsx';
import { PartsView, materialFor } from '../studio/ObjectView.jsx';
import { EquipmentModel } from '../studio/EquipmentModels.jsx';
import { getType } from '../engine/ObjectRegistry.js';
import { worldMap, rotY } from '../engine/PlacementSystem.js';
import { progressOf } from '../engine/ConstructionSimulationEngine.js';
import { sample } from '../engine/TerrainEngine.js';
import { DATA } from '../rpg/data.js';
import { zoneAccess } from '../rpg/SafetyZoneSystem.js';

/** Chất lượng đồ hoạ Thấp / Trung bình / Cao (settings.graphicsQuality) — ảnh hưởng độ phân giải, bóng đổ, phản chiếu môi trường */
export const GFX = {
  // mặc định 'medium' giữ đúng hiệu năng bản trước (không bật phản chiếu môi trường) để không làm chậm máy yếu;
  // 'high' mới bật phản chiếu + bóng tiếp xúc, người chơi tự chọn khi máy đủ mạnh.
  low: { label: 'Thấp', dpr: [1, 1], shadowMap: 1024, shadows: true, env: false, contactShadow: false },
  medium: { label: 'Trung bình', dpr: [1, 1.5], shadowMap: 2048, shadows: true, env: false, contactShadow: false },
  high: { label: 'Cao', dpr: [1, 2], shadowMap: 3072, shadows: true, env: true, envRes: 96, contactShadow: true },
};
export const gfxOf = () => GFX[session.profile?.settings?.graphicsQuality] ?? GFX.medium;

/** Trạng thái camera dùng chung (minimap đọc hướng nhìn) */
export const camState = { yaw: Math.PI, pitch: 0.42, dist: 7, mode: 'third' };
/** Thả con trỏ chuột (khi mở menu / hộp thoại) */
export function releaseMouse() {
  if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock?.();
}
if (typeof window !== 'undefined') window.__rpgCam = () => ({ yaw: camState.yaw, mode: camState.mode }); // chỉ đọc, cho kiểm thử

// ---------------- công trình (engine) ----------------
const ObjectNode = memo(function ObjectNode({ node, st, world }) {
  const T = getType(node.type);
  const pr = useMemo(() => (T?.gen ? progressOf(node, st) : null), [node, st, T]);
  return (
    <group position={world.p} rotation-y={world.ry}>
      {pr && <PartsView geo={pr.geo} frac={pr.frac} status={pr.status === 'planned' ? 'active' : pr.status} showGhost cutY={null} shadows />}
      {T?.equip && <EquipmentModel node={node} spec={T.equip} active />}
    </group>
  );
});

function Objects() {
  useSession();
  const doc = session.world?.doc;
  const sim = session.world?.sim;
  const worlds = useMemo(() => (doc ? worldMap(doc) : null), [doc]);
  if (!doc) return null;
  return Object.values(doc.nodes)
    .filter((n) => !n.hidden && !getType(n.type)?.container)
    .map((n) => <ObjectNode key={n.id} node={n} st={sim.nodes[n.id]} world={worlds[n.id]} />);
}

// ---------------- công trình phụ trợ ----------------
const M = {
  wall: new THREE.MeshStandardMaterial({ color: '#E9ECEF', roughness: 0.8 }),
  band: new THREE.MeshStandardMaterial({ color: '#1F5EFF', roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: '#33475E', roughness: 0.15, metalness: 0.4 }),
  roof: materialFor('roofSheet'),
  steel: materialFor('steel'),
  green: new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.6 }),
  white: new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.7 }),
  yellow: new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.5 }),
  red: new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.5 }),
  post: new THREE.MeshStandardMaterial({ color: '#9CA3AF', roughness: 0.5, metalness: 0.5 }),
  mesh: new THREE.MeshStandardMaterial({ color: '#2F6B4F', roughness: 0.9, transparent: true, opacity: 0.55 }),
};
const B = ({ s, p, m }) => (
  <mesh position={p} material={m} castShadow receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);

function Facility({ f }) {
  const [w, d] = f.size;
  let body = null;
  if (f.kind === 'office')
    body = (
      <>
        <B s={[w, 3, d]} p={[0, 1.5, 0]} m={M.wall} />
        <B s={[w + 0.1, 0.35, d + 0.1]} p={[0, 2.7, 0]} m={M.band} />
        <B s={[w * 0.7, 1, 0.05]} p={[-w * 0.08, 1.7, d / 2 + 0.03]} m={M.glass} />
        <B s={[1.1, 2.1, 0.06]} p={[w * 0.38, 1.05, d / 2 + 0.03]} m={M.glass} />
        <B s={[w + 0.6, 0.2, d + 0.6]} p={[0, 3.1, 0]} m={M.roof} />
      </>
    );
  if (f.kind === 'warehouse')
    body = (
      <>
        <B s={[w, 4.5, d]} p={[0, 2.25, 0]} m={M.roof} />
        <B s={[4, 3.5, 0.08]} p={[0, 1.75, d / 2 + 0.05]} m={M.steel} />
        <B s={[w + 0.6, 0.25, d + 0.6]} p={[0, 4.6, 0]} m={M.post} />
      </>
    );
  if (f.kind === 'drawing' || f.kind === 'hseBoard')
    body = (
      <>
        <B s={[0.1, 2.2, 0.1]} p={[-w / 2 + 0.2, 1.1, 0]} m={M.post} />
        <B s={[0.1, 2.2, 0.1]} p={[w / 2 - 0.2, 1.1, 0]} m={M.post} />
        <B s={[w, 1.4, 0.08]} p={[0, 1.6, 0.06]} m={f.kind === 'hseBoard' ? M.green : M.white} />
        <B s={[w * 0.8, 0.12, 0.02]} p={[0, 2.05, 0.11]} m={f.kind === 'hseBoard' ? M.white : M.band} />
      </>
    );
  if (f.kind === 'gate')
    body = (
      <>
        <B s={[2.2, 2.5, 2.2]} p={[0, 1.25, 0]} m={M.white} />
        <B s={[2.5, 0.2, 2.5]} p={[0, 2.6, 0]} m={M.band} />
        <B s={[1.6, 0.8, 0.05]} p={[0, 1.5, 1.12]} m={M.glass} />
      </>
    );
  return (
    <group position={[f.x, f.y, f.z]} rotation-y={f.ry}>
      {body}
      <Html position={[0, f.kind === 'warehouse' ? 6 : f.kind === 'office' ? 4.2 : 3, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="rp-sign">{f.label}</div>
      </Html>
    </group>
  );
}

function Fence() {
  const { cw, world } = session;
  const t = world?.doc.site.terrain;
  const posts = useMemo(() => {
    const pts = [];
    if (!cw) return pts;
    for (const [a, b] of cw.segments) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(L / 3));
      for (let k = 0; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    return pts;
  }, [cw]);
  const ref = useRef();
  useEffect(() => {
    if (!ref.current || !t) return;
    const m = new THREE.Matrix4();
    posts.forEach(([x, z], i) => {
      m.makeTranslation(x, sample(t, x, z) + 1, z);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [posts, t]);
  if (!cw || !world) return null;
  return (
    <group>
      <instancedMesh ref={ref} args={[null, M.post, posts.length]} castShadow>
        <boxGeometry args={[0.12, 2, 0.12]} />
      </instancedMesh>
      {cw.segments.map(([a, b], i) => {
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const mx = (a[0] + b[0]) / 2;
        const mz = (a[1] + b[1]) / 2;
        return (
          <mesh key={i} position={[mx, sample(t, mx, mz) + 1.05, mz]} rotation-y={Math.atan2(b[0] - a[0], b[1] - a[1])} material={M.mesh}>
            <boxGeometry args={[0.04, 1.7, L]} />
          </mesh>
        );
      })}
      <B s={[0.25, 2.4, 0.25]} p={[world.gate.x - world.gate.nz * 5, sample(t, world.gate.x, world.gate.z) + 1.2, world.gate.z + world.gate.nx * 5]} m={M.yellow} />
      <B s={[0.25, 2.4, 0.25]} p={[world.gate.x + world.gate.nz * 5, sample(t, world.gate.x, world.gate.z) + 1.2, world.gate.z - world.gate.nx * 5]} m={M.yellow} />
    </group>
  );
}

// ---------------- vùng an toàn ----------------
function ZoneVisual({ z, blocked, t }) {
  const color = DATA.levelById[z.level]?.color ?? '#999';
  const c = z.shape.c;
  const y = sample(t, c[0], c[1]) + 0.12;
  const op = blocked ? 0.28 : 0.13;
  if (z.shape.type === 'circle')
    return (
      <group position={[c[0], y, c[1]]}>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[z.shape.r, 48]} />
          <meshBasicMaterial color={color} transparent opacity={op} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
        {blocked && (
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[z.shape.r, z.shape.r, 1, 48, 1, true]} />
            <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
    );
  if (z.shape.type === 'box')
    return (
      <group position={[c[0], y, c[1]]} rotation-y={z.shape.ry ?? 0}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[z.shape.hx * 2, z.shape.hz * 2]} />
          <meshBasicMaterial color={color} transparent opacity={op} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
        {blocked && (
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[z.shape.hx * 2, 1, z.shape.hz * 2]} />
            <meshBasicMaterial color={color} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
    );
  return null;
}

function Zones() {
  useSession();
  if (!session.world) return null;
  const ctx = session.accessCtx();
  const t = session.world.doc.site.terrain;
  return session.zones.filter((z) => z.kind !== 'general' && z.level !== 'safe').map((z) => <ZoneVisual key={z.id} z={z} blocked={!zoneAccess(z, ctx).allowed} t={t} />);
}

// ---------------- dẫn đường ----------------
function RouteLine() {
  const route = useSession((s) => s.route);
  const t = session.world?.doc.site.terrain;
  const pts = useMemo(() => {
    if (!route || !session.cw) return null;
    const out = [];
    for (let i = 0; i < route.points.length - 1; i++) {
      const [ax, az] = route.points[i];
      const [bx, bz] = route.points[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        out.push([x, session.cw.groundAt(x, z) + 0.25, z]);
      }
    }
    const [lx, lz] = route.points.at(-1);
    out.push([lx, session.cw.groundAt(lx, lz) + 0.25, lz]);
    return out.length > 1 ? out : null;
  }, [route, t]);
  if (!pts) return null;
  return <Line points={pts} color="#22D3EE" lineWidth={4} dashed dashSize={1.2} gapSize={0.8} />;
}

/** Điểm vừa bấm chuột phải (click-to-move) — vòng tròn xanh dương nhấp nháy, khác màu mục tiêu nhiệm vụ (cam) */
function ClickMarker() {
  useSession();
  const ref = useRef();
  const route = session.route;
  const show = !!(route && route.key === null && session.cw);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.visible = show;
    if (show) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.12);
  });
  if (!show) return null;
  const { x, z } = route.target;
  const y = session.cw.groundAt(x, z) + 0.09;
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.45, 0.65, 32]} />
        <meshBasicMaterial color="#168BFF" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#168BFF" transparent opacity={0.95} depthWrite={false} />
      </mesh>
    </group>
  );
}

function TargetMarker() {
  useSession();
  const ref = useRef();
  const o = session.world ? session.objective() : null;
  const tp = o?.target ? session.targetPos(o.target) : null;
  useFrame(({ clock }) => {
    if (ref.current && session.cw) ref.current.position.y = (tp ? session.cw.groundAt(tp.x, tp.z) : 0) + 3.2 + Math.sin(clock.elapsedTime * 3) * 0.25;
  });
  if (!tp) return null;
  return (
    <group position={[tp.x, 0, tp.z]}>
      <group ref={ref}>
        <mesh rotation-x={Math.PI}>
          <coneGeometry args={[0.45, 1.1, 4]} />
          <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.6} />
        </mesh>
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0, session.cw.groundAt(tp.x, tp.z) + 0.1, 0]}>
        <ringGeometry args={[1.2, 1.5, 40]} />
        <meshBasicMaterial color="#22C55E" transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}

function InteractHighlight() {
  const ref = useRef();
  useFrame(({ clock }) => {
    const it = session.interactable;
    const g = ref.current;
    if (!g || !session.cw) return;
    let p = null;
    if (it?.npc) p = [it.npc.x, it.npc.z];
    else if (it?.kind === 'facility') {
      const tp = session.targetPos(it.key);
      p = [tp.x, tp.z];
    } else if (it?.key === 'workfront' && session.workfront) p = [session.workfront.x, session.workfront.z];
    else if (it?.node) p = [session.char.x, session.char.z];
    g.visible = !!p;
    if (p) {
      g.position.set(p[0], session.cw.groundAt(p[0], p[1]) + 0.08, p[1]);
      g.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.08);
    }
  });
  return (
    <group ref={ref}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.7, 0.9, 32]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---------------- nhân vật & NPC ----------------
function Player() {
  const p = useSession((s) => s.profile);
  const ref = useRef();
  const st = useRef({ anim: 'idle', speed: 0 });
  // chỉ vẽ PPE đã cấp & đang mặc (đúng như hệ thống an toàn công nhận)
  const equipped = useMemo(() => p.ppe.equipped.filter((id) => p.ppe.owned.includes(id)), [p.ppe]);
  useFrame(() => {
    const c = session.char;
    if (!c || !ref.current) return;
    ref.current.position.set(c.x, c.y, c.z);
    ref.current.rotation.y = c.yaw;
    st.current.anim = c.anim;
    st.current.speed = c.speed;
  });
  return (
    <group ref={ref}>
      <AvatarRenderer character={p.character} equipped={equipped} stateRef={st} rendererId={p.settings.characterRenderer} />
    </group>
  );
}

const NPC_PPE = ['helmet', 'boots', 'vest'];
function Npc({ n }) {
  const ref = useRef();
  const st = useRef({ anim: 'idle', speed: 0 });
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(n.x, n.y ?? 0, n.z);
    ref.current.rotation.y = n.yaw;
    st.current.anim = n.moving ? 'walk' : 'idle';
    st.current.speed = n.moving ? 2.6 : 0;
  });
  return (
    <group ref={ref}>
      <AvatarRenderer character={n.character} equipped={NPC_PPE} stateRef={st} />
      <Html position={[0, 2.3, 0]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`rp-npc-tag${n.kind === 'guide' ? ' is-guide' : ''}`}>
          <b>NPC</b> {n.kind === 'guide' ? '🤖 ' : ''}
          {n.kind === 'guide' ? n.name : n.roleLabel}
        </div>
      </Html>
    </group>
  );
}

// ---------------- vòng lặp & camera ----------------
function GameLoop({ inputRef, active }) {
  useFrame((_, dt) => session.update(dt, inputRef.current, camState.yaw, active && camState.mode === 'third'), -1);
  return null;
}

/**
 * Camera thứ ba bám nhân vật; tránh xuyên công trình. Chuột:
 *  - "Chuột điều khiển camera" (mặc định bật): bấm vào cảnh → khoá con trỏ, DI CHUỘT để xoay; Esc để thả
 *  - Luôn hỗ trợ giữ chuột & kéo để xoay; cuộn để zoom
 */
function ThirdPersonCamera({ active = true }) {
  const { camera, gl } = useThree();
  const drag = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    if (!active) releaseMouse();
  }, [active]);
  useEffect(() => {
    const el = gl.domElement;
    const sens = () => 0.005 * (session.profile.settings.mouseSensitivity ?? 1);
    const turn = (dx, dy) => {
      camState.yaw -= dx * sens();
      camState.pitch = Math.min(1.25, Math.max(0.05, camState.pitch + dy * sens()));
    };
    const down = (e) => {
      if (e.button !== 0) return; // chỉ chuột trái điều khiển camera; chuột phải dành cho click-to-move
      drag.current = { x: e.clientX, y: e.clientY };
      if (activeRef.current && session.profile.settings.mouseLook !== false && document.pointerLockElement !== el) {
        try {
          const r = el.requestPointerLock?.();
          r?.catch?.(() => {});
        } catch {
          /* trình duyệt không cho khoá con trỏ → vẫn kéo chuột được */
        }
      }
    };
    const move = (e) => {
      if (document.pointerLockElement === el) {
        if (activeRef.current) turn(e.movementX, e.movementY);
        return;
      }
      if (!drag.current) return;
      turn(e.clientX - drag.current.x, e.clientY - drag.current.y);
      drag.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => (drag.current = null);
    const wheel = (e) => {
      camState.dist = Math.min(16, Math.max(2.5, camState.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
      e.preventDefault();
    };
    const ctx = (e) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', ctx);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('contextmenu', ctx);
      releaseMouse();
    };
  }, [gl]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const c = session.char;
    if (!c) return;
    const head = new THREE.Vector3(c.x, c.y + 1.55, c.z);
    const dir = new THREE.Vector3(Math.sin(camState.yaw) * Math.cos(camState.pitch), Math.sin(camState.pitch), Math.cos(camState.yaw) * Math.cos(camState.pitch));
    // chống xuyên: lùi camera về gần nhân vật nếu vướng công trình
    let d = camState.dist;
    for (let s = 0.5; s <= camState.dist; s += 0.5) {
      const p = head.clone().addScaledVector(dir, s);
      const hit = [...session.cw.near(p.x, p.z)].some((o) => {
        if (o.seg || o.walkTop) return false;
        const [lx, lz] = rotY(p.x - o.cx, p.z - o.cz, -o.ry);
        return Math.abs(lx) < o.hx + 0.3 && Math.abs(lz) < o.hz + 0.3 && p.y < o.top + 0.3;
      });
      if (hit || p.y < session.cw.groundAt(p.x, p.z) + 0.3) {
        d = Math.max(1.2, s - 0.5);
        break;
      }
    }
    tmp.copy(head).addScaledVector(dir, d);
    const k = Math.min(1, dt * 8 * (session.profile.settings.cameraSpeed ?? 1));
    camera.position.lerp(tmp, k);
    camera.lookAt(head);
  });
  return null;
}

function FreeCamera() {
  const c = session.char;
  if (!c) return null;
  return <OrbitControls makeDefault target={[c.x, c.y + 1, c.z]} maxPolarAngle={1.5} minDistance={3} maxDistance={250} />;
}

function Environment({ gfx }) {
  const light = useRef();
  const target = useMemo(() => new THREE.Object3D(), []);
  const { scene } = useThree();
  useEffect(() => {
    scene.add(target);
    return () => scene.remove(target);
  }, [scene, target]);
  useFrame(() => {
    const c = session.char;
    if (!c || !light.current) return;
    light.current.position.set(c.x + 40, c.y + 70, c.z + 30);
    target.position.set(c.x, c.y, c.z);
    light.current.target = target;
  });
  const size = session.world ? Math.max(session.world.doc.site.width, session.world.doc.site.depth) : 300;
  return (
    <>
      <Sky distance={450000} sunPosition={[120, 70, 60]} turbidity={6} rayleigh={1.2} />
      <fog attach="fog" args={['#C9D8E4', size * 0.6, size * 2]} />
      <hemisphereLight args={['#E8F1FF', '#8C7E62', 0.85]} />
      <directionalLight ref={light} intensity={2.3} color="#FFF4E0" castShadow={gfx.shadows} shadow-mapSize={[gfx.shadowMap, gfx.shadowMap]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} shadow-camera-far={250} shadow-bias={-0.0004} shadow-normalBias={0.04} />
      {/* Phản chiếu môi trường PBR nhẹ cho bề mặt kim loại/kính (cẩu, kính văn phòng, xe). KHÔNG tải ảnh HDR từ mạng —
          dựng bằng Lightformer tại chỗ (đúng quy tắc chỉ dùng asset tự có trong dự án), chỉ bật ở Trung bình/Cao. */}
      {gfx.env && (
        <EnvReflections resolution={gfx.envRes} frames={1} background={false}>
          <Lightformer intensity={1.1} position={[0, 60, 0]} scale={[200, 200, 1]} rotation-x={Math.PI / 2} color="#DCE8F5" />
          <Lightformer intensity={0.6} position={[-80, 25, 0]} rotation-y={Math.PI / 2} scale={[100, 40, 1]} color="#FFF4E0" />
          <Lightformer intensity={0.5} position={[80, 25, 0]} rotation-y={-Math.PI / 2} scale={[100, 40, 1]} color="#AFC6DE" />
        </EnvReflections>
      )}
    </>
  );
}

/** Bấm CHUỘT PHẢI lên mặt đất → nhân vật TỰ ĐI tới đó (tránh vật cản & vùng chưa được phép).
 *  Chuột trái vẫn dành riêng cho xoay camera, không xung đột. Nếu con trỏ đang bị khoá (đang xoay camera
 *  bằng di chuột) thì bấm phải chỉ để THẢ con trỏ ra trước (toạ độ chuột không đáng tin khi đang khoá). */
function useGroundClick(active) {
  const activeRef = useRef(active);
  activeRef.current = active;
  return useMemo(
    () => ({
      onPointerDown: (e) => {
        if (e.button !== 2) return;
        e.stopPropagation();
        if (!activeRef.current || camState.mode !== 'third' || session.dialog || session.mapOpen) return;
        if (typeof document !== 'undefined' && document.pointerLockElement) {
          releaseMouse();
          return;
        }
        session.walkTo(e.point.x, e.point.z);
      },
    }),
    [],
  );
}

/** Bóng tiếp xúc mềm dưới chân nhân vật (chỉ bật ở chất lượng Cao — tốn hiệu năng) */
function PlayerContactShadow() {
  const ref = useRef();
  useFrame(() => {
    const c = session.char;
    if (ref.current && c) ref.current.position.set(c.x, c.y + 0.02, c.z);
  });
  return (
    <group ref={ref}>
      <ContactShadows opacity={0.45} scale={3.2} blur={2} far={1.6} resolution={256} frames={1} />
    </group>
  );
}

export default function WorldView({ inputRef, active, camMode }) {
  camState.mode = camMode;
  const groundHandlers = useGroundClick(active);
  const w = session.world;
  const gfx = useSession(gfxOf);
  if (!w) return null;
  return (
    <Canvas key={session.profile.settings.graphicsQuality} shadows={gfx.shadows} dpr={gfx.dpr} camera={{ fov: 55, near: 0.1, far: 3000, position: [w.spawn.x, 10, w.spawn.z + 10] }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }}>
      <Environment gfx={gfx} />
      <TerrainView terrain={w.doc.site.terrain} handlers={groundHandlers} shadows={gfx.shadows} grid={false} gridSize={1} />
      <Objects />
      {w.facilities.map((f) => (
        <Facility key={f.kind} f={f} />
      ))}
      <Fence />
      <Zones />
      <RouteLine />
      <ClickMarker />
      <TargetMarker />
      <InteractHighlight />
      {gfx.contactShadow && <PlayerContactShadow />}
      <Player />
      {session.npcs.map((n) => (
        <Npc key={n.id} n={n} />
      ))}
      <GameLoop inputRef={inputRef} active={active} />
      {camMode === 'third' ? <ThirdPersonCamera active={active} /> : <FreeCamera />}
    </Canvas>
  );
}
