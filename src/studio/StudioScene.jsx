// ============================================================
//  Cảnh 3D của Studio (WorldManager + CameraController + PlacementSystem phía hiển thị).
//  - Địa hình chunk, ranh giới, lưới, nước
//  - Cây đối tượng lồng nhau theo phân cấp (group lồng group) → nhóm/di chuyển cả cụm
//  - Gizmo di chuyển/xoay (TransformControls) → ghi lệnh khi THẢ chuột (1 bước Undo)
//  - Công cụ đặt đối tượng (bóng xem trước + bắt dính), bút địa hình
//  - Camera quỹ đạo, bay bằng phím mũi tên, xem mặt bằng, cắt cao độ, lớp hiển thị
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, TransformControls, Sky, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useProject, project, addNode, setWorld, setTerrainHeights } from '../engine/ProjectManager.js';
import { getType, defaultParams, sanitizeParams } from '../engine/ObjectRegistry.js';
import { build, localBox } from '../engine/ParametricGeometryEngine.js';
import { progressOf } from '../engine/ConstructionSimulationEngine.js';
import { worldMap, worldOf, composeWorld, snapGrid, snapToObjects, worldBox } from '../engine/PlacementSystem.js';
import { sample, applyBrush } from '../engine/TerrainEngine.js';
import { editor, useEditor, select, setTool, gizmoClock, QUALITY } from './editorStore.js';
import { PartsView, SelectionBox, GHOST_PLACE } from './ObjectView.jsx';
import { EquipmentModel, RangeRing, CrewAtWork } from './EquipmentModels.jsx';
import TerrainView, { refreshChunks } from './TerrainView.jsx';

/** Object3D của từng nút (cho gizmo & lấy toạ độ) */
export const objectRefs = new Map();
/** Camera controls dùng chung (focus từ panel) */
export const cameraRef = { current: null };

export function focusSelection() {
  const doc = project.doc();
  const c = cameraRef.current;
  const ids = editor.get().selection;
  if (!doc || !c || !ids.length) return;
  const worlds = worldMap(doc);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const id of ids) {
    const b = worldBox(doc.nodes[id], worlds[id]) ?? { min: worlds[id].p, max: worlds[id].p };
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], b.min[k]);
      max[k] = Math.max(max[k], b.max[k]);
    }
  }
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const r = Math.max(8, Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]));
  c.setLookAt(cx + r * 0.8, cy + r * 0.7, cz + r * 0.9, cx, cy, cz, true);
}

// ---------------- Camera ----------------
function CameraRig({ site }) {
  const ref = useRef();
  const view = useEditor((s) => s.view);
  const tool = useEditor((s) => s.tool);
  const keys = useRef(new Set());
  const size = Math.max(site.width, site.depth);
  useEffect(() => {
    cameraRef.current = ref.current;
    ref.current.setLookAt(size * 0.45, size * 0.38, size * 0.55, 0, 0, 0, false);
    return () => (cameraRef.current = null);
  }, [size]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const A = c.constructor.ACTION;
    c.mouseButtons.left = tool === 'terrain' ? A.NONE : A.ROTATE;
    if (view === 'plan') {
      const t = c.getTarget(new THREE.Vector3());
      c.minPolarAngle = 0;
      c.maxPolarAngle = 0.001;
      c.mouseButtons.left = tool === 'terrain' ? A.NONE : A.TRUCK;
      c.setLookAt(t.x, Math.max(80, c.distance), t.z + 0.01, t.x, 0, t.z, true);
    } else {
      c.minPolarAngle = 0.02;
      c.maxPolarAngle = 1.48;
    }
  }, [view, tool]);
  useEffect(() => {
    const typing = (e) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
    const dn = (e) => !typing(e) && e.key.startsWith('Arrow') && (keys.current.add(e.key), e.preventDefault());
    const up = (e) => keys.current.delete(e.key);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, []);
  // bay camera bằng phím mũi tên (tốc độ theo khoảng cách nhìn)
  useFrame((_, dt) => {
    const c = ref.current;
    if (!c || !keys.current.size) return;
    const v = Math.max(10, c.distance) * dt * 0.9;
    if (keys.current.has('ArrowUp')) c.forward(v, false);
    if (keys.current.has('ArrowDown')) c.forward(-v, false);
    if (keys.current.has('ArrowLeft')) c.truck(-v, 0, false);
    if (keys.current.has('ArrowRight')) c.truck(v, 0, false);
  });
  return <CameraControls ref={ref} makeDefault minDistance={3} maxDistance={size * 2.5} smoothTime={0.35} dollyToCursor />;
}

// ---------------- Môi trường ----------------
function Environment({ night, quality, size }) {
  const light = useRef();
  const q = QUALITY[quality];
  const target = useMemo(() => new THREE.Object3D(), []);
  const { scene } = useThree();
  useEffect(() => {
    scene.add(target);
    return () => scene.remove(target);
  }, [scene, target]);
  // đèn mặt trời bám theo điểm nhìn → bóng đổ sắc nét cả trên bản đồ lớn
  useFrame(() => {
    const c = cameraRef.current;
    if (!c || !light.current) return;
    const t = c.getTarget(new THREE.Vector3());
    light.current.position.set(t.x + 120, 180, t.z + 80);
    target.position.copy(t);
    light.current.target = target;
  });
  const span = 160;
  return (
    <>
      {night ? <color attach="background" args={['#0B1220']} /> : <Sky distance={450000} sunPosition={[120, 70, 60]} turbidity={6} rayleigh={1.2} />}
      <fog attach="fog" args={[night ? '#0B1220' : '#C9D8E4', size * 1.2, size * 3.5]} />
      <hemisphereLight args={[night ? '#53618A' : '#E8F1FF', night ? '#141823' : '#8C7E62', night ? 0.35 : 0.85]} />
      <directionalLight
        ref={light}
        intensity={night ? 0.25 : 2.4}
        color={night ? '#9DB4FF' : '#FFF4E0'}
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-far={600}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {night && <ambientLight intensity={0.15} />}
    </>
  );
}

function Boundary({ site }) {
  const pts = useMemo(() => {
    const b = site.boundary;
    if (!b?.length) return null;
    const out = [];
    for (let i = 0; i <= b.length; i++) {
      const a = b[i % b.length];
      const c = b[(i + 1) % b.length];
      if (i === b.length) break;
      const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / (site.terrain.cell * 2)));
      for (let k = 0; k < n; k++) {
        const x = a[0] + ((c[0] - a[0]) * k) / n;
        const z = a[1] + ((c[1] - a[1]) * k) / n;
        out.push([x, sample(site.terrain, x, z) + 0.4, z]);
      }
    }
    out.push(out[0]);
    return out;
  }, [site]);
  if (!pts) return null;
  return <Line points={pts} color="#E4572E" lineWidth={2.5} dashed dashSize={3} gapSize={2} />;
}

// ---------------- Đối tượng ----------------
function NodeView({ id, ctx }) {
  const node = ctx.doc.nodes[id];
  const T = getType(node.type);
  const st = ctx.sim?.nodes?.[id];
  const pr = useMemo(() => (T?.gen ? progressOf(node, st) : null), [node, st, T]);
  const box = useMemo(() => localBox(node), [node]);
  const refCb = useCallback(
    (o) => {
      if (o) objectRefs.set(id, o);
      else objectRefs.delete(id);
    },
    [id],
  );
  if (!T || node.hidden) return null;
  const visible = ctx.layers[T.category] !== false;
  const selected = ctx.selection.includes(id);
  const world = ctx.worlds[id];
  const cutLocal = ctx.cut.on ? ctx.cut.y - world.p[1] : null;
  const kids = ctx.children[id] ?? [];
  const asg = ctx.assign?.[id];
  const onClick = (e) => {
    e.stopPropagation();
    if (Date.now() < gizmoClock.until) return;
    if (ctx.tool === 'place') return ctx.placeAt(e.point, e.shiftKey);
    if (ctx.tool !== 'select') return;
    select(id, e.shiftKey || e.ctrlKey);
  };
  const onMove = (e) => {
    if (ctx.tool === 'place') {
      e.stopPropagation();
      ctx.hover(e.point);
    }
  };
  return (
    <group ref={refCb} position={node.t.p} rotation-y={node.t.ry} onClick={onClick} onPointerMove={onMove} onDoubleClick={(e) => (e.stopPropagation(), select(id), editor.set({ focusAt: Date.now() }))}>
      {visible && pr && <PartsView geo={pr.geo} frac={pr.frac} status={pr.status} showGhost={ctx.showGhost} cutY={cutLocal} shadows={ctx.shadows} />}
      {visible && T.equip && <EquipmentModel node={node} spec={T.equip} active={ctx.activeEq.has(id)} />}
      {visible && selected && box && <SelectionBox box={box} color={node.locked ? '#94A3B8' : '#F5A524'} />}
      {visible && selected && T.equip && <RangeRing range={T.equip.range} />}
      {visible && asg?.crews > 0 && box && <CrewAtWork box={box} skill={asg.skill} crews={asg.crews} />}
      {T.container && selected && (
        <Html position={[0, 3, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="st-tag">▣ {node.name}</div>
        </Html>
      )}
      {kids.map((cid) => (
        <NodeView key={cid} id={cid} ctx={ctx} />
      ))}
    </group>
  );
}

// ---------------- Gizmo ----------------
function Gizmo({ ctx }) {
  const id = ctx.selection.length === 1 ? ctx.selection[0] : null;
  const node = id ? ctx.doc.nodes[id] : null;
  const [obj, setObj] = useState(null);
  useEffect(() => {
    setObj(id ? objectRefs.get(id) ?? null : null);
  }, [id, ctx.doc]);
  if (!node || !obj || node.locked || ctx.mode !== 'edit' || ctx.tool !== 'select') return null;
  const commit = () => {
    gizmoClock.until = Date.now() + 250;
    const doc = project.doc();
    const n = doc.nodes[id];
    const local = { p: [obj.position.x, obj.position.y, obj.position.z], ry: obj.rotation.y };
    let world = composeWorld(doc, n.parentId, local);
    if (ctx.gizmo === 'translate') {
      if (ctx.snapObject) {
        const s = snapToObjects(doc, n, world, Math.max(0.8, ctx.gridSize * 1.2));
        world = { ...world, p: [s.x, world.p[1], s.z] };
      }
      if (ctx.snapGround && !getType(n.type).container) world = { ...world, p: [world.p[0], sample(doc.site.terrain, world.p[0], world.p[2]), world.p[2]] };
    }
    if (!setWorld(id, world, { coalesce: null, label: ctx.gizmo === 'translate' ? `Di chuyển ${n.name}` : `Xoay ${n.name}` })) {
      // bị từ chối → trả object về đúng dữ liệu
      obj.position.set(...n.t.p);
      obj.rotation.set(0, n.t.ry, 0);
    }
  };
  return (
    <TransformControls
      object={obj}
      mode={ctx.gizmo}
      showX={ctx.gizmo === 'translate'}
      showZ={ctx.gizmo === 'translate'}
      translationSnap={ctx.snapGrid ? ctx.gridSize : null}
      rotationSnap={THREE.MathUtils.degToRad(15)}
      size={0.9}
      onMouseDown={() => (gizmoClock.until = Date.now() + 100000)}
      onMouseUp={commit}
    />
  );
}

// ---------------- Bóng xem trước khi đặt ----------------
function PlaceGhost({ type, pos }) {
  const node = useMemo(() => ({ id: '__ghost', type, params: sanitizeParams(type, defaultParams(type)), t: { p: [0, 0, 0], ry: 0 } }), [type]);
  const T = getType(type);
  const geo = T?.gen ? build(node) : null;
  if (!pos || !T) return null;
  return (
    <group position={pos}>
      {geo && <PartsView geo={geo} frac={[]} status="planned" showGhost cutY={null} shadows={false} ghostMaterial={GHOST_PLACE} />}
      {T.equip && (
        <mesh position={[0, 1.5, 0]} material={GHOST_PLACE}>
          <boxGeometry args={[T.equip.footprint[0], 3, T.equip.footprint[1]]} />
        </mesh>
      )}
      {T.container && (
        <mesh position={[0, 1, 0]} material={GHOST_PLACE}>
          <boxGeometry args={[4, 2, 4]} />
        </mesh>
      )}
    </group>
  );
}

function BrushCursor({ pos, radius }) {
  if (!pos) return null;
  return (
    <mesh position={[pos[0], pos[1] + 0.3, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.4, radius, 64]} />
      <meshBasicMaterial color="#F5A524" transparent opacity={0.85} depthTest={false} />
    </mesh>
  );
}

// ---------------- Gốc cảnh ----------------
function World() {
  const doc = useProject((s) => s.doc);
  const sim = useProject((s) => s.sim);
  const ed = useEditor((s) => s);
  const [ghost, setGhost] = useState(null);
  const [brushPos, setBrushPos] = useState(null);
  const stroke = useRef(null);
  const q = QUALITY[ed.quality];

  const children = useMemo(() => {
    const m = { __root: [] };
    for (const n of Object.values(doc.nodes)) (m[n.parentId ?? '__root'] ??= []).push(n.id);
    for (const k of Object.keys(m)) m[k].sort((a, b) => doc.nodes[a].order - doc.nodes[b].order);
    return m;
  }, [doc.nodes]);
  const worlds = useMemo(() => worldMap(doc), [doc]);
  const activeEq = useMemo(() => new Set(Object.values(sim?.assign ?? {}).flatMap((a) => (a.crews ? a.equipment : []))), [sim?.assign]);

  const snapPoint = useCallback(
    (p) => {
      const g = ed.snapGrid ? ed.gridSize : 0;
      const x = g ? snapGrid(p.x, g) : p.x;
      const z = g ? snapGrid(p.z, g) : p.z;
      return [x, p.y, z];
    },
    [ed.snapGrid, ed.gridSize],
  );

  const placeAt = useCallback(
    (point, keep = false) => {
      const type = ed.placeType;
      if (!type) return;
      let [x, y, z] = snapPoint(point);
      if (ed.snapObject) {
        const tmp = { id: '__new', type, params: sanitizeParams(type, defaultParams(type)), t: { p: [x, y, z], ry: 0 } };
        const s = snapToObjects(doc, tmp, { p: [x, y, z], ry: 0 }, Math.max(0.8, ed.gridSize * 1.2), worlds);
        x = s.x;
        z = s.z;
      }
      const parentId = ed.selection.length === 1 && getType(doc.nodes[ed.selection[0]]?.type)?.container ? ed.selection[0] : null;
      const id = addNode(type, { world: { p: [x, y, z], ry: 0 }, parentId });
      if (id) {
        select(id);
        if (!keep) setTool('select', { placeType: null }); // giữ Shift để đặt liên tiếp
      }
    },
    [ed.placeType, ed.snapObject, ed.gridSize, ed.selection, snapPoint, doc, worlds],
  );

  // ---- bút địa hình ----
  const paint = useCallback(
    (point) => {
      const s = stroke.current;
      if (!s) return;
      const dirty = applyBrush(s.terrain, { x: point.x, z: point.z, radius: ed.brush.radius, strength: ed.brush.strength * (ed.brush.mode === 'flatten' || ed.brush.mode === 'smooth' ? 0.5 : 0.35), mode: ed.brush.mode, target: s.target });
      refreshChunks(s.terrain, dirty);
    },
    [ed.brush],
  );
  const endStroke = useCallback(() => {
    const s = stroke.current;
    if (!s) return;
    stroke.current = null;
    const label = { raise: 'Đắp đất', lower: 'Đào đất', flatten: 'San phẳng', smooth: 'Làm mịn địa hình' }[ed.brush.mode];
    setTerrainHeights(s.terrain.heights, label);
  }, [ed.brush.mode]);
  useEffect(() => {
    window.addEventListener('pointerup', endStroke);
    return () => window.removeEventListener('pointerup', endStroke);
  }, [endStroke]);

  const terrainHandlers = {
    onPointerMove: (e) => {
      if (ed.tool === 'place') setGhost(snapPoint(e.point));
      if (ed.tool === 'terrain') {
        setBrushPos([e.point.x, e.point.y, e.point.z]);
        if (stroke.current) paint(e.point);
      }
    },
    onPointerDown: (e) => {
      if (ed.tool !== 'terrain' || e.button !== 0 || ed.mode !== 'edit') return;
      e.stopPropagation();
      const t = doc.site.terrain;
      stroke.current = { terrain: { ...t, heights: t.heights.slice() }, target: sample(t, e.point.x, e.point.z) };
      paint(e.point);
    },
    onPointerLeave: () => setBrushPos(null),
    onClick: (e) => {
      if (Date.now() < gizmoClock.until) return;
      if (ed.tool === 'place') return placeAt(e.point, e.shiftKey);
      if (ed.tool === 'select' && !e.shiftKey) select(null);
    },
  };

  const ctx = {
    doc,
    sim,
    worlds,
    children,
    activeEq,
    assign: sim?.assign,
    selection: ed.selection,
    tool: ed.mode === 'edit' ? ed.tool : 'select',
    mode: ed.mode,
    gizmo: ed.gizmo,
    layers: ed.layers,
    cut: ed.cut,
    showGhost: true,
    shadows: q.shadows,
    snapGrid: ed.snapGrid,
    gridSize: ed.gridSize,
    snapObject: ed.snapObject,
    snapGround: ed.snapGround,
    placeAt,
    hover: (p) => setGhost(snapPoint(p)),
  };

  useEffect(() => {
    if (ed.tool !== 'place') setGhost(null);
    if (ed.tool !== 'terrain') setBrushPos(null);
  }, [ed.tool]);
  useEffect(() => {
    if (ed.focusAt) focusSelection();
  }, [ed.focusAt]);

  const size = Math.max(doc.site.width, doc.site.depth);
  return (
    <>
      <Environment night={ed.night} quality={ed.quality} size={size} />
      <CameraRig site={doc.site} />
      <TerrainView terrain={doc.site.terrain} handlers={terrainHandlers} shadows={q.shadows} grid={ed.grid} gridSize={ed.gridSize} />
      <Boundary site={doc.site} />
      {(children.__root ?? []).map((id) => (
        <NodeView key={id} id={id} ctx={ctx} />
      ))}
      {ed.mode === 'edit' && <Gizmo ctx={{ ...ctx, tool: ed.tool }} />}
      {ed.tool === 'place' && ed.mode === 'edit' && <PlaceGhost type={ed.placeType} pos={ghost} />}
      {ed.tool === 'terrain' && <BrushCursor pos={brushPos} radius={ed.brush.radius} />}
    </>
  );
}

export default function StudioScene() {
  const quality = useEditor((s) => s.quality);
  const q = QUALITY[quality];
  return (
    <Canvas
      key={quality}
      shadows={q.shadows}
      dpr={q.dpr}
      camera={{ position: [200, 150, 200], fov: 45, near: 0.3, far: 12000 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => Date.now() > gizmoClock.until && editor.get().tool === 'select' && select(null)}
    >
      <World />
    </Canvas>
  );
}

export { worldOf };
