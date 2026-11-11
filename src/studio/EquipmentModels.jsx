// ============================================================
//  Mô hình máy móc thi công (procedural, có chuyển động) + tổ đội công nhân tại hiện trường.
//  active = máy đang được dùng cho ít nhất 1 hoạt động (theo sim.assign) → chuyển động.
//  Có thể thay từng model bằng GLB: giữ nguyên props { node, active } (xem docs/01 RULE AGENTS.md).
// ============================================================
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { materialFor } from './ObjectView.jsx';
import { SKILLS } from '../engine/materials.js';

const Y = materialFor('machine');
const K = materialFor('machineDark');
const GL = materialFor('glass');
const ST = materialFor('steel');

function B({ s, p = [0, 0, 0], r, m = Y }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Lattice({ len, w = 1.6, m = Y }) {
  // thân giàn: 4 thanh biên + thanh giằng (đủ gợi hình, ít đa giác)
  const n = Math.max(2, Math.floor(len / 3));
  return (
    <group>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([a, b]) => (
        <B key={`${a}${b}`} s={[0.14, len, 0.14]} p={[(a * w) / 2, len / 2, (b * w) / 2]} m={m} />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <B key={i} s={[w, 0.1, 0.1]} p={[0, (len / n) * (i + 0.5), (i % 2 ? 1 : -1) * (w / 2)]} r={[0, 0, i % 2 ? 0.6 : -0.6]} m={m} />
      ))}
    </group>
  );
}

function TowerCrane({ node, active }) {
  const { height = 45, jib = 50 } = node.params;
  const slew = useRef();
  const trolley = useRef();
  const cable = useRef();
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime * 0.2 + seed;
    slew.current.rotation.y = Math.sin(t) * 1.5;
    trolley.current.position.x = jib * (0.4 + 0.35 * Math.sin(t * 1.6));
    const L = height * (0.3 + 0.25 * (1 + Math.sin(t * 2.2)));
    cable.current.scale.y = L;
    cable.current.position.y = -L / 2;
  });
  return (
    <group>
      <B s={[6, 1.2, 6]} p={[0, 0.6, 0]} m={materialFor('concrete')} />
      <Lattice len={height} w={1.8} />
      <group ref={slew} position={[0, height, 0]}>
        <B s={[2.6, 2, 2.6]} p={[0, 1, 0]} />
        <B s={[1.6, 1.4, 1.8]} p={[0.8, 1.2, 1.8]} m={GL} />
        <B s={[jib, 1.2, 1.2]} p={[jib / 2, 2.6, 0]} />
        <B s={[jib * 0.3, 1.2, 1.2]} p={[-jib * 0.15, 2.6, 0]} />
        <B s={[3.2, 2.4, 2.4]} p={[-jib * 0.27, 1.6, 0]} m={materialFor('concrete')} />
        <B s={[0.8, 6, 0.8]} p={[0, 5, 0]} />
        <group ref={trolley} position={[jib * 0.6, 2, 0]}>
          <B s={[1.4, 0.5, 1.4]} m={K} />
          <mesh ref={cable}>
            <boxGeometry args={[0.06, 1, 0.06]} />
            <meshBasicMaterial color="#1F2430" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function CrawlerCrane({ node, active }) {
  const { boom = 40 } = node.params;
  const slew = useRef();
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (active) slew.current.rotation.y = Math.sin(clock.elapsedTime * 0.15 + seed) * 1.1;
  });
  return (
    <group>
      <B s={[8, 1.4, 1.6]} p={[0, 0.7, 2.2]} m={K} />
      <B s={[8, 1.4, 1.6]} p={[0, 0.7, -2.2]} m={K} />
      <group ref={slew} position={[0, 1.4, 0]}>
        <B s={[6, 2.6, 4]} p={[-1, 1.3, 0]} />
        <B s={[2, 1.8, 1.4]} p={[1.6, 1.6, 1.6]} m={GL} />
        <B s={[2.4, 2.4, 4]} p={[-4.4, 1.4, 0]} m={K} />
        <group position={[1.8, 2.2, 0]} rotation={[0, 0, -Math.PI / 2 + 1.1]}>
          <Lattice len={boom} w={1.2} />
        </group>
      </group>
    </group>
  );
}

function Excavator({ active }) {
  const cab = useRef();
  const arm = useRef();
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    cab.current.rotation.y = Math.sin(t * 0.5) * 0.9;
    arm.current.rotation.z = -0.3 + Math.sin(t * 1.3) * 0.35;
  });
  return (
    <group>
      <B s={[4.4, 0.9, 0.8]} p={[0, 0.45, 1.2]} m={K} />
      <B s={[4.4, 0.9, 0.8]} p={[0, 0.45, -1.2]} m={K} />
      <group ref={cab} position={[0, 0.9, 0]}>
        <B s={[3.2, 1.4, 2.6]} p={[-0.4, 0.7, 0]} />
        <B s={[1.2, 1.3, 1.1]} p={[0.6, 1.9, 0.7]} m={GL} />
        <group ref={arm} position={[1.2, 1.3, 0]}>
          <B s={[3.6, 0.5, 0.5]} p={[1.8, 0, 0]} />
          <B s={[0.45, 2.4, 0.45]} p={[3.6, -1.2, 0]} />
          <B s={[1.1, 0.8, 1.1]} p={[3.8, -2.4, 0]} m={K} />
        </group>
      </group>
    </group>
  );
}

function Dozer({ active }) {
  const blade = useRef();
  useFrame(({ clock }) => {
    if (active) blade.current.position.y = 0.7 + Math.abs(Math.sin(clock.elapsedTime * 1.5)) * 0.3;
  });
  return (
    <group>
      <B s={[4, 1, 1]} p={[0, 0.5, 1.2]} m={K} />
      <B s={[4, 1, 1]} p={[0, 0.5, -1.2]} m={K} />
      <B s={[3, 1.6, 2.4]} p={[-0.3, 1.6, 0]} />
      <B s={[1.4, 1.2, 1.6]} p={[-0.8, 3, 0]} m={GL} />
      <group ref={blade} position={[2.4, 0.7, 0]}>
        <B s={[0.3, 1.2, 3.6]} />
      </group>
    </group>
  );
}

function Truck({ node, active }) {
  const drum = useRef();
  const bed = useRef();
  const kind = node.type;
  useFrame((_, dt) => {
    if (!active) return;
    if (drum.current) drum.current.rotation.x += dt * 2;
    if (bed.current) bed.current.rotation.z = Math.abs(Math.sin(performance.now() / 2500)) * 0.5;
  });
  const len = kind === 'eq.pump' ? 10 : kind === 'eq.mixer' ? 8 : 7;
  return (
    <group>
      <B s={[2.2, 2, 2.5]} p={[len / 2 - 1.2, 1.6, 0]} m={materialFor('plaster')} />
      <B s={[0.1, 0.8, 2.2]} p={[len / 2 - 0.05, 2.1, 0]} m={GL} />
      <B s={[len, 0.5, 2.4]} p={[0, 0.8, 0]} m={K} />
      {[-len / 2 + 1, 0, len / 2 - 1.4].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={K}>
          <cylinderGeometry args={[0.5, 0.5, 2.6, 12]} />
        </mesh>
      ))}
      {kind === 'eq.mixer' && (
        <group position={[-1, 2.2, 0]} rotation={[0, 0, 0.25]}>
          <mesh ref={drum} rotation={[0, 0, Math.PI / 2]} material={Y} castShadow>
            <cylinderGeometry args={[0.8, 1.2, 4, 12]} />
          </mesh>
        </group>
      )}
      {kind === 'eq.dumpTruck' && (
        <group ref={bed} position={[len / 2 - 2.6, 1.1, 0]}>
          <B s={[4.6, 1.4, 2.4]} p={[-2.3, 0.7, 0]} />
        </group>
      )}
      {kind === 'eq.pump' && (
        <group position={[-1, 1.4, 0]}>
          <B s={[2, 1, 2]} p={[0, 0.5, 0]} />
          <group rotation={[0, 0, active ? 0.9 : 0.15]} position={[0, 1, 0]}>
            <B s={[14, 0.4, 0.4]} p={[7, 0, 0]} />
          </group>
        </group>
      )}
    </group>
  );
}

function Forklift({ active }) {
  const fork = useRef();
  useFrame(({ clock }) => {
    if (active) fork.current.position.y = 0.4 + Math.abs(Math.sin(clock.elapsedTime)) * 1.6;
  });
  return (
    <group>
      <B s={[2.4, 1.2, 1.4]} p={[0, 0.9, 0]} />
      <B s={[1, 1.2, 1.2]} p={[-0.4, 2, 0]} m={GL} />
      <B s={[0.15, 3, 1]} p={[1.3, 1.6, 0]} m={K} />
      <group ref={fork} position={[1.8, 0.4, 0]}>
        <B s={[1.2, 0.08, 0.9]} m={K} />
      </group>
    </group>
  );
}

function PileDriver({ active }) {
  const ram = useRef();
  useFrame(({ clock }) => {
    if (active) ram.current.position.y = 4 + Math.abs(Math.sin(clock.elapsedTime * 2.5)) * 8;
  });
  return (
    <group>
      <B s={[6, 1.2, 1.2]} p={[0, 0.6, 1.6]} m={K} />
      <B s={[6, 1.2, 1.2]} p={[0, 0.6, -1.6]} m={K} />
      <B s={[4, 2, 3]} p={[-0.8, 2, 0]} />
      <group position={[2.4, 1.2, 0]}>
        <Lattice len={22} w={0.9} />
        <group ref={ram} position={[0, 6, 0]}>
          <B s={[1.2, 2, 1.2]} p={[0.9, 0, 0]} m={K} />
        </group>
      </group>
    </group>
  );
}

const MODELS = { towerCrane: TowerCrane, crawlerCrane: CrawlerCrane, excavator: Excavator, dozer: Dozer, dumpTruck: Truck, mixer: Truck, pump: Truck, forklift: Forklift, pileDriver: PileDriver };

export function EquipmentModel({ node, spec, active }) {
  const M = MODELS[spec.model];
  return M ? <M node={node} active={active} /> : null;
}

/** Vòng tròn phạm vi tác động của máy (hiện khi chọn) */
export function RangeRing({ range }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
      <ringGeometry args={[range - 0.4, range, 96]} />
      <meshBasicMaterial color="#F5A524" transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

// ---------------- Tổ đội công nhân ----------------
const skin = new THREE.MeshStandardMaterial({ color: '#D9A57B', roughness: 0.8 });
const pants = new THREE.MeshStandardMaterial({ color: '#2C3445', roughness: 0.9 });
const vest = new THREE.MeshStandardMaterial({ color: '#FF7A1A', roughness: 0.7 });
const helmetMats = Object.fromEntries(Object.entries(SKILLS).map(([k, s]) => [k, new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.5 })]));

function Worker({ skill, phase }) {
  const arm = useRef();
  const body = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 5 + phase;
    arm.current.rotation.x = -1.4 + Math.abs(Math.sin(t)) * 1.2;
    body.current.rotation.x = Math.sin(t * 0.5) * 0.05;
  });
  return (
    <group ref={body}>
      <mesh position={[-0.12, 0.45, 0]} material={pants}>
        <boxGeometry args={[0.18, 0.9, 0.22]} />
      </mesh>
      <mesh position={[0.12, 0.45, 0]} material={pants}>
        <boxGeometry args={[0.18, 0.9, 0.22]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={vest} castShadow>
        <boxGeometry args={[0.5, 0.65, 0.3]} />
      </mesh>
      <group ref={arm} position={[0.32, 1.45, 0]}>
        <mesh position={[0, -0.28, 0]} material={vest}>
          <boxGeometry args={[0.13, 0.56, 0.14]} />
        </mesh>
      </group>
      <mesh position={[0, 1.72, 0]} material={skin}>
        <boxGeometry args={[0.32, 0.34, 0.32]} />
      </mesh>
      <mesh position={[0, 1.94, 0]} material={helmetMats[skill]}>
        <boxGeometry args={[0.38, 0.14, 0.4]} />
      </mesh>
    </group>
  );
}

/** Đặt công nhân quanh chân công trình đang thi công (số người theo số tổ được phân) */
export function CrewAtWork({ box, skill, crews }) {
  const spots = useMemo(() => {
    const n = Math.min(10, crews * 3);
    const [x0, , z0] = box.min;
    const [x1, , z1] = box.max;
    const per = 2 * (x1 - x0 + z1 - z0);
    return Array.from({ length: n }, (_, i) => {
      let d = ((i + 0.5) / n) * per;
      const w = x1 - x0;
      const h = z1 - z0;
      let p;
      if (d < w) p = [x0 + d, z1 + 1.2, Math.PI];
      else if ((d -= w) < h) p = [x1 + 1.2, z1 - d, -Math.PI / 2];
      else if ((d -= h) < w) p = [x1 - d, z0 - 1.2, 0];
      else p = [x0 - 1.2, z0 + (d - w), Math.PI / 2];
      return p;
    });
  }, [box, crews]);
  return spots.map(([x, z, r], i) => (
    <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
      <Worker skill={skill} phase={i * 1.7} />
    </group>
  ));
}
