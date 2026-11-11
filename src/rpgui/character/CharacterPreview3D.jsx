// ============================================================
//  CharacterPreview3D — studio 3D điện ảnh cho màn hình tạo nhân vật.
//  Ánh sáng 3 điểm (Key/Fill/Rim) + môi trường PBR dựng tại chỗ (Lightformer, KHÔNG tải HDR từ mạng),
//  bóng tiếp xúc, tone mapping ACES, bệ tròn phát sáng nhẹ, bối cảnh công trường 3D có chiều sâu (sương mù).
//  Chất lượng Low/Medium/High: bóng, độ phân giải, môi trường, chi tiết bối cảnh.
// ============================================================
import { memo, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import AvatarRenderer from './AvatarRenderer.jsx';
import CharacterCameraController from './CharacterCameraController.jsx';
import { EquipmentModel } from '../../studio/EquipmentModels.jsx';
import { LIGHT_PRESETS, QUALITY } from './studioPresets.js';

export { LIGHT_PRESETS, QUALITY };

const primer = new THREE.MeshStandardMaterial({ color: '#8C4A33', roughness: 0.7, metalness: 0.3 });
const concrete = new THREE.MeshStandardMaterial({ color: '#9A958B', roughness: 0.95 });
const roofSheet = new THREE.MeshStandardMaterial({ color: '#7F95AB', roughness: 0.5, metalness: 0.55 });
const B = ({ s, p, m, r }) => (
  <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
    <boxGeometry args={s} />
  </mesh>
);

/** Bối cảnh công trường phía sau (không che nhân vật) */
const Backdrop = memo(function Backdrop({ level }) {
  const frameCols = useMemo(() => {
    const out = [];
    for (let i = 0; i < 5; i++) for (const z of [0, 7]) out.push([i * 6 - 12, z]);
    return out;
  }, []);
  return (
    <group position={[0, 0, -26]}>
      {/* kết cấu thép đang dựng */}
      <group position={[-8, 0, -4]}>
        {frameCols.map(([x, z]) => (
          <B key={`${x}${z}`} s={[0.4, 12, 0.4]} p={[x, 6, z]} m={primer} />
        ))}
        {[4, 8, 12].map((y) => (
          <group key={y}>
            <B s={[24.4, 0.45, 0.3]} p={[0, y, 0]} m={primer} />
            <B s={[24.4, 0.45, 0.3]} p={[0, y, 7]} m={primer} />
          </group>
        ))}
        <B s={[24.4, 0.25, 7]} p={[0, 4.1, 3.5]} m={concrete} />
      </group>
      {/* cẩu tháp */}
      <group position={[14, 0, -10]} scale={0.9}>
        <EquipmentModel node={{ type: 'eq.towerCrane', params: { height: 34, jib: 30 } }} spec={{ model: 'towerCrane' }} active />
      </group>
      {level >= 2 && (
        <>
          {/* nhà xưởng */}
          <group position={[-30, 0, -14]}>
            <B s={[22, 9, 16]} p={[0, 4.5, 0]} m={concrete} />
            <B s={[23, 0.4, 17]} p={[0, 9.3, 0]} m={roofSheet} />
          </group>
          {/* container & vật tư */}
          {[['#2563EB', 8, 8], ['#D93A2B', 14.5, 8], ['#E5A91A', 11, 8]].map(([c, x, z], i) => (
            <mesh key={i} position={[x, i === 2 ? 3.9 : 1.3, z]} castShadow receiveShadow>
              <boxGeometry args={[6, 2.6, 2.4]} />
              <meshStandardMaterial color={c} roughness={0.7} metalness={0.3} />
            </mesh>
          ))}
        </>
      )}
      {level >= 3 && (
        <group position={[-14, 0, 9]} rotation-y={0.6}>
          <EquipmentModel node={{ type: 'eq.excavator', params: {} }} spec={{ model: 'excavator' }} active />
        </group>
      )}
    </group>
  );
});

function Studio({ preset, quality }) {
  const L = LIGHT_PRESETS[preset] ?? LIGHT_PRESETS.industrial;
  const Q = QUALITY[quality] ?? QUALITY.medium;
  return (
    <>
      <color attach="background" args={[L.bg]} />
      <fog attach="fog" args={[L.fog, 14, 70]} />
      <hemisphereLight args={L.hemi} />
      {/* Key */}
      <directionalLight position={[3.5, 5, 4]} color={L.key[0]} intensity={L.key[1]} castShadow={Q.shadows} shadow-mapSize={[Q.shadowMap ?? 512, Q.shadowMap ?? 512]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-1} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      {/* Fill */}
      <directionalLight position={[-4, 2.5, 2]} color={L.fill[0]} intensity={L.fill[1]} />
      {/* Rim */}
      <directionalLight position={[-1.5, 3.5, -4]} color={L.rim[0]} intensity={L.rim[1]} />
      {Q.env && (
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={1.6} position={[0, 5, -6]} scale={[10, 5, 1]} color="#FFFFFF" />
          <Lightformer intensity={0.8} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color={L.fill[0]} />
          <Lightformer intensity={0.6} position={[6, 2, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color={L.rim[0]} />
        </Environment>
      )}
      {/* mặt đất + bệ tròn */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color={L.ground} roughness={1} />
      </mesh>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow={false}>
        <cylinderGeometry args={[0.95, 1.02, 0.12, 64]} />
        <meshStandardMaterial color="#1B2A3C" roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.121, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.86, 0.9, 72]} />
        <meshBasicMaterial color="#FFBF36" transparent opacity={0.75} />
      </mesh>
      {Q.shadows ? <ContactShadows position={[0, 0.125, 0]} opacity={0.55} scale={2.4} blur={2.4} far={2.2} resolution={quality === 'high' ? 512 : 256} /> : (
        <mesh position={[0, 0.123, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.38, 32]} />
          <meshBasicMaterial color="#000" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      )}
      <Backdrop level={Q.backdrop} />
    </>
  );
}

export default function CharacterPreview3D({ character, equipped, anim, view, resetAt, rendererId, onStatus, preset = 'industrial', quality = 'medium', keyboard = true }) {
  const Q = QUALITY[quality] ?? QUALITY.medium;
  const stateRef = useMemo(() => ({ current: { anim, speed: anim === 'run' ? 5 : anim === 'walk' ? 2.2 : 0 } }), [anim]);
  return (
    <Canvas key={quality} shadows={Q.shadows} dpr={Q.dpr} camera={{ position: [1.45, 1.45, 4.05], fov: 32, near: 0.05, far: 300 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <Studio preset={preset} quality={quality} />
      <group position={[0, 0.12, 0]}>
        <AvatarRenderer character={character} equipped={equipped} stateRef={stateRef} rendererId={rendererId} onStatus={onStatus} shadow={Q.shadows} />
      </group>
      <CharacterCameraController view={view} resetAt={resetAt} height={character.appearance.height} keyboard={keyboard} />
    </Canvas>
  );
}
