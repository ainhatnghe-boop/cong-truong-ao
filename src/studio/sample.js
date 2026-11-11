// Dự án kiểm thử (Vertical Slice): toà nhà nhiều tầng + nhà xưởng thép nhiều nhịp trên CÙNG công trường.
// Dựng hoàn toàn bằng các lệnh công khai của ProjectManager — giống người chơi thao tác.
// Đây là dữ liệu kiểm thử, không phải giới hạn loại công trình.
import { project, createProject, addNode, updateNode } from '../engine/ProjectManager.js';
import { hireCrew } from '../engine/ResourceManager.js';
import { sample } from '../engine/TerrainEngine.js';

export function loadSampleProject() {
  const { doc, sim } = createProject({
    name: 'Khu phức hợp kiểm thử (demo)',
    company: 'Công ty Xây dựng Demo',
    category: 'Dự án hỗn hợp',
    width: 500,
    depth: 360,
    shape: 'rect',
    terrain: 'industrial',
    budget: 250000,
    targetDays: 720,
    mode: 'simple',
    seed: 11,
  });
  project.load(doc, sim);
  const A = addNode('container', { world: { p: [-80, 0, 0], ry: 0 }, params: { level: 'area' }, name: 'Khu A · Dân dụng' });
  const B = addNode('container', { world: { p: [90, 0, 0], ry: 0 }, params: { level: 'area' }, name: 'Khu B · Công nghiệp' });
  addNode('asm.building', { world: { p: [-80, undefined, -10], ry: 0 }, parentId: A, name: 'Tháp A1 (25 tầng)', params: { floors: 25, floorHeight: 3.6, lengthX: 30, widthZ: 25 } });
  addNode('civil.pad', { world: { p: [-80, undefined, 40], ry: 0 }, parentId: A, name: 'Bãi tập kết khu A', params: { length: 50, width: 24 } });
  addNode('eq.towerCrane', { world: { p: [-58, undefined, -24], ry: 0 }, parentId: A, name: 'Cẩu tháp TC-A1', params: { height: 100, jib: 50 } });
  addNode('eq.pump', { world: { p: [-104, undefined, 18], ry: 0 }, parentId: A, name: 'Xe bơm bê tông P-01' });
  addNode('asm.steelShed', { world: { p: [90, undefined, -10], ry: 0 }, parentId: B, name: 'Nhà xưởng B1 (100 × 40 m)', params: { length: 100, width: 40, eaveHeight: 15, bay: 10 } });
  addNode('process.tank', { world: { p: [170, undefined, -20], ry: 0 }, parentId: B, name: 'Bồn nước PCCC', params: { diameter: 14, height: 10 } });
  addNode('eq.crawlerCrane', { world: { p: [90, undefined, 26], ry: 0 }, parentId: B, name: 'Cẩu bánh xích CC-B1' });
  addNode('civil.road', { world: { p: [0, undefined, 60], ry: 0 }, name: 'Đường nội bộ D1', params: { length: 340, width: 8 } });
  addNode('civil.road', { world: { p: [0, undefined, -5], ry: Math.PI / 2 }, name: 'Đường nội bộ D2', params: { length: 120, width: 7 } });
  addNode('eq.mixer', { world: { p: [10, undefined, 52], ry: 0 }, name: 'Xe trộn MX-01' });
  addNode('eq.excavator', { world: { p: [30, undefined, 40], ry: 0.6 }, name: 'Máy xúc EX-01' });
  // một vài cấu kiện rời dựng tay để minh hoạ cách ghép từ cấu kiện cơ bản
  const y0 = sample(project.doc().site.terrain, 10, -60); // cao độ mặt đất tại vị trí nhà bảo vệ
  const g = addNode('container', { world: { p: [10, y0, -60], ry: 0 }, params: { level: 'structure' }, name: 'Nhà bảo vệ (ghép tay)' });
  for (const [x, z] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
    addNode('foundation.pad', { world: { p: [10 + x, y0, -60 + z], ry: 0 }, parentId: g, params: { length: 1.4, width: 1.4, height: 0.6 } });
    addNode('structure.columnConcrete', { world: { p: [10 + x, y0 + 0.6, -60 + z], ry: 0 }, parentId: g, params: { height: 3.4, width: 0.35, depth: 0.35 } });
  }
  const s = addNode('structure.slab', { world: { p: [10, y0 + 4.0, -60], ry: 0 }, parentId: g, params: { length: 9.4, width: 7.4, thickness: 0.18 } });
  updateNode(s, { name: 'Sàn mái nhà bảo vệ' });
  let st = project.sim();
  for (const k of ['concrete', 'steel', 'envelope', 'mep', 'civil']) st = hireCrew(st, k, 2).sim;
  // nạp lại để lịch sử Undo bắt đầu từ trạng thái mẫu
  project.load(project.doc(), { ...st, log: [{ day: 0, text: 'Đã tạo dự án kiểm thử: bấm ▶ Vận hành để bắt đầu thi công' }, ...st.log] });
}
