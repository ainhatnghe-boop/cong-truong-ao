// Khối hình cơ bản phong cách low-poly có viền mực (outline) — dùng chung cho mọi đồ vật
import { Edges } from '@react-three/drei';
import { PAL } from './palette.js';

export function Box({ size = [1, 1, 1], position = [0, 0, 0], rotation, color = '#fff', line = PAL.ink, outline = true, shadow = true, ...rest }) {
  return (
    <mesh position={position} rotation={rotation} castShadow={shadow} receiveShadow {...rest}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0} flatShading />
      {outline && <Edges color={line} threshold={15} />}
    </mesh>
  );
}

export function Cyl({ r = 0.3, h = 1, position = [0, 0, 0], color = '#fff', seg = 10, line = PAL.ink, outline = true, ...rest }) {
  return (
    <mesh position={position} castShadow receiveShadow {...rest}>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial color={color} roughness={0.85} flatShading />
      {outline && <Edges color={line} threshold={25} />}
    </mesh>
  );
}
