// ============================================================
//  CharacterCameraController — orbit (giữ chuột trái kéo), zoom (cuộn) có GIỚI HẠN chống xuyên model,
//  chế độ xem: Toàn thân · Khuôn mặt · Chi tiết PPE, Reset; điều khiển bàn phím (← → ↑ ↓ xoay, + − zoom, 1/2/3 xem, R reset).
//  Chuyển chế độ xem bằng nội suy mượt; người chơi kéo chuột thì dừng nội suy.
// ============================================================
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export const VIEWS = {
  // target.y tính cho nhân vật cao 1,72 m (tự co giãn theo chiều cao), cộng thêm độ cao bệ đứng
  full: { label: 'Toàn thân', target: [0, 0.9, 0], dist: 4.3, polar: 1.47, min: 1.6 },
  face: { label: 'Khuôn mặt', target: [0, 1.6, 0], dist: 0.95, polar: 1.5, min: 0.55 },
  ppe: { label: 'Chi tiết PPE', target: [0, 1.3, 0], dist: 1.8, polar: 1.36, min: 0.75 },
};
export const ZOOM = { min: 0.55, max: 6 };

/** Trạng thái camera CHỈ ĐỌC cho kiểm thử */
export const camInfo = { dist: 0, azimuth: 0, view: 'full', minDistance: 0 };
if (typeof window !== 'undefined') window.__cc = () => ({ ...camInfo });

export default function CharacterCameraController({ view, resetAt, height = 1.72, base = 0.12, keyboard = true }) {
  const ref = useRef();
  const { camera } = useThree();
  const goal = useRef(null);
  const k = height / 1.72;

  const setGoal = (v, keepAzimuth = true) => {
    const c = ref.current;
    if (!c) return;
    const V = VIEWS[v];
    const az = keepAzimuth ? c.getAzimuthalAngle() : 0.35;
    const target = new THREE.Vector3(V.target[0], base + V.target[1] * k, V.target[2]);
    const pos = new THREE.Vector3().setFromSphericalCoords(V.dist, V.polar, az).add(target);
    goal.current = { target, pos };
    c.minDistance = V.min;
  };

  useEffect(() => setGoal(view), [view, k]);
  useEffect(() => {
    if (resetAt) setGoal('full', false);
  }, [resetAt]);

  // bàn phím
  useEffect(() => {
    if (!keyboard) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const c = ref.current;
      if (!c) return;
      const off = camera.position.clone().sub(c.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      if (e.key === 'ArrowLeft') sph.theta -= 0.15;
      else if (e.key === 'ArrowRight') sph.theta += 0.15;
      else if (e.key === 'ArrowUp') sph.phi = Math.max(0.5, sph.phi - 0.08);
      else if (e.key === 'ArrowDown') sph.phi = Math.min(1.62, sph.phi + 0.08);
      else if (e.key === '+' || e.key === '=') sph.radius = Math.max(c.minDistance, sph.radius * 0.88);
      else if (e.key === '-') sph.radius = Math.min(ZOOM.max, sph.radius * 1.12);
      else return;
      e.preventDefault();
      goal.current = null;
      camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(c.target));
      c.update();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [camera, keyboard]);

  useFrame((_, dt) => {
    const c = ref.current;
    if (!c) return;
    if (goal.current) {
      const a = 1 - Math.exp(-dt * 6);
      c.target.lerp(goal.current.target, a);
      camera.position.lerp(goal.current.pos, a);
      if (camera.position.distanceTo(goal.current.pos) < 0.01) goal.current = null;
      c.update();
    }
    camInfo.dist = camera.position.distanceTo(c.target);
    camInfo.azimuth = c.getAzimuthalAngle();
    camInfo.view = view;
    camInfo.minDistance = c.minDistance;
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={VIEWS.full.min}
      maxDistance={ZOOM.max}
      minPolarAngle={0.5}
      maxPolarAngle={1.62}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      onStart={() => (goal.current = null)}
    />
  );
}
