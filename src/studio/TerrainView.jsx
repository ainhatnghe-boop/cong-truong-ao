// ============================================================
//  Hiển thị địa hình theo CHUNK. Mỗi chunk là 1 mesh; khi vẽ bút địa hình chỉ cập nhật
//  thuộc tính đỉnh của các chunk bị ảnh hưởng (không dựng lại toàn bộ).
// ============================================================
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { chunkCount, chunkGeometry } from '../engine/TerrainEngine.js';

/** Registry mesh theo chunk để cập nhật tại chỗ khi vẽ */
export const chunkMeshes = new Map();

function buildGeometry(t, ci, cj) {
  const g = chunkGeometry(t, ci, cj);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(g.colors, 3));
  geo.setIndex(g.indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Cập nhật tại chỗ các chunk bẩn theo lưới cao độ đang vẽ */
export function refreshChunks(t, dirty) {
  for (const key of dirty) {
    const mesh = chunkMeshes.get(key);
    if (!mesh) continue;
    const [ci, cj] = key.split(',').map(Number);
    const g = chunkGeometry(t, ci, cj);
    mesh.geometry.attributes.position.array.set(g.positions);
    mesh.geometry.attributes.color.array.set(g.colors);
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.attributes.color.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingSphere();
  }
}

/** Lưới vẽ TRÊN bề mặt địa hình (shader) → bám mọi cao độ, kể cả đồi núi. Đường đậm mỗi 10 ô. */
export const gridUniforms = { uGrid: { value: 1 }, uGridOn: { value: 1 } };
const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
terrainMat.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, gridUniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
varying vec3 vGridPos;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
vGridPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vGridPos;
uniform float uGrid;
uniform float uGridOn;`)
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (uGridOn > 0.5) {
        vec2 c = vGridPos.xz / uGrid;
        vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
        float minor = 1.0 - min(min(g.x, g.y), 1.0);
        vec2 c10 = c / 10.0;
        vec2 g10 = abs(fract(c10 - 0.5) - 0.5) / fwidth(c10);
        float major = 1.0 - min(min(g10.x, g10.y), 1.0);
        float fade = clamp(1.0 - fwidth(c.x) * 1.5, 0.0, 1.0); // ô quá nhỏ trên màn hình → mờ đi
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.24, 0.42), minor * 0.28 * fade);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.37, 1.0), major * 0.55);
      }`,
    );
};

function Chunk({ t, ci, cj, handlers, shadows }) {
  const ref = useRef();
  const geo = useMemo(() => buildGeometry(t, ci, cj), [t, ci, cj]);
  useEffect(() => {
    const key = `${ci},${cj}`;
    chunkMeshes.set(key, ref.current);
    return () => {
      if (chunkMeshes.get(key) === ref.current) chunkMeshes.delete(key);
      geo.dispose();
    };
  }, [ci, cj, geo]);
  return <mesh ref={ref} geometry={geo} material={terrainMat} receiveShadow={shadows} {...handlers} />;
}

export default function TerrainView({ terrain, handlers, shadows, grid, gridSize }) {
  gridUniforms.uGrid.value = gridSize;
  gridUniforms.uGridOn.value = grid ? 1 : 0;
  const [cx, cz] = chunkCount(terrain);
  const keys = [];
  for (let j = 0; j < cz; j++) for (let i = 0; i < cx; i++) keys.push([i, j]);
  return (
    <group>
      {keys.map(([i, j]) => (
        <Chunk key={`${i},${j}`} t={terrain} ci={i} cj={j} handlers={handlers} shadows={shadows} />
      ))}
      {terrain.water != null && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, terrain.water, 0]}>
          <planeGeometry args={[terrain.nx * terrain.cell * 1.6, terrain.nz * terrain.cell * 1.6]} />
          <meshStandardMaterial color="#3D86A8" transparent opacity={0.78} roughness={0.12} metalness={0.25} />
        </mesh>
      )}
    </group>
  );
}
