// ============================================================
//  Hiển thị đối tượng từ danh sách cấu kiện (ParametricGeometryEngine) bằng InstancedMesh:
//  mỗi nhóm (hình khối × vật liệu) = 1 draw call → toà nhà hàng nghìn cấu kiện vẫn nhẹ.
//  Cấu kiện ĐÃ THI CÔNG hiển thị vật liệu PBR; CHƯA THI CÔNG hiển thị dạng bóng mờ (ghost).
//  Điểm mở rộng: có thể thay hình học bằng model GLB theo loại (xem docs/01 RULE AGENTS.md).
// ============================================================
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { MATERIALS } from '../engine/materials.js';

export const GEOMS = {
  b: new THREE.BoxGeometry(1, 1, 1),
  c: new THREE.CylinderGeometry(0.5, 0.5, 1, 18),
  k: new THREE.ConeGeometry(0.5, 1, 18),
};

const matCache = {};
export function materialFor(key) {
  if (matCache[key]) return matCache[key];
  const m = MATERIALS[key] ?? MATERIALS.concrete;
  matCache[key] = new THREE.MeshStandardMaterial({
    color: m.color,
    roughness: m.roughness,
    metalness: m.metalness,
    transparent: m.opacity != null,
    opacity: m.opacity ?? 1,
    depthWrite: m.opacity == null,
    envMapIntensity: 0.8,
  });
  return matCache[key];
}
export const GHOST = new THREE.MeshStandardMaterial({ color: '#5B8CFF', transparent: true, opacity: 0.13, depthWrite: false, roughness: 1 });
export const GHOST_PLACE = new THREE.MeshStandardMaterial({ color: '#16A34A', transparent: true, opacity: 0.35, depthWrite: false, roughness: 1 });
export const ACTIVE = new THREE.MeshStandardMaterial({ color: '#F5A524', transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 });

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

function Instances({ geometry, material, parts, items, shadows }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const im = ref.current;
    items.forEach((i, j) => {
      const pt = parts[i];
      _e.set(pt.r?.[0] ?? 0, pt.r?.[1] ?? 0, pt.r?.[2] ?? 0);
      _q.setFromEuler(_e);
      _m.compose(_v.set(pt.p[0], pt.p[1], pt.p[2]), _q, _s.set(pt.s[0], pt.s[1], pt.s[2]));
      im.setMatrixAt(j, _m);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.computeBoundingBox?.();
  }, [parts, items]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={shadows} receiveShadow={shadows} />;
}

/**
 * geo: kết quả build(); frac[k]: tỷ lệ hoàn thành hoạt động k; status: planned|active|done
 * showGhost: hiện phần chưa thi công; cutY: ẩn cấu kiện có đáy cao hơn (toạ độ cục bộ) — null = không cắt
 */
export const PartsView = memo(function PartsView({ geo, frac, status, showGhost, cutY, shadows, ghostMaterial = GHOST }) {
  const groups = useMemo(() => {
    const built = {};
    const ghost = {};
    const working = {};
    geo.plan.forEach((act, k) => {
      const n = act.idx.length;
      const f = status === 'planned' ? 0 : status === 'done' ? 1 : (frac?.[k] ?? 0);
      const nb = f >= 1 ? n : Math.floor(n * f);
      act.idx.forEach((i, j) => {
        const pt = geo.parts[i];
        if (cutY != null && pt.p[1] - pt.s[1] / 2 > cutY) return;
        if (j < nb) (built[`${pt.g}|${pt.m}`] ??= []).push(i);
        else if (status === 'active' && j === nb && f > 0 && f < 1) (working[pt.g] ??= []).push(i);
        else if (showGhost) (ghost[pt.g] ??= []).push(i);
      });
    });
    return { built, ghost, working };
  }, [geo, frac, status, showGhost, cutY]);
  return (
    <group>
      {Object.entries(groups.built).map(([key, items]) => {
        const [g, m] = key.split('|');
        return <Instances key={`${key}:${items.length}`} geometry={GEOMS[g]} material={materialFor(m)} parts={geo.parts} items={items} shadows={shadows && MATERIALS[m]?.opacity == null} />;
      })}
      {Object.entries(groups.working).map(([g, items]) => (
        <Instances key={`w${g}:${items.length}:${items[0]}`} geometry={GEOMS[g]} material={ACTIVE} parts={geo.parts} items={items} shadows={false} />
      ))}
      {Object.entries(groups.ghost).map(([g, items]) => (
        <Instances key={`g${g}:${items.length}:${items[0]}`} geometry={GEOMS[g]} material={ghostMaterial} parts={geo.parts} items={items} shadows={false} />
      ))}
    </group>
  );
});

/** Khung chọn: cạnh hộp bao cục bộ */
export function SelectionBox({ box, color = '#F5A524' }) {
  const geom = useMemo(() => {
    const s = [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]].map((v) => Math.max(v, 0.2));
    return new THREE.EdgesGeometry(new THREE.BoxGeometry(s[0] + 0.4, s[1] + 0.4, s[2] + 0.4));
  }, [box]);
  return (
    <lineSegments geometry={geom} position={[(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2]} renderOrder={10}>
      <lineBasicMaterial color={color} depthTest={false} transparent />
    </lineSegments>
  );
}
