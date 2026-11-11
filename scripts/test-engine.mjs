// Kiểm thử engine (không cần trình duyệt): npm run test:engine
// Chạy qua các luồng chính của Vertical Slice và kiểm tra tính nhất quán sau mỗi bước.
import { project, createProject, addNode, updateNode, deleteNodes, duplicateNodes, groupNodes, ungroup, reparent, setWorld, setTerrainHeights } from '../src/engine/ProjectManager.js';
import { validate, serialize, deserialize } from '../src/engine/schema.js';
import { build } from '../src/engine/ParametricGeometryEngine.js';
import { tick, startNodes, autoHire, progressOf } from '../src/engine/ConstructionSimulationEngine.js';
import { hireCrew } from '../src/engine/ResourceManager.js';
import { worldOf } from '../src/engine/PlacementSystem.js';
import { applyBrush, earthwork } from '../src/engine/TerrainEngine.js';

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.error('  ✗', msg);
  }
};
const consistent = (msg) => {
  const e = validate(project.doc(), project.sim());
  ok(!e.length, `${msg} → nhất quán (${e[0] ?? ''})`);
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

console.log('1. Tạo dự án trống, bản đồ tuỳ chỉnh 600 × 400 m, đồi núi, ranh giới chữ L');
const { doc, sim } = createProject({ name: 'Kiểm thử', company: 'Demo', category: 'Dự án hỗn hợp', width: 600, depth: 400, shape: 'L', terrain: 'hills', budget: 200000, targetDays: 720, mode: 'advanced', seed: 3 });
project.load(doc, sim);
ok(Object.keys(project.doc().nodes).length === 0, 'dự án trống không có đối tượng');
ok(project.doc().site.terrain.heights.length === (project.doc().site.terrain.nx + 1) * (project.doc().site.terrain.nz + 1), 'lưới cao độ đúng kích thước');
consistent('tạo dự án');

console.log('2. Toà nhà nhiều tầng & nhà thép nhiều nhịp trên cùng công trường');
const B = addNode('asm.building', { world: { p: [-60, undefined, 0], ry: 0 }, params: { floors: 25, floorHeight: 3.6, lengthX: 30, widthZ: 25 } });
const S = addNode('asm.steelShed', { world: { p: [80, undefined, 20], ry: Math.PI / 2 }, params: { length: 100, width: 40, eaveHeight: 15, bay: 10 } });
ok(B && S, 'thêm được 2 công trình');
const gB = build(project.doc().nodes[B]);
const gS = build(project.doc().nodes[S]);
ok(gB.parts.filter((p) => p.a === 1 && p.g === 'b').length > 25 * 25, 'toà 25 tầng sinh đủ cột/dầm/sàn');
const frames = (gS.parts.filter((p) => p.a === 1).length) / 4;
ok(frames === 11, `nhà thép dài 100 m, bước 10 m → 11 khung (có ${frames})`);
consistent('thêm công trình');

console.log('3. Sửa tham số → hình học tái tạo theo quy tắc');
updateNode(S, { params: { length: 150 } });
const frames2 = build(project.doc().nodes[S]).parts.filter((p) => p.a === 1).length / 4;
ok(frames2 === 16, `dài 150 m → 16 khung (có ${frames2})`);
updateNode(B, { params: { floors: 999 } });
ok(project.doc().nodes[B].params.floors === 80, 'tham số vượt giới hạn bị ép về max (80)');
updateNode(B, { params: { floors: 25 } }, { coalesce: 'x' });
consistent('sửa tham số');

console.log('4. Di chuyển, xoay, nhân bản, xoá, Undo/Redo');
const before = JSON.stringify(project.doc().nodes[B].t);
setWorld(B, { p: [-50, 2, 10], ry: 0.5 });
ok(near(project.doc().nodes[B].t.ry, 0.5), 'xoay được');
const [D] = duplicateNodes([B]);
ok(D && project.doc().nodes[D].type === 'asm.building', 'nhân bản được');
deleteNodes([D]);
ok(!project.doc().nodes[D], 'xoá được');
project.undo();
ok(!!project.doc().nodes[D], 'undo khôi phục đối tượng đã xoá');
project.redo();
ok(!project.doc().nodes[D], 'redo xoá lại');
project.undo();
project.undo();
project.undo();
ok(JSON.stringify(project.doc().nodes[B].t) === before, 'undo đưa transform về như cũ');
project.redo();
consistent('undo/redo');

console.log('5. Nhóm / bỏ nhóm giữ nguyên toạ độ thế giới; chặn vòng lặp phân cấp');
const wB = worldOf(project.doc(), B);
const wS = worldOf(project.doc(), S);
const Gp = groupNodes([B, S], 'area', 'Khu A');
ok(Gp && project.doc().nodes[B].parentId === Gp, 'nhóm được');
setWorld(Gp, { p: [10, 0, 10], ry: 0.3 });
const G2 = groupNodes([Gp], 'area', 'Khu lớn');
ok(!reparent(G2, Gp), 'chặn đưa nút cha vào trong con của nó');
ungroup(G2);
project.undo();
project.undo();
project.undo();
const wB2 = worldOf(project.doc(), B);
ok(near(wB2.p[0], wB.p[0]) && near(wB2.p[2], wB.p[2]), 'undo nhóm trả về đúng vị trí');
groupNodes([B, S], 'area', 'Khu A');
const gid = project.doc().nodes[B].parentId;
ungroup(gid);
const wB3 = worldOf(project.doc(), B);
const wS3 = worldOf(project.doc(), S);
ok(near(wB3.p[0], wB.p[0], 1e-6) && near(wS3.p[2], wS.p[2], 1e-6), 'bỏ nhóm giữ nguyên toạ độ thế giới');
consistent('nhóm');

console.log('6. Từ chối thay đổi làm hỏng dữ liệu');
const bad = { ...project.doc(), nodes: { ...project.doc().nodes, [B]: { ...project.doc().nodes[B], parentId: 'GRP-9999' } } };
const histLen = project.get().past.length;
ok(project.apply('lỗi cố ý', bad) === false, 'apply bị từ chối khi nút cha không tồn tại');
ok(project.get().past.length === histLen, 'lệnh bị từ chối không vào lịch sử');
consistent('sau từ chối');

console.log('7. Địa hình: bút nâng/hạ, khối lượng đào đắp');
const t = project.doc().site.terrain;
const h = t.heights.slice();
const work = { ...t, heights: h };
applyBrush(work, { x: 0, z: 0, radius: 20, strength: 3, mode: 'lower' });
setTerrainHeights(h);
const ew = earthwork(project.doc().site.terrain);
ok(ew.cut > 100, `đào đất tạo khối lượng đào (${Math.round(ew.cut)} m³)`);
consistent('địa hình');

console.log('8. Mô phỏng thi công tới khi bàn giao');
let s = project.sim();
s = hireCrew(s, 'concrete', 4).sim;
s = hireCrew(s, 'steel', 4).sim;
s = hireCrew(s, 'envelope', 3).sim;
s = hireCrew(s, 'mep', 2).sim;
s = hireCrew(s, 'civil', 2).sim;
addNode('eq.towerCrane', { world: { p: [-40, undefined, 0], ry: 0 } });
addNode('eq.crawlerCrane', { world: { p: [80, undefined, 0], ry: 0 } });
s = startNodes(project.doc(), s, [B, S]);
s = autoHire(project.doc(), s);
let days = 0;
const money0 = s.money;
while (days < 3000 && !(s.nodes[B]?.complete && s.nodes[S]?.complete)) {
  s = tick(project.doc(), s);
  days++;
  if (days === 30) ok(progressOf(project.doc().nodes[S], s.nodes[S]).overall > 0, 'tiến độ tăng sau 30 ngày');
}
ok(s.nodes[B].complete && s.nodes[S].complete, `cả 2 công trình bàn giao sau ${days} ngày`);
ok(s.xp > 0 && s.missions.M04 && s.missions.M05 && s.missions.M06, 'nhận XP & hoàn thành nhiệm vụ M04/M05/M06');
ok(s.money !== money0, 'tiền thay đổi theo chi phí/thanh toán');
project.setSim(s);
consistent('mô phỏng');

console.log('9. Lưu & mở lại (serialize → JSON → deserialize)');
const text = JSON.stringify(serialize(project.doc(), project.sim()));
const back = deserialize(JSON.parse(text));
ok(!back.errors.length, `mở lại không lỗi (${back.errors[0] ?? ''})`);
ok(Object.keys(back.doc.nodes).length === Object.keys(project.doc().nodes).length, 'đủ số đối tượng');
ok(back.sim.nodes[B].complete && back.sim.day === project.sim().day, 'giữ trạng thái thi công & ngày');
ok(Math.abs(back.doc.site.terrain.heights[1234] - project.doc().site.terrain.heights[1234]) < 0.01, 'giữ địa hình đã chỉnh');

console.log('10. Tệp hỏng được sửa / bị từ chối');
const broken = JSON.parse(text);
broken.project.nodes[B].params.floors = 'abc';
broken.project.nodes['OBJ-7777'] = { id: 'OBJ-7777', type: 'khong.ton.tai', t: { p: [0, 0, 0], ry: 0 } };
broken.sim.nodes['OBJ-8888'] = { started: true, done: [1] };
const fixed = deserialize(broken);
ok(!fixed.errors.length && fixed.fixes.length >= 3, `tự sửa ${fixed.fixes.length} lỗi`);
ok(deserialize({ schema: 'khac' }).errors.length === 1, 'từ chối tệp không đúng định dạng');
ok(deserialize({ ...JSON.parse(text), version: 99 }).errors.length === 1, 'từ chối tệp phiên bản mới hơn');

console.log(`\n${fail ? '✗' : '✓'} ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
