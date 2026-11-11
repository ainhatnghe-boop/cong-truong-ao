// Kiểm thử game nhập vai (Node, không trình duyệt): npm run test:rpg
// Gồm kiểm thử đơn vị + BOT tự chơi chuỗi "Ngày đầu tiên" bằng chính CharacterController & NavigationSystem.
import { GameSession } from '../src/rpg/GameSession.js';
import { memoryStorage } from '../src/rpg/SaveSystem.js';
import { DATA } from '../src/rpg/data.js';
import { listSites, buildWorld, siteSummary } from '../src/rpg/ProjectSelectionSystem.js';
import { CollisionWorld, createCharacter, stepCharacter, RADIUS } from '../src/rpg/CharacterController.js';
import { buildZones, signedDistance, zoneAccess } from '../src/rpg/SafetyZoneSystem.js';
import { NavGrid } from '../src/rpg/NavigationSystem.js';
import { migrateProfile, DEFAULT_SETTINGS } from '../src/rpg/schema.js';
import { validate } from '../src/engine/schema.js';
import { insidePolygon } from '../src/engine/PlacementSystem.js';
import { randomAppearance } from '../src/rpg/AvatarCustomizationSystem.js';
import * as WF from '../src/rpg/DynamicWorkflowEngine.js';

let pass = 0;
let fail = 0;
const ok = (c, m) => (c ? pass++ : (fail++, console.error('  ✗', m)));
const section = (t) => console.log(t);

// ---------- 1. Nhân vật & lưu ----------
section('1. Tạo nhân vật, đổi trang phục, lưu & tải');
let store = memoryStorage();
let S = new GameSession({ storage: store });
ok(S.createCharacter('', {}).error, 'không cho tạo nhân vật thiếu tên');
S.createCharacter('Minh Anh', { hair: 'bun', helmet: 'blue', skin: 'khong-hop-le' });
ok(S.profile.character.appearance.skin === DATA.appearance.defaults.male.skin, 'giá trị ngoại hình sai được chuẩn hoá');
S.updateCharacter({ ...S.profile.character, outfit: { id: 'coverall' }, ppeStyle: { ...S.profile.character.ppeStyle, vestColor: 'lime', helmetColor: 'red' }, accessories: ['radio', 'khong-co'] });
let S2 = new GameSession({ storage: store });
S2.load();
ok(S2.profile.character.name === 'Minh Anh' && S2.profile.character.outfit.id === 'coverall' && S2.profile.character.ppeStyle.helmetColor === 'red', 'tải lại giữ tên, trang phục, màu mũ mới');
ok(JSON.stringify(S2.profile.character.accessories) === '["radio"]', 'phụ kiện không tồn tại bị loại');
ok(/^NV-/.test(S2.profile.character.code) && S2.profile.character.code === S.profile.character.code, `mã nhân vật tự sinh & ổn định (${S2.profile.character.code})`);
ok(S2.profile.ppe.equipped.includes('helmet') && S2.profile.ppe.equipped.includes('vest'), 'PPE cơ bản được cấp khi tạo nhân vật');

section('2. Đổi nghề không mất nhân vật & XP');
S.chooseRole('field-engineer');
const xp0 = S.profile.career.xp;
S.profile.career.roleXp['field-engineer'] = 40;
S.chooseRole('qs');
ok(S.profile.character.name === 'Minh Anh' && S.profile.career.xp === xp0 && S.profile.career.roleXp['field-engineer'] === 40 && S.profile.career.roleId === 'qs', 'đổi nghề giữ tên, XP tổng, XP nghề cũ');

section('3. Danh sách công trường, giới hạn số vị trí, năng lực');
const sites = listSites();
ok(sites.length === DATA.sites.length, `${sites.length} công trường cấu hình`);
const cats = new Set(sites.map((s) => s.site.category));
ok(['civil', 'industrial', 'infrastructure', 'transport', 'energy', 'oilgas', 'underground', 'mixed'].every((c) => cats.has(c)), 'đủ 8 nhóm dự án');
const sum = siteSummary('cfg:S-CIVIL-01', null);
ok(sum.staffTotal > 0 && sum.openSlots > 0 && sum.items.length > 0 && sum.progress > 0 && sum.progress < 1, `thẻ dự án có nhân sự (${sum.staffOccupied}/${sum.staffTotal}), hạng mục, tiến độ ${(sum.progress * 100).toFixed(0)}%`);
S.profile.career.xp = 2000; // đủ cấp cho mọi nghề để thử riêng giới hạn số chỗ
let r = S.joinSite('cfg:S-CIVIL-01', 'pm');
ok(r.error && r.canIntern && r.suggestions.length > 0, `vị trí đã đủ người bị từ chối + gợi ý (${r.error})`);
S.profile.career.xp = 0;
r = S.joinSite('cfg:S-MIX-01', 'construction-manager');
ok(r.ok, 'tham gia được khi còn chỗ');
r = S.joinSite('cfg:S-IND-01', 'site-manager');
ok(r.error?.includes('Cần cấp'), 'chưa đủ năng lực → báo lỗi, đề xuất thực tập');
r = S.joinSite('cfg:S-IND-01', 'site-manager', 'intern');
ok(r.ok && S.profile.sites['cfg:S-IND-01'].joined.mode === 'intern', 'tham gia chế độ thực tập');

section('4. Dựng thế giới cho mọi công trường (engine Studio, mặt bằng riêng, công trình phụ trợ tự đặt)');
for (const { key, site } of sites) {
  const w = buildWorld(key, {});
  const errs = validate(w.doc, w.sim);
  ok(!errs.length, `${site.id}: dữ liệu hợp lệ (${errs[0] ?? ''})`);
  const cw = new CollisionWorld(w);
  const zones = buildZones(w);
  ok(!cw.blockedAt(w.spawn.x, w.spawn.z) && !insidePolygon(w.boundary, w.spawn.x, w.spawn.z), `${site.id}: điểm xuất hiện ở cổng, ngoài hàng rào, không vướng`);
  for (const f of w.facilities.filter((f) => f.kind !== 'gate')) {
    const bad = zones.filter((z) => z.kind !== 'general' && z.level !== 'safe' && signedDistance(z.shape, f.x, f.z) < 0);
    ok(!bad.length, `${site.id}: ${f.label} nằm ngoài vùng rủi ro`);
  }
  // từ cổng tới văn phòng có đường đi (sau khi đủ điều kiện vào công trường)
  const nav = new NavGrid(cw, []);
  const off = w.facilities.find((f) => f.kind === 'office');
  ok(!!nav.path(w.spawn.x, w.spawn.z, off.x + Math.sin(off.ry) * 4.5, off.z + Math.cos(off.ry) * 4.5), `${site.id}: có tuyến từ cổng tới văn phòng`);
}

section('5. Va chạm: không xuyên công trình, không ra khỏi bản đồ, không xuống nước');
{
  const w = buildWorld('cfg:S-MIX-01', {});
  const cw = new CollisionWorld(w);
  const tower = cw.obstacles.find((o) => o.node?.type === 'asm.building');
  const c = createCharacter({ x: tower.cx, z: tower.cz + tower.hz + 6, yaw: 0 }, 0);
  let inside = false;
  for (let i = 0; i < 600; i++) {
    stepCharacter(c, { f: 1, r: 0.15, run: true }, 0, cw, []);
    const [lx, lz] = [c.x - tower.cx, c.z - tower.cz];
    if (Math.abs(lx) < tower.hx - 0.05 && Math.abs(lz) < tower.hz - 0.05) inside = true;
  }
  ok(!inside, 'chạy thẳng vào toà nhà 10 giây không xuyên vào trong');
  const c2 = createCharacter({ x: 0, z: 0, yaw: 0 }, 0);
  for (let i = 0; i < 6000; i++) stepCharacter(c2, { f: 0, r: 1, run: true }, 0, cw, []);
  ok(Math.abs(c2.x) <= w.doc.site.width / 2, `chạy mãi về một phía vẫn ở trong bản đồ (x=${c2.x.toFixed(1)})`);
  const c3 = createCharacter({ x: w.spawn.x, z: w.spawn.z, yaw: 0 }, 0);
  for (let i = 0; i < 900; i++) stepCharacter(c3, { f: 1, r: 0, run: true }, 0, cw, []);
  ok(!insidePolygon(w.boundary, c3.x, c3.z) || Math.abs(c3.x - w.gate.x) < 6, 'hàng rào chỉ cho đi qua ở lối cổng');
  const wc = buildWorld('cfg:S-OG-01', {});
  const cwc = new CollisionWorld(wc);
  const c4 = createCharacter({ x: 0, z: 0, yaw: 0 }, 0);
  for (let i = 0; i < 5000; i++) stepCharacter(c4, { f: 1, r: 0, run: true }, 0, cwc, []);
  ok(!cwc.isWater(c4.x, c4.z), 'địa hình ven biển: không đi xuống nước');

  // nhảy: chỉ bật khi đang đứng trên bề mặt hợp lệ, không dùng để xuyên tường/vượt vùng an toàn
  const groundY0 = cw.groundAt(w.spawn.x, w.spawn.z);
  const cj = createCharacter({ x: w.spawn.x, z: w.spawn.z, yaw: 0 }, groundY0);
  ok(cj.grounded, 'nhân vật mới tạo đứng trên mặt đất');
  let maxY = cj.y;
  let wentAirborne = false;
  for (let i = 0; i < 90; i++) {
    stepCharacter(cj, { f: 0, r: 0, run: false, jump: i === 0 }, 0, cw, []);
    maxY = Math.max(maxY, cj.y);
    if (!cj.grounded) wentAirborne = true;
  }
  ok(wentAirborne && maxY > groundY0 + 0.2, `nhấn nhảy thật sự bay lên khỏi mặt đất (đỉnh +${(maxY - groundY0).toFixed(2)} m)`);
  ok(Math.abs(cj.y - cw.groundAt(cj.x, cj.z)) < 0.01 && cj.grounded, 'rơi xuống và đứng yên lại trên mặt đất (không lơ lửng)');

  // giữ Space liên tục không nhảy chồng nhảy (double jump) khi đang bay
  const cj2 = createCharacter({ x: w.spawn.x, z: w.spawn.z, yaw: 0 }, groundY0);
  let maxY2 = cj2.y;
  for (let i = 0; i < 90; i++) {
    stepCharacter(cj2, { f: 0, r: 0, run: false, jump: true }, 0, cw, []); // jump=true suốt, không chỉ 1 lần
    maxY2 = Math.max(maxY2, cj2.y);
  }
  ok(maxY2 < groundY0 + 0.6, `giữ phím nhảy liên tục không bật cao hơn 1 lần nhảy bình thường (+${(maxY2 - groundY0).toFixed(2)} m)`);

  // nhảy liên tục khi lao vào toà nhà vẫn không xuyên/vượt qua được (bay vẫn bị chặn va chạm ngang)
  const cj3 = createCharacter({ x: tower.cx, z: tower.cz + tower.hz + 6, yaw: 0 }, cw.groundAt(tower.cx, tower.cz + tower.hz + 6));
  let insideJ = false;
  for (let i = 0; i < 600; i++) {
    stepCharacter(cj3, { f: 1, r: 0.15, run: true, jump: i % 20 === 0 }, 0, cw, []);
    const [lx, lz] = [cj3.x - tower.cx, cj3.z - tower.cz];
    if (Math.abs(lx) < tower.hx - 0.05 && Math.abs(lz) < tower.hz - 0.05) insideJ = true;
  }
  ok(!insideJ, 'vừa chạy vừa liên tục bấm nhảy lao vào toà nhà vẫn không xuyên vào trong');

  // nhảy liên tục đi về phía vùng cấm vẫn không lọt qua ranh giới
  const wZ = buildWorld('cfg:S-CIVIL-01', {});
  const cwZ = new CollisionWorld(wZ);
  const zonesJ = buildZones(wZ);
  const forbJ = zonesJ.find((z) => z.level === 'forbidden');
  if (forbJ) {
    const [fx, fz] = forbJ.shape.c;
    const cj4 = createCharacter({ x: fx, z: fz + forbJ.shape.r + 8, yaw: 0 }, cwZ.groundAt(fx, fz + forbJ.shape.r + 8));
    let minDJ = Infinity;
    for (let i = 0; i < 900; i++) {
      stepCharacter(cj4, { f: 1, r: 0, run: true, jump: i % 15 === 0 }, 0, cwZ, [forbJ]);
      minDJ = Math.min(minDJ, signedDistance(forbJ.shape, cj4.x, cj4.z));
    }
    ok(minDJ >= RADIUS - 0.05, `vừa chạy vừa nhảy liên tục về phía vùng cấm vẫn không lọt qua (khoảng cách nhỏ nhất ${minDJ.toFixed(2)} m)`);
  }
}

section('6. Vùng an toàn: chặn trước khi vào, chỉ mở khi đủ điều kiện, cấm tuyệt đối');
{
  const w = buildWorld('cfg:S-CIVIL-01', {});
  const cw = new CollisionWorld(w);
  const zones = buildZones(w);
  const forb = zones.find((z) => z.level === 'forbidden');
  const fall = zones.find((z) => z.kind === 'falling');
  const exc = zones.find((z) => z.kind === 'excavation');
  ok(forb && fall && exc, 'có vùng cấm, vùng hạn chế (vật rơi), vùng nguy hiểm (hố đào)');
  const sp = { trainings: ['induction'], permits: [] };
  const full = { roleId: 'hse', mode: 'member', equipped: ['helmet', 'boots', 'vest', 'glasses', 'earmuffs'], trainings: ['induction'], siteProgress: sp, playTime: 0 };
  ok(!zoneAccess(forb, full).allowed, 'vùng cấm: không ai vào được, kể cả HSE đủ PPE');
  ok(!zoneAccess(fall, { ...full, equipped: ['helmet', 'boots', 'vest'] }).allowed && zoneAccess(fall, full).allowed, 'vùng hạn chế: thiếu kính → chặn; đủ PPE → mở');
  ok(!zoneAccess(exc, { ...full, roleId: 'planner' }).allowed, 'vùng nguy hiểm: nghề không phù hợp bị chặn dù đủ PPE');
  ok(!zoneAccess(exc, full).allowed && zoneAccess(exc, { ...full, siteProgress: { ...sp, permits: [{ type: 'excavation', status: 'active', expiresAt: 999 }] } }).allowed, 'vùng nguy hiểm cần PTW: chưa có → chặn; có PTW mô phỏng → mở');
  // đi thẳng vào vùng cấm: không bao giờ vào trong
  const [fx, fz] = forb.shape.c;
  const c = createCharacter({ x: fx, z: fz + forb.shape.r + 8, yaw: 0 }, 0);
  let minD = Infinity;
  for (let i = 0; i < 900; i++) {
    stepCharacter(c, { f: 1, r: 0, run: true }, 0, cw, [forb]);
    minD = Math.min(minD, signedDistance(forb.shape, c.x, c.z));
  }
  ok(minD >= RADIUS - 0.05, `không bước vào vùng cấm (khoảng cách nhỏ nhất ${minD.toFixed(2)} m)`);
}

// ---------- 7. BOT chơi chuỗi nhập môn ----------
function makeBot(S) {
  const tick = (input) => S.update(1 / 30, input, 0, true);
  const answerDialog = () => {
    const d = S.dialog;
    if (!d) return;
    if (d.kind === 'text' || d.kind === 'hse') return S.ackDialog();
    if (d.kind === 'ppe') return S.submitDialog({});
    if (d.kind === 'training') return S.submitDialog(d.questions.map((q) => q.answer));
    if (d.kind === 'quiz' || d.kind === 'inspect') {
      for (let i = 0; i < (d.options ?? []).length; i++) if (S.submitDialog(i).ok) return;
      return;
    }
    const n = d.kind === 'permit' ? d.conditions.length : d.items.length;
    for (let mask = 0; mask < 1 << n; mask++) {
      const sel = [...Array(n).keys()].filter((i) => mask & (1 << i));
      if (S.submitDialog(sel).ok) return;
    }
  };
  const walkTo = (key) => {
    const route = S.routeTo(key, true);
    if (!route) return false;
    const pts = route.points.slice(1);
    for (let guard = 0; guard < 6000 && pts.length; guard++) {
      const [px, pz] = pts[0];
      const dx = px - S.char.x;
      const dz = pz - S.char.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.9) {
        pts.shift();
        continue;
      }
      tick({ f: -dz / d, r: dx / d, run: d > 4 });
    }
    for (let i = 0; i < 10; i++) tick({ f: 0, r: 0 });
    const t = S.targetPos(key);
    return Math.hypot(t.x - S.char.x, t.z - S.char.z) < 4;
  };
  const interactAt = (key) => {
    S.setHold(true);
    S.pressInteract();
    answerDialog();
    for (let i = 0; i < 260 && S.hold; i++) tick({ f: 0, r: 0 });
    S.setHold(false);
    tick({ f: 0, r: 0 });
  };
  return { tick, answerDialog, walkTo, interactAt };
}

function playOnboarding(siteKey, roleId) {
  const st = memoryStorage();
  const G = new GameSession({ storage: st });
  G.createCharacter(`Bot ${roleId}`, randomAppearance(0.3));
  G.chooseRole(roleId);
  const j = G.joinSite(siteKey, roleId);
  if (j.error) G.joinSite(siteKey, roleId, 'intern');
  G.enterSite(siteKey);
  const bot = makeBot(G);
  const log = [];
  let stuck = 0;
  let last = -1;
  for (let it = 0; it < 120 && !G.getHud().onboarding.done; it++) {
    const o = G.objective();
    const idx = G.sp.onboarding.index * 100 + Object.values(G.sp.task.current?.status ?? {}).filter((x) => x === 'done').length;
    stuck = idx === last ? stuck + 1 : 0;
    last = idx;
    if (stuck > 6) {
      log.push(`KẸT tại: ${o.title} (${o.target}) ${o.blockers?.join('; ') ?? ''}`);
      break;
    }
    if (o.kind === 'mission' && o.title.includes('bản đồ')) {
      G.openMap();
      G.closeMap();
      continue;
    }
    const key = o.target ?? 'office';
    if (o.blockers?.length) {
      // thiếu PTW → xin ở bảng HSE
      const permit = o.blockers.find((b) => b.includes('giấy phép'));
      if (permit) {
        bot.walkTo('hseBoard');
        const t = DATA.permitTypes.find((p) => permit.includes(p.label));
        G.openPermit(t.id);
        bot.answerDialog();
        continue;
      }
    }
    bot.walkTo(key);
    bot.interactAt(key);
  }
  return { G, log };
}

section('7. BOT chơi "NGÀY ĐẦU TIÊN TẠI CÔNG TRƯỜNG" theo nhiều nghề / công trường');
const plays = [
  ['cfg:S-CIVIL-01', 'field-engineer'],
  ['cfg:S-CIVIL-01', 'concrete-worker'],
  ['cfg:S-IND-01', 'welder'],
  ['cfg:S-ENERGY-01', 'electrician'],
  ['cfg:S-INFRA-01', 'hse'],
  ['cfg:S-MIX-01', 'qs'],
  ['cfg:S-OG-01', 'procurement'],
  ['cfg:S-UG-01', 'construction-manager'],
  ['cfg:S-TRANS-01', 'planner'],
  ['cfg:S-MIX-01', 'bim-engineer'],
];
for (const [key, role] of plays) {
  const t0 = Date.now();
  const { G, log } = playOnboarding(key, role);
  const done = G.getHud().onboarding.done;
  ok(done, `${role} @ ${key}: hoàn thành nhập môn ${done ? '' : `— ${log.join(' | ')} — bước ${G.sp.onboarding.index + 1}: ${G.objective()?.title}`}`);
  if (!done) continue;
  const xp = G.profile.career.xp;
  // phát lại các sự kiện → không nhận thưởng trùng
  G.mission({ type: 'interact', target: 'guide' });
  G.mission({ type: 'workflow-done' });
  G.flowFlag('character-created');
  ok(G.profile.career.xp === xp, `${role}: phát lại sự kiện không cộng XP lần 2`);
  ok(G.sp.task.done >= 1 && xp > 200, `${role}: hoàn thành ${G.sp.task.done} nhiệm vụ, ${xp} XP (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const tpl = Object.values(G.sp.delta).length;
  const eff = WF.template(WF.workflowFor(role, Object.values(G.world.doc.nodes)[0], 'concrete')).effect;
  if (DATA.roleById[role].workflow === 'work') ok(tpl >= 1, `${role}: công việc làm tăng tiến độ hạng mục thật (delta ${tpl})`);
  if (role === 'concrete-worker') {
    // lưu & tải giữa chừng: giữ vị trí, tiến độ, nhiệm vụ
    G.save();
    const pos = [G.char.x, G.char.z];
    const H = new GameSession({ storage: G.storage });
    H.load();
    H.enterSite(key);
    ok(Math.hypot(H.char.x - pos[0], H.char.z - pos[1]) < 0.5 && H.getHud().onboarding.done && Object.keys(H.sp.delta).length === tpl, 'lưu & tải lại: giữ vị trí, tiến trình nhập môn, tiến độ đóng góp');
    // không tháo được PPE bắt buộc khi ở công trường
    H.unequip('helmet');
    ok(H.profile.ppe.equipped.includes('helmet'), 'không tháo được mũ bảo hộ khi đang ở công trường');
    H.unequip('earmuffs');
    void eff;
  }
}

section('8. Trình tự nhiệm vụ & migration hồ sơ');
{
  const st = memoryStorage();
  const G = new GameSession({ storage: st });
  G.createCharacter('Thứ tự', {});
  G.chooseRole('field-engineer');
  G.joinSite('cfg:S-CIVIL-01', 'field-engineer');
  G.enterSite('cfg:S-CIVIL-01');
  const idx = G.sp.onboarding.index;
  G.mission({ type: 'reach', target: 'office' }); // bước sau (s09) khi đang ở s05
  ok(G.sp.onboarding.index === idx, 'sự kiện của bước sau không hoàn thành khi chưa tới lượt');
  const m = migrateProfile({ name: 'Cũ', look: { hair: 'long' }, role: 'qs', xp: 77 });
  ok(!m.errors.length && m.profile.character.name === 'Cũ' && m.profile.career.roleXp.qs === 77, 'migrate hồ sơ v0 → v1');
  ok(migrateProfile({ schema: 'ctao.rpg', version: 99 }).errors.length === 1, 'từ chối hồ sơ phiên bản mới hơn');
}

section('9. Hồ sơ v1 → v2 (v0.4): không mất nhân vật / nghề / XP / tiến trình');
{
  const v1 = {
    schema: 'ctao.rpg',
    version: 1,
    id: 'P-OLD',
    playTime: 321,
    character: { name: 'Người Cũ', appearance: { body: 'sturdy', height: 1.8, skin: '#C98E63', face: 'glasses', hair: 'bun', hairColor: '#3B2A20', outfit: 'polo', helmet: 'green', boots: 'rubber', vest: 'lime' } },
    ppe: { owned: ['helmet', 'boots', 'vest', 'glasses'], equipped: ['helmet', 'boots', 'vest', 'glasses'] },
    career: { roleId: 'hse', xp: 640, roleXp: { hse: 500, qs: 140 } },
    currentSite: 'cfg:S-INFRA-01',
    sites: { 'cfg:S-INFRA-01': { joined: { roleId: 'hse', mode: 'member' }, onboarding: { index: 9, done: { s01: true } }, trainings: ['induction'], permits: [], task: { current: null, seq: 2, done: 1 }, pos: { x: 1, z: 2, yaw: 0 }, delta: { 'OBJ-0001': [1, 2] }, ppeChecked: true } },
    trainings: ['lifting-awareness'],
    claimed: { 'M-ONBOARD:s01': true },
    tutorial: { seen: {}, controlsDone: true, history: [] },
    settings: { cameraSpeed: 1.4, mouseSensitivity: 0.8, beginner: false, explore: false },
  };
  const m = migrateProfile(v1);
  const p = m.profile;
  ok(!m.errors.length && m.fixes.includes('Nâng cấp hồ sơ v1 → v2'), `migrate v1 → v2 không lỗi (${m.errors[0] ?? ''})`);
  ok(p.character.name === 'Người Cũ' && p.career.roleId === 'hse' && p.career.xp === 640 && p.career.roleXp.qs === 140, 'giữ tên, nghề, XP tổng & XP từng nghề');
  ok(p.sites['cfg:S-INFRA-01'].onboarding.index === 9 && p.sites['cfg:S-INFRA-01'].task.done === 1 && p.sites['cfg:S-INFRA-01'].delta['OBJ-0001'][1] === 2 && p.playTime === 321, 'giữ tiến trình nhập môn, nhiệm vụ, đóng góp tiến độ, thời gian chơi');
  ok(p.settings.cameraSpeed === 1.4 && p.settings.characterRenderer === DEFAULT_SETTINGS.characterRenderer, 'giữ cài đặt cũ + thêm cài đặt mới');
  const c = p.character;
  ok(c.appearance.build === 'sturdy' && c.appearance.height === 1.8 && c.appearance.hair === 'bun' && c.appearance.skin === '#C98E63', 'quy đổi ngoại hình (vóc dáng, chiều cao, tóc, da)');
  ok(c.outfit.id === 'supervisor' && c.ppeStyle.helmetColor === 'green' && c.ppeStyle.vestColor === 'lime' && c.accessories.includes('eyeglasses'), 'quy đổi trang phục, màu mũ, áo phản quang, kính cận');
  ok(p.ppe.equipped.includes('rubber-boots') && !p.ppe.equipped.includes('boots') && p.ppe.equipped.includes('glasses'), 'ủng cao su v1 → món PPE "Ủng bảo hộ" đang mặc');
}

section('10. PPE: công nhận / xem thử / xung đột / thay thế tương đương');
{
  const { recognizedPPE, equip, unequip, issuePPE, missingPPE, conflictsWith } = await import('../src/rpg/PPEManagementSystem.js');
  const { newProfile } = await import('../src/rpg/schema.js');
  let p = newProfile({ name: 'PPE' });
  ok(equip(p, 'goggles').error?.includes('chưa được cấp'), 'món chưa được cấp không mặc được (chỉ xem thử)');
  ok(!recognizedPPE(p).includes('glasses'), 'chưa có kính → yêu cầu kính chưa đáp ứng');
  p = { ...p, character: { ...p.character, accessories: ['eyeglasses'], ppeStyle: { ...p.character.ppeStyle, helmetColor: 'red' } } };
  ok(!recognizedPPE(p).includes('glasses') && missingPPE(p, ['glasses']).length === 1, 'kính cận (phụ kiện) & màu mũ KHÔNG được tính là PPE');
  p = issuePPE(p, ['goggles', 'glasses', 'rubber-boots', 'earplugs', 'earmuffs', 'welding-mask', 'face-shield']);
  p = equip(p, 'goggles').profile;
  ok(recognizedPPE(p).includes('glasses'), 'kính chống bụi đáp ứng yêu cầu kính bảo hộ');
  const r1 = equip(p, 'glasses');
  ok(r1.removed?.includes('goggles') && !r1.profile.ppe.equipped.includes('goggles'), 'cùng vị trí mắt: đeo kính bảo hộ thì tự tháo kính chống bụi');
  const r2 = equip(p, 'rubber-boots', ['boots']);
  ok(!r2.error && r2.removed.includes('boots') && recognizedPPE(r2.profile).includes('boots'), 'thay giày bằng ủng khi đang ở công trường: hợp lệ vì ủng vẫn đáp ứng "giày bảo hộ"');
  ok(!!unequip(r2.profile, 'rubber-boots', ['boots']).error, 'không tháo được ủng khi đó là món duy nhất đáp ứng "giày bảo hộ"');
  p = equip(equip(p, 'earplugs').profile, 'earmuffs').profile;
  ok(!unequip(p, 'earmuffs', ['earmuffs']).error, 'tháo chụp tai được khi còn nút tai đáp ứng bảo vệ thính giác');
  p = equip(p, 'welding-mask').profile;
  ok(conflictsWith(p.ppe.equipped, 'face-shield').includes('welding-mask'), 'tấm che mặt xung đột mặt nạ hàn');
}

section('11. Quy định màu mũ cấu hình THEO DỰ ÁN (không gán cứng theo nghề)');
{
  const { helmetColorRule } = await import('../src/rpg/PPEManagementSystem.js');
  ok(helmetColorRule(DATA.siteById['S-OG-01'], 'hse') === 'green' && helmetColorRule(DATA.siteById['S-OG-01'], 'welder') === 'yellow', 'kho xăng dầu: HSE mũ xanh lá, thợ hàn mũ vàng (theo cấu hình dự án)');
  ok(helmetColorRule(DATA.siteById['S-CIVIL-01'], 'hse') === null, 'chung cư: không quy định màu mũ → tự do');
  const st = memoryStorage();
  const G = new GameSession({ storage: st });
  G.createCharacter({ name: 'Mũ', ppeStyle: { helmetColor: 'red' } });
  G.chooseRole('procurement');
  G.joinSite('cfg:S-OG-01', 'procurement');
  G.enterSite('cfg:S-OG-01');
  G.setSp({ ...G.sp, ppeChecked: true }, false);
  G.profile = { ...G.profile, ppe: { owned: ['helmet', 'boots', 'vest', 'glasses'], equipped: ['helmet', 'boots', 'vest', 'glasses'] } };
  ok(!G.ppeCompliant(), 'đủ PPE nhưng sai màu mũ theo quy định dự án → chưa đạt kiểm tra');
  G.openPPECheck();
  ok(G.dialog?.helmetWrong && G.dialog.helmetRule === 'Xanh dương', 'ki-ốt nêu rõ quy định màu mũ của dự án');
  G.submitDialog({});
  ok(G.ppeCompliant() && G.profile.character.ppeStyle.helmetColor === 'blue', 'xác nhận tại ki-ốt → đổi đúng màu mũ, đạt kiểm tra');
  const before = G.accessCtx().equipped.join();
  G.updateCharacter({ ...G.profile.character, ppeStyle: { ...G.profile.character.ppeStyle, helmetColor: 'orange' }, accessories: ['radio', 'lanyard'] });
  ok(G.accessCtx().equipped.join() === before, 'chỉ đổi hình ảnh (màu mũ, phụ kiện) không thay đổi PPE được công nhận');
}

section('12. Click-to-move: nhân vật TỰ ĐI theo tuyến, WASD giành lại quyền điều khiển ngay');
{
  const st = memoryStorage();
  const G = new GameSession({ storage: st });
  G.createCharacter('Bot đi bộ', randomAppearance(0.4));
  G.chooseRole('field-engineer');
  const j = G.joinSite('cfg:S-CIVIL-01', 'field-engineer');
  if (j.error) G.joinSite('cfg:S-CIVIL-01', 'field-engineer', 'intern');
  G.enterSite('cfg:S-CIVIL-01');
  ok(
    ['guide', 'engineer', 'storekeeper', 'hse', 'foreman', 'qaqc'].every((k) => G.npcs.some((n) => n.kind === k)),
    'đủ NPC để gặp & trao đổi: AI hướng dẫn, kỹ sư, thủ kho, HSE, tổ trưởng, QA/QC',
  );
  // Dùng đúng mục tiêu hiện tại (luôn trong tầm với ngay từ đầu — khu vực xa hơn còn bị khoá tới khi qua cổng/PPE,
  // đúng theo quy tắc "vùng chưa đủ điều kiện là ranh giới cứng", tuyến điều hướng sẽ KHÔNG đi xuyên qua được).
  const key1 = G.objective().target;
  const target = G.targetPos(key1);
  const r = G.walkTo(target.x, target.z);
  ok(r && r.key === null && G.autoWalk === true, 'walkTo() (click mặt đất) tạo tuyến không tên & bật tự đi');
  const start = { x: G.char.x, z: G.char.z };
  let reached = false;
  for (let i = 0; i < 1200 && !reached; i++) {
    G.update(1 / 30, { f: 0, r: 0, run: false }, 0, true); // KHÔNG có input người chơi — chỉ autoWalk
    if (!G.route && Math.hypot(target.x - G.char.x, target.z - G.char.z) < 2) reached = true;
  }
  ok(reached, `tự đi tới đích chỉ bằng autoWalk, không cần WASD (còn cách ${Math.hypot(target.x - G.char.x, target.z - G.char.z).toFixed(2)} m)`);
  ok(Math.hypot(G.char.x - start.x, G.char.z - start.z) > 1, 'nhân vật thực sự di chuyển (không đứng yên)');
  ok(G.autoWalk === false && !G.route, 'tới nơi: tự xoá tuyến & tắt tự đi');

  // Dẫn tôi đến nơi làm việc (nút HUD) cũng tự đi — lùi nhân vật lại điểm xuất phát rồi thử lại cùng mục tiêu
  G.char.x = start.x;
  G.char.z = start.z;
  const dBefore = Math.hypot(target.x - G.char.x, target.z - G.char.z);
  G.routeTo(key1, false, true);
  ok(G.autoWalk === true && G.route?.key === key1, 'routeTo(key, false, true) (nút "Dẫn tôi đến nơi làm việc") cũng bật tự đi');
  for (let i = 0; i < 10; i++) G.update(1 / 30, { f: 0, r: 0, run: false }, 0, true);
  ok(G.autoWalk === true && Math.hypot(target.x - G.char.x, target.z - G.char.z) < dBefore, 'đang tự đi tới mục tiêu sau khi bấm nút dẫn đường');

  // người chơi tự bấm W → giành lại quyền điều khiển ngay, không bị tuyến ép hướng
  G.update(1 / 30, { f: 1, r: 0, run: false }, 0, true);
  ok(G.autoWalk === false, 'bấm WASD khi đang tự đi → huỷ tự đi ngay lập tức, trả quyền cho người chơi');
  ok(!!G.route, 'tuyến vẫn còn hiển thị (đường dẫn tham khảo), chỉ tắt tự động đi theo');
}

console.log(`\n${fail ? '✗' : '✓'} ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
