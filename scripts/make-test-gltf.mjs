// Tạo ma-nơ-canh GLTF TỰ LÀM (CC0) để kiểm thử đường nạp model có animation — KHÔNG phải nhân vật thật.
// Chạy: node scripts/make-test-gltf.mjs → public/assets/characters/test-dummy.gltf
// Gồm node "Body" (material "Cloth"), node con "Head" (material "Skin") và 4 clip: Idle, Walk, Run, Interact.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'characters');
mkdirSync(out, { recursive: true });

// hộp đơn vị: 24 đỉnh, pháp tuyến, 36 chỉ số
function boxData() {
  const P = [];
  const N = [];
  const I = [];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  for (const [n, u, v] of faces) {
    const base = P.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      P.push(0.5 * (n[0] + a * u[0] + b * v[0]), 0.5 * (n[1] + a * u[1] + b * v[1]), 0.5 * (n[2] + a * u[2] + b * v[2]));
      N.push(...n);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { P: new Float32Array(P), N: new Float32Array(N), I: new Uint16Array(I) };
}

const box = boxData();
const chunks = [];
let offset = 0;
const views = [];
const accessors = [];
function addView(typed, target) {
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (buf.length % 4)) % 4;
  chunks.push(buf, Buffer.alloc(pad));
  views.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, ...(target ? { target } : {}) });
  offset += buf.length + pad;
  return views.length - 1;
}
function addAccessor(typed, type, count, extra = {}) {
  const view = addView(typed, extra.target);
  delete extra.target;
  accessors.push({ bufferView: view, componentType: typed instanceof Uint16Array ? 5123 : 5126, count, type, ...extra });
  return accessors.length - 1;
}
const pos = addAccessor(box.P, 'VEC3', 24, { target: 34962, min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] });
const nor = addAccessor(box.N, 'VEC3', 24, { target: 34962 });
const idx = addAccessor(box.I, 'SCALAR', 36, { target: 34963 });

// animation: thời gian & giá trị
const T = new Float32Array([0, 0.5, 1]);
const tAcc = addAccessor(T, 'SCALAR', 3, { min: [0], max: [1] });
const q = (ax, ang) => [ax[0] * Math.sin(ang / 2), ax[1] * Math.sin(ang / 2), ax[2] * Math.sin(ang / 2), Math.cos(ang / 2)];
const rotAcc = (ax, amp) => addAccessor(new Float32Array([...q(ax, -amp), ...q(ax, amp), ...q(ax, -amp)]), 'VEC4', 3);
const transAcc = (y) => addAccessor(new Float32Array([0, 0.9, 0, 0, 0.9 + y, 0, 0, 0.9, 0]), 'VEC3', 3);

const anims = [
  ['Idle', transAcc(0.01), rotAcc([0, 1, 0], 0.05)],
  ['Walk', transAcc(0.04), rotAcc([0, 0, 1], 0.08)],
  ['Run', transAcc(0.09), rotAcc([0, 0, 1], 0.16)],
  ['Interact', transAcc(0.0), rotAcc([1, 0, 0], 0.25)],
].map(([name, tr, rot]) => ({
  name,
  samplers: [
    { input: tAcc, output: tr, interpolation: 'LINEAR' },
    { input: tAcc, output: rot, interpolation: 'LINEAR' },
  ],
  channels: [
    { sampler: 0, target: { node: 0, path: 'translation' } },
    { sampler: 1, target: { node: 1, path: 'rotation' } },
  ],
}));

const bin = Buffer.concat(chunks);
const gltf = {
  asset: { version: '2.0', generator: 'Công trường ảo · make-test-gltf (CC0)', copyright: 'CC0 — tự tạo cho kiểm thử' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [
    { name: 'Body', mesh: 0, translation: [0, 0.9, 0], scale: [0.42, 1.2, 0.26], children: [1] },
    { name: 'Head', mesh: 1, translation: [0, 0.62, 0], scale: [0.5, 0.17, 0.85] },
  ],
  meshes: [
    { name: 'BodyMesh', primitives: [{ attributes: { POSITION: pos, NORMAL: nor }, indices: idx, material: 0 }] },
    { name: 'HeadMesh', primitives: [{ attributes: { POSITION: pos, NORMAL: nor }, indices: idx, material: 1 }] },
  ],
  materials: [
    { name: 'Cloth', pbrMetallicRoughness: { baseColorFactor: [0.18, 0.29, 0.45, 1], metallicFactor: 0, roughnessFactor: 0.85 } },
    { name: 'Skin', pbrMetallicRoughness: { baseColorFactor: [0.85, 0.65, 0.48, 1], metallicFactor: 0, roughnessFactor: 0.6 } },
  ],
  animations: anims,
  accessors,
  bufferViews: views,
  buffers: [{ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString('base64')}` }],
};
writeFileSync(join(out, 'test-dummy.gltf'), JSON.stringify(gltf));
writeFileSync(
  join(out, 'README.md'),
  `# Tài nguyên nhân vật\n\n- \`test-dummy.gltf\`: ma-nơ-canh **tự tạo** bằng \`scripts/make-test-gltf.mjs\`, giấy phép **CC0**. Chỉ dùng để kiểm thử đường nạp GLTF + AnimationMixer (bật bằng \`?dev=1\`). Không phải nhân vật thật.\n\nThêm model nhân vật thật (GLB có rig + animation): đặt file vào thư mục này, khai báo trong \`src/rpg/data/characterAssets.json\` (url, **license**, animations, skinMaterials, attach, capabilities). Chỉ dùng asset có giấy phép rõ ràng.\n`,
);
console.log(`✓ Đã tạo ${join(out, 'test-dummy.gltf')} (${bin.length} byte dữ liệu, ${anims.length} clip)`);
