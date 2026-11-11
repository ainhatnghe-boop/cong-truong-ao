// ============================================================
//  GltfAvatar — nạp model GLB/GLTF có rig từ CharacterAssetRegistry.
//  - Clone theo SkeletonUtils (nhiều nhân vật dùng chung 1 asset đã cache)
//  - AnimationMixer: map trạng thái (idle/walk/run/interact) → tên clip trong asset; chuyển bằng crossFade 0,25 s
//    Clip thiếu → dùng idle, không có idle → đứng yên (không lỗi)
//  - Màu da áp vào material có tên trong asset.skinMaterials
//  - PPE của asset có `ppeNodes` (mũ/áo phản quang/giày tạc sẵn, tách node riêng trong GLB):
//    mũ & áo phản quang BẬT/TẮT theo spec.parts (lộ ra lớp bên dưới đã có sẵn, không để lộ lỗ hổng mesh);
//    giày LUÔN hiện (mesh chân bên dưới không đủ để lộ ra an toàn khi tắt) — chỉ đổi màu theo spec.bootsColor.
//    Cả 3 đổi màu bằng cách nhân màu lên texture bảng màu đã nướng sẵn (giống cách đổi màu da).
//  - PPE KHÔNG tạc sẵn trong GLB (kính, mặt nạ, chống ồn, găng, dây đai): gắn procedural vào bone qua asset.attach
//    (dùng lại hình học của ProceduralAvatar — HeadGear cho nhóm đầu/mặt, hình đơn giản cho găng/dây đai).
//  Chỉ dùng asset có giấy phép rõ ràng (khai báo trong data/characterAssets.json).
// ============================================================
import { useEffect, useMemo, useRef } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mat, HeadGear } from './ProceduralAvatar.jsx';

/** Bật/tắt + nhuộm màu một node PPE đã tạc sẵn trong GLB (mũ/áo/giày). visible=null = không đổi hiện/ẩn (luôn hiện). */
function usePpeNode(scene, nodeName, { visible = null, color = null } = {}) {
  useEffect(() => {
    const node = nodeName ? scene.getObjectByName(nodeName) : null;
    if (!node) return undefined;
    if (visible !== null) node.visible = visible;
    if (color && node.visible !== false) {
      node.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.userData.__ppeClonedMat) {
          o.material = o.material.clone();
          o.userData.__ppeClonedMat = true;
        }
        o.material.color.set(color);
      });
    }
    return undefined;
  }, [scene, nodeName, visible, color]);
}

export default function GltfAvatar({ asset, spec, stateRef, anim = 'idle', onStatus }) {
  const gltf = useGLTF(asset.url);
  const scene = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const current = useRef(null);
  const name = useRef(null);
  // tự "đặt chân xuống đất": rig có thể gốc ở hông (chân âm) hay ở chân (gốc 0) tuỳ cách dựng — đo bbox thật thay vì giả định
  const footOffset = useMemo(() => -new THREE.Box3().setFromObject(scene).min.y, [scene]);

  // màu da (chỉ khi asset khai báo material da)
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (asset.skinMaterials?.includes(o.material?.name)) {
          o.material = o.material.clone();
          o.material.color.set(spec.skin);
        }
      }
    });
  }, [scene, spec.skin, asset.skinMaterials]);

  const P = spec.parts;
  const nodes = asset.ppeNodes ?? {};
  usePpeNode(scene, nodes.helmet, { visible: !!P.helmet, color: spec.helmetColor });
  usePpeNode(scene, nodes.vest, { visible: !!P.vest, color: spec.vestColor });
  usePpeNode(scene, nodes.boots, { visible: null, color: P.rubberBoots ? '#2E4A2E' : spec.bootsColor });

  // mũ bảo hộ procedural (chỉ asset KHÔNG có mũ tạc sẵn, ví dụ ma-nơ-canh kiểm thử)
  useEffect(() => {
    if (nodes.helmet) return undefined; // asset đã có mũ tạc sẵn ở trên, khỏi chồng mũ giả
    const headName = asset.attach?.head;
    const head = headName ? scene.getObjectByName(headName) : null;
    if (!head || !P.helmet) return undefined;
    const g = new THREE.Group();
    const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(spec.helmetColor, 0.32, 0.05));
    shellMesh.position.y = 0.06;
    shellMesh.castShadow = true;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.008, 28), mat(spec.helmetColor, 0.32, 0.05));
    brim.position.y = 0.06;
    g.add(shellMesh, brim);
    g.name = 'ppe-helmet';
    head.add(g);
    return () => {
      head.remove(g);
      shellMesh.geometry.dispose();
      brim.geometry.dispose();
    };
  }, [scene, nodes.helmet, P.helmet, spec.helmetColor, asset.attach]);

  // PPE chưa tạc sẵn trong GLB: gắn procedural vào bone qua asset.attach (chỉ asset có khai báo attach)
  const headBone = useMemo(() => (asset.attach?.head ? scene.getObjectByName(asset.attach.head) : null), [scene, asset.attach?.head]);
  const handLBone = useMemo(() => (asset.attach?.handL ? scene.getObjectByName(asset.attach.handL) : null), [scene, asset.attach?.handL]);
  const handRBone = useMemo(() => (asset.attach?.handR ? scene.getObjectByName(asset.attach.handR) : null), [scene, asset.attach?.handR]);
  const hipsBone = useMemo(() => (asset.attach?.hips ? scene.getObjectByName(asset.attach.hips) : null), [scene, asset.attach?.hips]);
  const gloveColor = P.gloves ? (P.gloves.style === 'insulated' ? '#E4572E' : P.gloves.style === 'cut' ? '#8C9AA8' : '#E9C46A') : null;

  useEffect(() => {
    onStatus?.({ state: 'loaded', clips: gltf.animations.map((a) => a.name) });
    return () => mixer.stopAllAction();
  }, [gltf, mixer, onStatus]);

  useFrame((_, dt) => {
    const st = stateRef?.current?.anim ?? anim;
    const clipName = asset.animations?.[st] ?? asset.animations?.idle;
    if (clipName !== name.current) {
      const clip = gltf.animations.find((a) => a.name === clipName) ?? gltf.animations.find((a) => a.name === asset.animations?.idle);
      const next = clip ? mixer.clipAction(clip) : null;
      if (next && next !== current.current) {
        next.reset().fadeIn(0.25).play();
        current.current?.fadeOut(0.25);
        current.current = next;
      }
      name.current = clipName;
    }
    mixer.update(Math.min(dt, 0.1));
  });

  const s = (spec.height / 1.75) * (asset.scale ?? 1);
  // PPE chưa tạc sẵn gắn bằng createPortal vào bone có sẵn trong bộ xương — KHÔNG dùng <primitive object={bone}>
  // lồng JSX con, vì R3F sẽ coi bone đó là con của node cha trong cây React và GẮN LẠI nó vào đúng chỗ đó,
  // phá vỡ quan hệ cha/con thật trong bộ xương (xương "bay" ra khỏi hệ phân cấp, làm lệch toàn bộ dáng khi skin).
  return (
    <>
      <primitive object={scene} scale={[s, s, s]} position={[0, footOffset * s, 0]} />
      {headBone &&
        createPortal(
          <group position={[0, 0.11, 0]}>
            <HeadGear s={spec} />
          </group>,
          headBone,
        )}
      {P.harness &&
        hipsBone &&
        createPortal(
          <group position={[0, 0.12, 0]}>
            {[-1, 1].map((x) => (
              <mesh key={x} position={[x * 0.09, 0, 0]}>
                <boxGeometry args={[0.05, 0.42, 0.32]} />
                <meshStandardMaterial color="#1F2937" roughness={0.7} />
              </mesh>
            ))}
          </group>,
          hipsBone,
        )}
      {gloveColor &&
        handLBone &&
        createPortal(
          <mesh>
            <cylinderGeometry args={[0.052, 0.046, 0.07, 12]} />
            <meshStandardMaterial color={gloveColor} roughness={0.85} />
          </mesh>,
          handLBone,
        )}
      {gloveColor &&
        handRBone &&
        createPortal(
          <mesh>
            <cylinderGeometry args={[0.052, 0.046, 0.07, 12]} />
            <meshStandardMaterial color={gloveColor} roughness={0.85} />
          </mesh>,
          handRBone,
        )}
    </>
  );
}
