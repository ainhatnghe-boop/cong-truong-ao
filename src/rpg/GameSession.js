// ============================================================
//  GameSession — bộ điều phối game nhập vai (THUẦN JS, không React/three).
//  Nối: Save · Avatar · Role · Workforce · World · Collision/Character · SafetyZone · PPE · PTW ·
//       Navigation · Workflow · Mission · Tutorial · Interaction.
//  UI chỉ: gọi hành động (pressInteract, submitDialog, routeTo…) và đọc snapshot HUD (getHud)
//  + đọc trực tiếp vị trí nhân vật/NPC trong vòng render (không re-render React 60 lần/giây).
// ============================================================
import { DATA, ppeLabel } from './data.js';
import { newProfile, emptySiteProgress } from './schema.js';
import { sanitizeCharacter, npcCharacter, characterFromV1 } from './AvatarCustomizationSystem.js';
import { clearDraft } from './AvatarSaveAdapter.js';
import { saveProfile, loadProfile } from './SaveSystem.js';
import { chooseRole as chooseRoleFn, addXp, levelOf, getRole, canEditConstruction } from './RoleManagementSystem.js';
import { joinProject } from './ProjectWorkforceSystem.js';
import { buildWorld, getSite } from './ProjectSelectionSystem.js';
import { CollisionWorld, createCharacter, stepCharacter, FIXED_DT } from './CharacterController.js';
import { buildZones, evaluate, blockingZones, accessSignature, signedDistance, shapeCenter, zoneAccess } from './SafetyZoneSystem.js';
import { NavGrid } from './NavigationSystem.js';
import { requiredPPE, missingPPE, issueAndEquip, issuePPE, recognizedPPE, helmetColorRule, ppeDef, equip as equipFn, unequip as unequipFn } from './PPEManagementSystem.js';
import { gradePermit, issuePermit, activePermit, expirePermits } from './PTWSimulator.js';
import * as WF from './DynamicWorkflowEngine.js';
import { handleEvent, currentStep, onboardingDone, claimOnce, ONBOARD } from './MissionSystem.js';
import { guide, guideContext, recordGuide } from './TutorialSystem.js';
import { isComplete } from './WorldBuilder.js';
import { progressOf } from '../engine/ConstructionSimulationEngine.js';
import { build } from '../engine/ParametricGeometryEngine.js';
import { getType, isBuildable } from '../engine/ObjectRegistry.js';
import { insidePolygon, rotY, worldMap } from '../engine/PlacementSystem.js';
import { SKILLS, MATERIALS } from '../engine/materials.js';

const REACH = 3.5;
const INTERACT = 3.0;
const FACILITY_KEYS = ['office', 'drawing', 'warehouse', 'hseBoard'];

export class GameSession {
  constructor({ storage } = {}) {
    this.storage = storage;
    this.profile = null;
    this.siteKey = null;
    this.world = null;
    this.listeners = new Set();
    this.reset();
  }

  reset() {
    this.cw = null;
    this.zones = [];
    this.char = null;
    this.npcs = [];
    this.nav = null;
    this.navSig = null;
    this.navAll = null;
    this.acc = 0;
    this.dialog = null;
    this.guideBubble = null;
    this.notices = [];
    this.route = null;
    this.routeIdx = 1;
    this.autoWalk = false;
    this.hold = null;
    this.holdDown = false;
    this.inside = {};
    this.interactable = null;
    this.warnings = [];
    this.version = 0;
    this.lastHud = '';
    this.saveTimer = 0;
    this.workfront = null;
    this.checkpoint = null;
    this.mapOpen = false;
  }

  // ---------------- đăng ký & phát ----------------
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }
  notify(text, tone = 'info') {
    this.notices = [{ id: Date.now() + Math.random(), text, tone, at: Date.now() }, ...this.notices].slice(0, 4);
    this.emit();
  }

  // ---------------- lưu / mở ----------------
  load() {
    const r = loadProfile(this.storage);
    if (r.profile) this.profile = r.profile;
    return r;
  }
  save() {
    if (!this.profile) return { ok: false };
    if (this.char && this.sp) this.setSp({ ...this.sp, pos: { x: this.char.x, z: this.char.z, yaw: this.char.yaw } }, false);
    return saveProfile(this.profile, this.storage);
  }

  get sp() {
    return this.siteKey ? this.profile.sites[this.siteKey] : null;
  }
  setSp(sp, emit = true) {
    this.profile = { ...this.profile, sites: { ...this.profile.sites, [this.siteKey]: sp } };
    if (emit) this.emit();
  }
  setProfile(p) {
    this.profile = p;
    this.emit();
  }

  // ---------------- luồng màn hình ----------------
  /** createCharacter(character) — hoặc createCharacter(name, appearanceV1) (API cũ). Chỉ gọi khi CHƯA có hồ sơ hoặc người chơi xác nhận thay thế. */
  createCharacter(nameOrCharacter, appearanceV1) {
    const character = typeof nameOrCharacter === 'object' ? sanitizeCharacter(nameOrCharacter) : characterFromV1(String(nameOrCharacter ?? ''), appearanceV1 ?? {});
    if (!character.name) return { error: 'Hãy đặt tên nhân vật' };
    this.profile = newProfile(character);
    this.flowFlag('character-created');
    this.save();
    clearDraft(this.storage);
    this.emit();
    return { ok: true };
  }
  /** Cập nhật cấu hình nhân vật (ngoại hình, trang phục, kiểu PPE, phụ kiện) — tự lưu, giữ nguyên tên nếu thiếu */
  updateCharacter(character) {
    const c = sanitizeCharacter({ ...character, name: String(character?.name ?? '').trim() || this.profile.character.name, code: this.profile.character.code });
    this.profile = { ...this.profile, character: c };
    this.save();
    this.emit();
    return c;
  }
  /** API cũ (v0.3): ngoại hình v1 */
  setAppearance(appearanceV1) {
    return this.updateCharacter(characterFromV1(this.profile.character.name, appearanceV1));
  }
  rename(name) {
    if (!String(name).trim()) return;
    this.profile = { ...this.profile, character: { ...this.profile.character, name: String(name).trim().slice(0, 24) } };
    this.save();
    this.emit();
  }
  flowFlag(ev) {
    const f = new Set(this.profile.flow ?? []);
    f.add(ev);
    this.profile = { ...this.profile, flow: [...f] };
    // thưởng các bước nhập môn toàn cục (không trùng)
    const step = ONBOARD.steps.find((s) => s.complete.event === ev);
    if (step) {
      const c = claimOnce(this.profile.claimed, `${ONBOARD.id}:${step.id}`, step.xp);
      this.profile = addXp({ ...this.profile, claimed: c.claimed }, c.xp);
    }
  }
  /** Chọn / đổi nghề: giữ nhân vật & XP; cập nhật nhiệm vụ, quyền, hướng dẫn */
  chooseRole(roleId) {
    const r = chooseRoleFn(this.profile, roleId);
    if (r.error) return r;
    const changed = this.profile.career.roleId && this.profile.career.roleId !== roleId;
    this.profile = r.profile;
    this.flowFlag('role-chosen');
    if (changed && this.sp) {
      // đổi nghề trong công trường: huỷ nhiệm vụ đang làm (quy trình theo nghề cũ), giữ tiến độ dự án
      this.setSp({ ...this.sp, task: { ...this.sp.task, current: null } }, false);
    }
    this.save();
    this.emit();
    return { ok: true, changed };
  }
  joinSite(key, roleId, mode = 'member') {
    const site = getSite(key);
    if (!site) return { error: 'Không tìm thấy công trường' };
    const sp = this.profile.sites[key] ?? emptySiteProgress();
    const r = joinProject(this.profile, site, sp, roleId, mode);
    if (r.error) return r;
    if (this.profile.career.roleId !== roleId) this.chooseRole(roleId);
    this.profile = { ...this.profile, sites: { ...this.profile.sites, [key]: r.siteProgress }, currentSite: key };
    this.flowFlag('site-joined');
    this.save();
    this.emit();
    return { ok: true };
  }

  // ---------------- vào / rời công trường ----------------
  enterSite(key = this.profile.currentSite) {
    this.reset();
    this.siteKey = key;
    const sp = this.sp;
    if (!sp?.joined) throw new Error('Chưa đăng ký vị trí ở công trường này');
    this.world = buildWorld(key, sp.delta);
    this.cw = new CollisionWorld(this.world);
    this.zones = buildZones(this.world);
    const s = this.world.spawn;
    let start = s;
    if (sp.pos && !this.cw.blockedAt(sp.pos.x, sp.pos.z)) start = sp.pos;
    this.char = createCharacter(start, this.cw.groundAt(start.x, start.z));
    this.initNpcs();
    this.refreshNav(true);
    this.computeTaskTargets();
    this.mission({ type: 'spawned' }, true);
    this.showGuideForStep();
    this.emit();
  }
  /** Rời công trường. silent=true khi gọi từ cleanup của UI (không phát sự kiện cho component đang gỡ) */
  leaveSite({ silent = false } = {}) {
    if (!this.world) return;
    this.save();
    this.siteKey = null;
    this.world = null;
    this.reset();
    if (!silent) this.emit();
  }

  get roleId() {
    return this.sp?.joined?.roleId ?? this.profile?.career.roleId;
  }
  get mode() {
    return this.sp?.joined?.mode ?? 'member';
  }
  trainings() {
    return [...(this.sp?.trainings ?? []), ...(this.profile.trainings ?? [])];
  }
  accessCtx() {
    // chỉ PPE ĐÃ CẤP + ĐANG MẶC mới được công nhận (xem thử / màu mũ / phụ kiện không tính)
    return { roleId: this.roleId, mode: this.mode, equipped: recognizedPPE(this.profile), trainings: this.trainings(), siteProgress: this.sp, playTime: this.profile.playTime };
  }
  requiredPPE() {
    return requiredPPE(this.world?.site, this.roleId);
  }
  canEdit() {
    return canEditConstruction(this.roleId, this.mode);
  }

  /** Lưới dẫn đường theo quyền hiện tại (cache theo chữ ký quyền) */
  refreshNav(force = false) {
    const ctx = this.accessCtx();
    const sig = accessSignature(this.zones, ctx);
    if (!force && sig === this.navSig) return;
    this.navSig = sig;
    this.blocking = blockingZones(this.zones, ctx);
    this.nav = new NavGrid(this.cw, this.blocking);
    if (!this.navAll) this.navAll = new NavGrid(this.cw, []);
    if (this.route) this.routeTo(this.route.key, true);
  }

  // ---------------- NPC ----------------
  facility(kind) {
    return this.world.facilities.find((f) => f.kind === kind);
  }
  frontOf(f, dist = 1.4) {
    return { x: f.x + Math.sin(f.ry) * (f.size[1] / 2 + dist), z: f.z + Math.cos(f.ry) * (f.size[1] / 2 + dist) };
  }
  initNpcs() {
    const w = this.world;
    const g = this.facility('gate');
    const tx = -w.gate.nz;
    const tz = w.gate.nx;
    const mk = (id, kind, roleLabel, p) => ({ id, kind, roleLabel, name: kind === 'guide' ? DATA.dialogues.guideName : `${roleLabel} (NPC)`, x: p.x, z: p.z, yaw: 0, character: npcCharacter(kind, id.length * 7), path: null, npc: true });
    const office = this.frontOf(this.facility('office'), 2.6);
    const store = this.frontOf(this.facility('warehouse'), 2.6);
    const hse = this.frontOf(this.facility('hseBoard'), 2.2);
    const drawing = this.frontOf(this.facility('drawing'), 2.2);
    this.npcs = [
      mk('npc-guide', 'guide', 'AI hướng dẫn', { x: w.spawn.x + tx * 3, z: w.spawn.z + tz * 3 }),
      mk('npc-engineer', 'engineer', 'Kỹ sư hiện trường', { x: office.x + 2, z: office.z }),
      mk('npc-store', 'storekeeper', 'Thủ kho', { x: store.x + 2, z: store.z }),
      mk('npc-hse', 'hse', 'Cán bộ HSE', { x: hse.x - 1.5, z: hse.z }),
      mk('npc-foreman', 'foreman', 'Tổ trưởng', { x: g.x, z: g.z }),
      mk('npc-qaqc', 'qaqc', 'QA/QC', { x: drawing.x + 1.5, z: drawing.z }),
    ];
    for (const n of this.npcs) n.y = this.cw.groundAt(n.x, n.z);
    this.placeForeman();
  }
  placeForeman() {
    const f = this.npcs.find((n) => n.kind === 'foreman');
    if (!f) return;
    let node = this.taskNode();
    if (!node) node = Object.values(this.world.doc.nodes).find((n) => isBuildable(n.type) && !this.world.sim.nodes[n.id]?.complete);
    if (!node) return;
    const p = this.reachablePointNear(node);
    if (p) {
      f.x = p.x + 1.2;
      f.z = p.z + 1.2;
      [f.x, f.z] = this.cw.resolve(f.x, f.z, 0.4);
      f.y = this.cw.groundAt(f.x, f.z);
    }
  }
  /** Điểm đi tới được gần đối tượng nhất (theo quyền hiện tại) */
  reachablePointNear(node) {
    const o = this.cw.obstacles.find((x) => x.id === node.id) ?? this.cw.surfaces.find((x) => x.id === node.id);
    if (!o || !this.nav) return null;
    const c = this.nav.nearestFree(o.cx, o.cz, 120);
    if (!c) return null;
    const [x, z] = this.nav.center(c[0], c[1]);
    return { x, z };
  }

  // ---------------- mục tiêu & dẫn đường ----------------
  taskNode() {
    const t = this.sp?.task?.current;
    return t ? this.world.doc.nodes[t.objectId] : null;
  }
  computeTaskTargets() {
    const node = this.taskNode();
    this.workfront = node ? this.reachablePointNear(node) : null;
    // điểm tuần tra HSE: vùng rủi ro (không phải cổng/toàn công trường) gần văn phòng nhất
    const office = this.facility('office');
    const zs = this.zones.filter((z) => z.active && !['safe'].includes(z.level) && z.kind !== 'general' && z.level !== 'forbidden');
    zs.sort((a, b) => Math.hypot(...shapeCenter(a.shape).map((v, i) => v - [office.x, office.z][i])) - Math.hypot(...shapeCenter(b.shape).map((v, i) => v - [office.x, office.z][i])));
    const z = zs[0];
    if (z && this.nav) {
      const [cx, cz] = shapeCenter(z.shape);
      const c = this.nav.nearestFree(cx, cz, 120);
      this.checkpoint = c ? { x: this.nav.center(c[0], c[1])[0], z: this.nav.center(c[0], c[1])[1], zone: z } : null;
    }
    this.placeForeman();
  }
  targetPos(key) {
    if (!this.world) return null;
    if (FACILITY_KEYS.includes(key)) {
      const f = this.facility(key);
      return { ...this.frontOf(f), label: f.label };
    }
    if (key === 'gate') {
      const f = this.facility('gate');
      return { ...this.frontOf(f, 1.2), label: 'Ki-ốt kiểm tra PPE (cổng)' };
    }
    if (key === 'guide' || key === 'foreman') {
      const n = this.npcs.find((x) => x.kind === key);
      return n ? { x: n.x, z: n.z, label: n.name } : null;
    }
    if (key === 'workfront' || key === 'object') {
      const node = this.taskNode();
      return this.workfront ? { ...this.workfront, label: node?.name ?? 'Vị trí thi công' } : null;
    }
    if (key === 'checkpoint') return this.checkpoint ? { x: this.checkpoint.x, z: this.checkpoint.z, label: `Điểm tuần tra: ${this.checkpoint.zone.name}` } : null;
    if (key === 'workflow') {
      const s = this.currentWorkflowStep();
      return s ? this.targetPos(s.target) : this.targetPos('office');
    }
    return null;
  }
  /** Tính tuyến đường được phép (tránh vật cản & vùng chưa được phép). auto=true → nhân vật TỰ ĐI theo tuyến */
  routeTo(key, silent = false, auto = false) {
    const t = typeof key === 'string' ? this.targetPos(key) : key;
    if (!t || !this.char) return null;
    const p = this.nav.path(this.char.x, this.char.z, t.x, t.z);
    if (!p) {
      this.route = null;
      this.autoWalk = false;
      if (!silent) this.notify('Không có tuyến được phép tới đó (vùng chưa đủ điều kiện hoặc không tiếp cận được).', 'warn');
      return null;
    }
    this.route = { key: typeof key === 'string' ? key : null, target: t, points: p.points, length: p.length };
    this.routeAt = Date.now();
    this.routeIdx = 1;
    if (auto) this.autoWalk = true;
    this.emit();
    return this.route;
  }
  /** Click-to-move: bấm vào mặt đất để nhân vật tự đi tới đó (tránh vật cản & vùng chưa được phép) */
  walkTo(x, z) {
    if (!this.char || this.dialog || this.mapOpen) return null;
    return this.routeTo({ x, z, label: 'Điểm đã chọn' }, false, true);
  }
  clearRoute() {
    this.route = null;
    this.autoWalk = false;
    this.emit();
  }

  // ---------------- mục tiêu hiện tại ("Tôi cần làm gì tiếp theo?") ----------------
  currentWorkflowStep() {
    const inst = this.sp?.task?.current;
    if (!inst) return null;
    const ready = WF.readySteps(inst);
    return ready.find((s) => !WF.blockers(s, this.accessCtx()).length) ?? ready[0] ?? null;
  }
  objective() {
    if (!this.sp) return null;
    if (!onboardingDone(this.sp)) {
      const st = currentStep(this.sp);
      // trong lúc làm quy trình, các bước nhập môn gắn với hiện trường hiển thị theo bước quy trình
      const fieldStep = ['workfront', 'object', 'workflow'].includes(st?.target);
      if (st && (!this.sp.task.current || (!fieldStep && !['workflow-step', 'workflow-done'].includes(st.complete.event))))
        return { kind: 'mission', title: st.title, desc: st.desc, target: st.target ?? null, step: `${this.sp.onboarding.index + 1}/${ONBOARD.steps.length}`, mission: ONBOARD.title, guide: st.guide };
    }
    const inst = this.sp.task.current;
    if (inst) {
      const tpl = WF.template(inst.templateId);
      const s = this.currentWorkflowStep();
      const ready = WF.readySteps(inst);
      const next = ready.find((x) => x.id !== s?.id) ?? tpl.steps.find((x) => inst.status[x.id] === 'locked');
      const b = s ? WF.blockers(s, this.accessCtx()) : [];
      return { kind: 'workflow', title: s?.label ?? 'Hoàn tất quy trình', desc: s?.hint ?? '', target: s?.target ?? 'office', mission: `${tpl.label} · ${this.taskNode()?.name ?? ''}`, blockers: b, next: next?.label ?? null, parallel: ready.length > 1 };
    }
    return { kind: 'free', title: 'Nhận nhiệm vụ mới tại Văn phòng chỉ huy', desc: 'Hoặc tự do tham quan các khu vực được phép.', target: 'office', mission: 'Nhiệm vụ theo nghề' };
  }

  /** Trả về input {f,r,run} (toạ độ THẾ GIỚI, dùng với camYaw=0) để tự đi theo this.route, hoặc null khi đã hết tuyến */
  followRoute() {
    const pts = this.route?.points;
    if (!pts?.length || !this.char) return null;
    let idx = Math.min(this.routeIdx ?? 1, pts.length - 1);
    while (idx < pts.length - 1 && Math.hypot(pts[idx][0] - this.char.x, pts[idx][1] - this.char.z) < 0.7) idx++;
    this.routeIdx = idx;
    const [tx, tz] = pts[idx];
    const dx = tx - this.char.x;
    const dz = tz - this.char.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.08) return idx >= pts.length - 1 ? null : { f: 0, r: 0, run: false };
    return { f: -dz / d, r: dx / d, run: true };
  }

  // ---------------- vòng lặp ----------------
  /** dt thực; input: { f, r, run } ; camYaw: hướng camera; active=false khi đang mở hộp thoại/camera tự do */
  update(dt, input, camYaw, active = true) {
    if (!this.char) return;
    dt = Math.min(dt, 0.25);
    this.acc += dt;
    const manualMove = Math.abs(input.f) > 0.02 || Math.abs(input.r) > 0.02;
    if (this.autoWalk && manualMove) {
      // người chơi tự bấm WASD/mũi tên → lấy lại quyền điều khiển ngay, huỷ tự động đi
      this.autoWalk = false;
    }
    let inp = active && !this.dialog ? input : { f: 0, r: 0, run: false };
    let yaw = camYaw;
    if (this.autoWalk && this.route && active && !this.dialog) {
      const w = this.followRoute();
      if (w) {
        inp = w;
        yaw = 0; // input đã ở hệ toạ độ thế giới (không phụ thuộc hướng camera)
      } else this.autoWalk = false;
    }
    // nhảy: yêu cầu một lần (Space), tiêu thụ ngay — stepCharacter tự bỏ qua nếu đang bay/dưới nước
    const jump = active && !this.dialog && this.jumpRequested;
    this.jumpRequested = false;
    if (jump) inp = { ...inp, jump: true };
    while (this.acc >= FIXED_DT) {
      stepCharacter(this.char, inp, yaw, this.cw, this.blocking ?? [], FIXED_DT);
      this.stepNpcs(FIXED_DT);
      this.acc -= FIXED_DT;
    }
    this.profile.playTime += dt;
    // giấy phép hết hạn
    const sp2 = expirePermits(this.sp, this.profile.playTime);
    if (sp2 !== this.sp) {
      this.setSp(sp2, false);
      this.notify('Một giấy phép làm việc đã hết hạn (mô phỏng).', 'warn');
      this.refreshNav();
    }
    // giữ E
    if (this.hold) {
      const near = this.distTo(this.hold.target) <= REACH + 0.5;
      if (this.holdDown && near) {
        this.hold.t += dt;
        this.char.anim = 'interact';
        if (this.hold.t >= this.hold.need) {
          const h = this.hold;
          this.hold = null;
          this.char.anim = 'idle';
          this.completeWorkflowStep(h.stepId, {});
        }
      } else if (!this.holdDown) {
        this.hold = null;
        this.char.anim = 'idle';
      }
    }
    // cảnh báo vùng
    this.warnings = evaluate(this.zones, this.char.x, this.char.z, this.accessCtx()).warnings.slice(0, 3);
    // tới nơi (sự kiện reach)
    for (const key of ['gate', 'guide', 'office', 'drawing', 'warehouse', 'hseBoard', 'workfront', 'checkpoint']) {
      const inNow = this.distTo(key) <= ([...FACILITY_KEYS, 'gate'].includes(key) ? 3 : REACH);
      if (inNow && !this.inside[key]) this.onReach(key);
      this.inside[key] = inNow;
    }
    // tuyến đường: tới nơi thì xoá; lệch xa thì tính lại
    if (this.route) {
      const end = this.route.target;
      // chỉ xoá tuyến khi đã vào hẳn vùng tương tác (tuyến luôn đưa người chơi tới chỗ bấm E được)
      if (Math.hypot(end.x - this.char.x, end.z - this.char.z) < 1.2) {
        this.route = null;
        this.autoWalk = false;
      } else if (Date.now() - this.routeAt > 1500) this.routeTo(this.route.key ?? end, true, this.autoWalk);
    } else if (this.profile.settings.beginner && !this.profile.settings.explore && !this.dialog) {
      const o = this.objective();
      if (o?.target && Date.now() - (this.routeAt ?? 0) > 2500) {
        const t = this.targetPos(o.target);
        if (t && Math.hypot(t.x - this.char.x, t.z - this.char.z) > 4) this.routeTo(o.target, true);
        else this.routeAt = Date.now();
      }
    }
    this.interactable = this.findInteractable();
    // lưu định kỳ
    this.saveTimer += dt;
    if (this.saveTimer > 8) {
      this.saveTimer = 0;
      this.save();
    }
    const hud = JSON.stringify(this.hudKey());
    if (hud !== this.lastHud) {
      this.lastHud = hud;
      this.emit();
    }
  }

  stepNpcs(dt) {
    const g = this.npcs.find((n) => n.kind === 'guide');
    if (!g) return;
    // AI hướng dẫn đi trước tới mục tiêu nhập môn (NPC không bị vùng chặn — chỉ vật cản)
    const o = this.objective();
    const key = o?.kind === 'mission' && o.target && o.target !== 'guide' ? o.target : null;
    const t = key ? this.targetPos(key) : null;
    if (t && (!g.goal || Math.hypot(g.goal.x - t.x, g.goal.z - t.z) > 1)) {
      g.goal = { x: t.x, z: t.z };
      const p = this.navAll.path(g.x, g.z, t.x + 2, t.z + 2);
      g.path = p ? p.points.slice(1) : null;
    }
    g.moving = false;
    if (g.path?.length) {
      const [px, pz] = g.path[0];
      const dx = px - g.x;
      const dz = pz - g.z;
      const d = Math.hypot(dx, dz);
      const step = 2.6 * dt;
      if (d <= step) g.path.shift();
      else {
        g.x += (dx / d) * step;
        g.z += (dz / d) * step;
        g.yaw = Math.atan2(dx, dz);
        g.moving = true;
      }
      g.y = this.cw.groundAt(g.x, g.z);
    } else if (this.char) g.yaw = Math.atan2(this.char.x - g.x, this.char.z - g.z);
  }

  // ---------------- sự kiện ----------------
  /** Điểm làm việc NGOÀI HIỆN TRƯỜNG của quy trình hiện tại (để nhiệm vụ nhập môn áp dụng cho mọi nghề) */
  fieldTargets() {
    const inst = this.sp?.task?.current;
    if (!inst) return [];
    const ts = new Set(WF.template(inst.templateId).steps.map((s) => s.target));
    const field = ['workfront', 'object', 'checkpoint', 'foreman'].filter((t) => ts.has(t));
    return field.length ? field : ['warehouse', 'hseBoard'].filter((t) => ts.has(t));
  }
  onReach(key) {
    this.mission({ type: 'reach', target: key });
    if (key !== 'workfront' && this.fieldTargets().includes(key)) this.mission({ type: 'reach', target: 'workfront' });
    const inst = this.sp?.task?.current;
    if (inst) for (const s of WF.readySteps(inst)) if (s.kind === 'goto' && s.target === key && !WF.blockers(s, this.accessCtx()).length) this.completeWorkflowStep(s.id, {});
  }
  mission(ev, quiet = false) {
    if (!this.sp) return;
    const state = { ppeOk: this.ppeCompliant(), trainings: this.trainings(), mapOpened: !!this.sp.mapOpened, flowDone: this.profile.flow ?? [] };
    const r = handleEvent(this.sp, this.profile.claimed, this.siteKey, ev, state);
    if (!r.completed.length) return;
    this.profile = addXp({ ...this.profile, claimed: r.claimed }, r.xp);
    this.setSp(r.siteProgress, false);
    if (!quiet) for (const s of r.completed) this.notify(`✔ ${s.title}${r.xp ? ` (+${s.xp} XP)` : ''}`, 'ok');
    this.showGuideForStep();
    this.save();
    this.emit();
  }
  showGuideForStep() {
    const st = currentStep(this.sp);
    const key = st?.guide ?? (onboardingDone(this.sp) ? 'done' : null);
    if (!key) return;
    const lines = guide().lines(key, guideContext(this.profile, this.world.site, this.world.site.entry?.ppe));
    const before = this.profile.tutorial.seen[`${this.siteKey}:${key}`];
    this.profile = recordGuide(this.profile, this.siteKey, key, lines);
    if (!before) this.guideBubble = { key, lines };
  }
  dismissGuide() {
    this.guideBubble = null;
    this.emit();
  }
  openMap() {
    this.mapOpen = true;
    if (this.sp && !this.sp.mapOpened) {
      this.setSp({ ...this.sp, mapOpened: true }, false);
      this.mission({ type: 'map-opened' });
    }
    this.emit();
  }
  closeMap() {
    this.mapOpen = false;
    this.emit();
  }

  // ---------------- tương tác (InteractionSystem) ----------------
  /** Khoảng cách tới hộp công trình phụ trợ (đo tới chính công trình, không tới 1 điểm cố định) */
  facilityDist(kind) {
    const o = this.cw.obstacles.find((x) => x.id === `F-${kind}`);
    if (!o) return Infinity;
    const [lx, lz] = rotY(this.char.x - o.cx, this.char.z - o.cz, -o.ry);
    return Math.hypot(Math.max(Math.abs(lx) - o.hx, 0), Math.max(Math.abs(lz) - o.hz, 0));
  }
  distTo(key) {
    if ([...FACILITY_KEYS, 'gate'].includes(key)) return this.facilityDist(key);
    const t = this.targetPos(key);
    return t ? Math.hypot(t.x - this.char.x, t.z - this.char.z) : Infinity;
  }

  /** InteractionSystem: chọn đối tượng tương tác — ƯU TIÊN mức liên quan (bước quy trình > nhiệm vụ > khác), sau đó khoảng cách */
  findInteractable() {
    const c = this.char;
    const cands = [];
    const consider = (it) => {
      if (it.d <= (it.r ?? INTERACT)) cands.push(it);
    };
    for (const k of [...FACILITY_KEYS, 'gate']) consider({ key: k, kind: 'facility', label: this.facility(k).label, d: this.facilityDist(k), r: 3.2 });
    for (const n of this.npcs) consider({ key: n.kind, kind: 'npc', label: n.name, npc: n, d: Math.hypot(n.x - c.x, n.z - c.z), r: 2.6 });
    if (this.workfront) consider({ key: 'workfront', kind: 'task', label: this.taskNode()?.name, d: Math.hypot(this.workfront.x - c.x, this.workfront.z - c.z), r: REACH });
    // mọi đích của bước quy trình đang sẵn sàng (vd. điểm tuần tra) đều tương tác được
    for (const s of this.sp?.task?.current ? WF.readySteps(this.sp.task.current) : []) {
      if ([...FACILITY_KEYS, 'gate', 'workfront', 'object', 'guide', 'foreman'].includes(s.target)) continue;
      const t = this.targetPos(s.target);
      if (t) consider({ key: s.target, kind: 'task', label: t.label, d: Math.hypot(t.x - c.x, t.z - c.z), r: REACH });
    }
    for (const o of this.cw.near(c.x, c.z)) {
      if (o.seg || !o.node) continue;
      const [lx, lz] = rotY(c.x - o.cx, c.z - o.cz, -o.ry);
      const d = Math.hypot(Math.max(Math.abs(lx) - o.hx, 0), Math.max(Math.abs(lz) - o.hz, 0));
      const isTask = o.id === this.sp?.task?.current?.objectId;
      consider({ key: isTask ? 'workfront' : `obj:${o.id}`, kind: getType(o.node.type)?.equip ? 'equipment' : 'object', label: o.node.name, node: o.node, d, r: 2.5 });
    }
    if (!cands.length) return null;
    const ranked = cands.map((it) => {
      const action = this.actionFor(it);
      const pri = !action ? -1 : action.type === 'workflow' ? 3 : ['induction', 'guide', 'ppe-check', 'new-task'].includes(action.type) && this.isMissionRelevant(it.key) ? 2 : 1;
      return { ...it, action, pri };
    });
    ranked.sort((a, b) => b.pri - a.pri || a.d - b.d);
    return ranked[0].action ? ranked[0] : null;
  }
  isMissionRelevant(key) {
    const st = currentStep(this.sp);
    if (!st) return key === 'office';
    return st.target === key || (st.id === 's07' && key === 'guide') || (st.id === 's10' && key === 'office');
  }

  /** Hành động phù hợp nghề + quyền + trạng thái nhiệm vụ */
  actionFor(it) {
    const inst = this.sp?.task?.current;
    if (inst) {
      const matchesTarget = (s) => s.target === it.key || (s.target === 'object' && it.key === 'workfront') || (s.target === 'workfront' && it.key === 'workfront');
      const step = WF.readySteps(inst).find((s) => s.kind !== 'goto' && matchesTarget(s));
      if (step) return { label: `${step.kind === 'hold' ? 'Giữ E' : 'E'} – ${step.label}`, type: 'workflow', step, hold: step.kind === 'hold' };
    }
    const st = currentStep(this.sp);
    if (it.key === 'guide') {
      if (st?.id === 's07') return { label: 'E – Làm bài huấn luyện an toàn', type: 'induction' };
      return { label: 'E – Trao đổi với AI hướng dẫn', type: 'guide' };
    }
    if (it.key === 'gate') return { label: 'E – Kiểm tra PPE', type: 'ppe-check' };
    if (it.key === 'office') {
      const reached = this.sp.onboarding.index >= ONBOARD.steps.findIndex((s) => s.id === 's10');
      if (!inst && reached) return { label: 'E – Nhận nhiệm vụ theo nghề', type: 'new-task' };
      return { label: 'E – Xem thông tin dự án', type: 'office-info' };
    }
    if (it.key === 'drawing') return { label: 'E – Xem bản vẽ & tiến độ', type: 'drawing' };
    if (it.key === 'warehouse') return missingPPE(this.profile, this.requiredPPE()).length ? { label: 'E – Nhận PPE còn thiếu', type: 'ppe-check' } : { label: 'E – Kiểm tra vật tư', type: 'stock' };
    if (it.key === 'hseBoard') return { label: 'E – Xem cảnh báo & giấy phép', type: 'hse-board' };
    if (it.kind === 'npc') return { label: 'E – Trao đổi', type: 'npc' };
    if (it.kind === 'equipment') return { label: 'E – Xem thông tin thiết bị', type: 'equipment' };
    if (it.key === 'workfront' || it.kind === 'object') return { label: 'E – Xem tiến độ', type: 'progress' };
    return null;
  }

  pressInteract() {
    if (this.dialog || !this.interactable?.action) return;
    const it = this.interactable;
    const a = it.action;
    if (a.type === 'workflow') return this.runWorkflowStep(a.step);
    if (a.type === 'guide') {
      const ctx = guideContext(this.profile, this.world.site, this.world.site.entry?.ppe);
      const lines = [...guide().lines('welcome', ctx), ...(this.profile.tutorial.controlsDone ? [] : guide().lines('controls', ctx))];
      this.openDialog({ kind: 'text', title: guide().name, npc: true, lines }, () => {
        this.profile = { ...this.profile, tutorial: { ...this.profile.tutorial, controlsDone: true } };
        this.mission({ type: 'interact', target: 'guide' });
      });
      return;
    }
    if (a.type === 'induction') return this.openTraining('induction');
    if (a.type === 'ppe-check') return this.openPPECheck();
    if (a.type === 'new-task') return this.newTask();
    if (a.type === 'office-info') return this.openOfficeInfo();
    if (a.type === 'drawing') return this.openDialog({ kind: 'text', title: 'Bảng bản vẽ & tiến độ', lines: this.dialogLines('progress') });
    if (a.type === 'stock') return this.openDialog({ kind: 'text', title: 'Kho vật tư', lines: this.dialogLines('stock') });
    if (a.type === 'hse-board') return this.openHseBoard();
    if (a.type === 'npc') return this.openDialog({ kind: 'text', title: it.npc.name, npc: true, lines: guide().npcLines(it.npc.kind, {}) });
    if (a.type === 'equipment') {
      const T = getType(it.node.type);
      return this.openDialog({ kind: 'text', title: it.node.name, lines: [`Loại: ${T.label}`, `Phạm vi tác động: ${T.equip.range} m`, `Tăng năng suất: ${Object.entries(T.equip.boost).map(([k, v]) => `${SKILLS[k].label} +${Math.round(v * 100)}%`).join(', ')}`, 'Không đứng trong bán kính hoạt động của máy.'] });
    }
    if (a.type === 'progress') {
      const node = it.node ?? this.taskNode();
      this.openDialog({ kind: 'text', title: node.name, lines: this.progressLines(node) });
      this.mission({ type: 'interact', target: 'object' });
    }
  }
  setHold(down) {
    this.holdDown = down;
  }

  /** Bấm Space: yêu cầu nhảy, chỉ thật sự bật nếu đang đứng trên bề mặt hợp lệ (xem stepCharacter) */
  pressJump() {
    this.jumpRequested = true;
  }

  // ---------------- hộp thoại ----------------
  openDialog(d, onClose) {
    this.dialog = { id: Date.now(), ...d };
    this.onDialog = onClose ?? null;
    this.emit();
  }
  /** Huỷ hộp thoại (không hoàn thành bước) */
  closeDialog() {
    this.dialog = null;
    this.onDialog = null;
    this.emit();
  }
  /** Gửi kết quả hộp thoại (quiz / checklist / quyết định…). Trả về { ok, feedback } */
  submitDialog(payload) {
    const d = this.dialog;
    if (!d) return { ok: false };
    const r = d.grade ? d.grade(payload) : { ok: true };
    if (r.ok) {
      const cb = this.onDialog;
      this.dialog = null;
      this.onDialog = null;
      cb?.(payload, r);
      this.emit();
    } else {
      this.dialog = { ...d, feedback: r.feedback };
      this.emit();
    }
    return r;
  }
  /** Đóng hộp thoại văn bản (đã đọc) */
  ackDialog() {
    const cb = this.onDialog;
    this.dialog = null;
    this.onDialog = null;
    cb?.({});
    this.emit();
  }

  progressLines(node) {
    const pr = progressOf(node, this.world.sim.nodes[node.id]);
    return [`Tiến độ chung: ${Math.round(pr.overall * 100)}%`, ...pr.geo.plan.map((a, k) => `${k + 1}. ${a.label} — ${Math.round(pr.frac[k] * 100)}% (${SKILLS[a.skill].label})`)];
  }
  dialogLines(kind) {
    const node = this.taskNode();
    if (kind === 'drawing' && node) {
      const T = getType(node.type);
      return [`BẢN VẼ: ${node.name} (${T.label})`, ...T.params.map((p) => `• ${p.label}: ${p.type === 'enum' ? p.options.find(([id]) => id === node.params[p.key])?.[1] : p.type === 'bool' ? (node.params[p.key] ? 'Có' : 'Không') : `${node.params[p.key]} ${p.unit ?? ''}`}`), `• Số cấu kiện mô hình: ${build(node).totals.parts.toLocaleString('vi-VN')}`, 'Bản vẽ minh hoạ trong game, không dùng cho thi công thực tế.'];
    }
    if (kind === 'stock' && node) {
      const pr = progressOf(node, this.world.sim.nodes[node.id]);
      const act = pr.geo.plan[Math.min(pr.k, pr.geo.plan.length - 1)];
      const mats = {};
      for (const i of act.idx) mats[pr.geo.parts[i].m] = (mats[pr.geo.parts[i].m] ?? 0) + 1;
      return [`Vật tư cho “${act.label}” (${node.name}):`, ...Object.entries(mats).map(([m, n]) => `• ${MATERIALS[m]?.label ?? m}: ${n} cấu kiện — đủ hàng (mô phỏng)`), `Khối lượng hình học: ${Math.round(act.volume).toLocaleString('vi-VN')} m³`];
    }
    if (kind === 'crew' && node) return guide().npcLines('foreman', {}).concat([`Hoạt động hiện tại: ${progressOf(node, this.world.sim.nodes[node.id]).geo.plan[0].label}…`]);
    if (kind === 'quantity' && node) return this.progressLines(node).concat([`Tổng khối lượng hình học: ${Math.round(build(node).totals.volume).toLocaleString('vi-VN')} m³`]);
    if (kind === 'permits') {
      const ps = this.sp.permits;
      return ps.length ? ps.map((p) => `${p.id} · ${DATA.permitById[p.type].label} · ${p.status === 'active' && p.expiresAt > this.profile.playTime ? `còn ${Math.ceil((p.expiresAt - this.profile.playTime) / 60)} phút` : 'hết hiệu lực'} · ${p.approvedBy}`) : ['Chưa có giấy phép nào. (Giấy phép trong game là mô phỏng.)'];
    }
    // progress (mặc định)
    const items = Object.values(this.world.doc.nodes).filter((n) => isBuildable(n.type));
    return [`DỰ ÁN: ${this.world.site.name}`, ...items.map((n) => `• ${n.name}: ${Math.round(progressOf(n, this.world.sim.nodes[n.id]).overall * 100)}%`)];
  }

  openTraining(id) {
    const tr = DATA.trainingById[id];
    this.openDialog(
      {
        kind: 'training',
        title: tr.label,
        questions: tr.questions,
        grade: (answers) => {
          const wrong = tr.questions.map((q, i) => (answers?.[i] === q.answer ? null : i + 1)).filter(Boolean);
          return wrong.length ? { ok: false, feedback: `Chưa đúng câu ${wrong.join(', ')}. Đọc kỹ và chọn lại.` } : { ok: true };
        },
      },
      () => {
        if (tr.perSite) this.setSp({ ...this.sp, trainings: [...new Set([...this.sp.trainings, id])] }, false);
        else this.profile = { ...this.profile, trainings: [...new Set([...this.profile.trainings, id])] };
        this.notify(`Đã hoàn thành: ${tr.label}`, 'ok');
        this.refreshNav();
        this.mission({ type: 'training', id });
      },
    );
  }

  /** Màu mũ theo QUY ĐỊNH DỰ ÁN (sites.json → ppePolicy). null = dự án không quy định */
  helmetRule() {
    return this.world ? helmetColorRule(this.world.site, this.roleId) : null;
  }
  /** Đã kiểm tra PPE + đủ PPE bắt buộc được công nhận + đúng màu mũ theo quy định dự án (nếu có) */
  ppeCompliant() {
    const rule = this.helmetRule();
    return !!this.sp?.ppeChecked && !missingPPE(this.profile, this.requiredPPE()).length && (!rule || this.profile.character.ppeStyle.helmetColor === rule);
  }
  openPPECheck(extra = [], onDone) {
    const req = [...new Set([...this.requiredPPE(), ...extra])];
    const miss = missingPPE(this.profile, req);
    const rule = this.helmetRule();
    const wrongHelmet = rule && this.profile.character.ppeStyle.helmetColor !== rule ? rule : null;
    this.openDialog(
      {
        kind: 'ppe',
        title: 'Kiểm tra trang bị bảo hộ (PPE)',
        required: req,
        missing: miss,
        helmetRule: rule ? DATA.ppeStyles.helmetColors.find((c) => c.id === rule)?.label : null,
        helmetWrong: !!wrongHelmet,
        optional: DATA.ppe.filter((x) => !this.profile.ppe.owned.includes(x.id)).map((x) => ({ id: x.id, label: x.label, icon: x.icon })),
      },
      () => {
        this.profile = issueAndEquip(this.profile, req);
        if (wrongHelmet) {
          this.profile = { ...this.profile, character: { ...this.profile.character, ppeStyle: { ...this.profile.character.ppeStyle, helmetColor: wrongHelmet } } };
          this.notify(`Theo quy định dự án, vị trí của bạn dùng mũ màu ${DATA.ppeStyles.helmetColors.find((c) => c.id === wrongHelmet).label.toLowerCase()} — đã đổi mũ.`, 'info');
        }
        this.setSp({ ...this.sp, ppeChecked: true }, false);
        if (miss.length) this.notify(`Đã nhận & mặc: ${miss.map(ppeLabel).join(', ')}`, 'ok');
        this.refreshNav();
        this.mission({ type: 'ppe-ok' });
        onDone?.();
      },
    );
  }

  openOfficeInfo() {
    const r = getRole(this.roleId);
    const lines = [`Dự án: ${this.world.site.name}`, `Quy mô: ${this.world.site.scale ?? ''}`, `Vị trí của bạn: ${r.title}${this.mode === 'intern' ? ' (thực tập)' : ''}`, `Quyền chỉnh sửa công trình: ${this.canEdit() ? 'Có (mở từ menu ESC)' : 'Không'}`];
    if (!onboardingDone(this.sp) && this.sp.onboarding.index < ONBOARD.steps.findIndex((s) => s.id === 's10')) lines.push('Hãy hoàn thành các bước nhập môn trước khi nhận nhiệm vụ.');
    this.openDialog({ kind: 'text', title: 'Văn phòng chỉ huy', lines, trainings: DATA.trainings.filter((t) => !t.perSite && !this.profile.trainings.includes(t.id)) });
  }

  openHseBoard() {
    const ctx = this.accessCtx();
    const zones = this.zones.filter((z) => z.level !== 'safe');
    this.openDialog({
      kind: 'hse',
      title: 'Bảng thông tin HSE',
      zones: zones.map((z) => ({ id: z.id, name: z.name, level: z.level, kind: z.kind, ...zoneAccess(z, ctx) })),
      permits: this.sp.permits.map((p) => ({ ...p, active: p.status === 'active' && p.expiresAt > this.profile.playTime })),
      permitTypes: DATA.permitTypes.map((t) => ({ id: t.id, label: t.label })),
    });
  }

  /** Mở phiếu xin PTW (mô phỏng) */
  openPermit(typeId, onDone) {
    const t = DATA.permitById[typeId];
    const existing = activePermit(this.sp, typeId, this.profile.playTime);
    if (existing) {
      this.notify(`${existing.id} (${t.label}) vẫn còn hiệu lực.`, 'info');
      onDone?.();
      return;
    }
    this.openDialog(
      {
        kind: 'permit',
        title: `Giấy phép làm việc (mô phỏng): ${t.label}`,
        conditions: t.conditions.map((c) => c.text),
        validityMin: t.validityMin,
        grade: (selected) => {
          const g = gradePermit(typeId, selected ?? []);
          return g.ok ? { ok: true } : { ok: false, feedback: g.wrong.join(' · ') };
        },
      },
      () => {
        const seq = this.sp.permits.length + 1;
        this.setSp(issuePermit(this.sp, { typeId, roleId: this.roleId, mode: this.mode, playTime: this.profile.playTime, seq }), false);
        this.notify(`Đã cấp giấy phép mô phỏng: ${t.label} (${t.validityMin} phút chơi)`, 'ok');
        this.refreshNav();
        onDone?.();
      },
    );
  }

  // ---------------- nhiệm vụ theo nghề + quy trình ----------------
  newTask() {
    const doc = this.world.doc;
    const officeP = this.targetPos('office');
    const pick = WF.pickTaskObject(doc, this.world.sim, this.roleId, (n) => {
      const p = this.reachablePointNear(n);
      return !!p && !!this.navAll.path(officeP.x, officeP.z, p.x, p.z);
    });
    if (!pick) {
      this.notify('Công trường đã hoàn thành mọi hạng mục. Hãy chọn công trường khác.', 'info');
      return;
    }
    const tplId = WF.workflowFor(this.roleId, pick.n, pick.act.skill);
    const seq = this.sp.task.seq + 1;
    const inst = WF.createInstance(tplId, { id: `T${String(seq).padStart(3, '0')}`, objectId: pick.n.id, actIndex: pick.pr.k, seed: `${this.siteKey}:${seq}` });
    this.setSp({ ...this.sp, task: { ...this.sp.task, current: inst, seq } }, false);
    this.computeTaskTargets();
    this.notify(`Nhiệm vụ mới: ${WF.template(tplId).label} — ${pick.n.name}`, 'ok');
    // bước "tiếp nhận" diễn ra ngay tại văn phòng
    const brief = WF.readySteps(inst).find((s) => s.tag === 'brief' && s.target === 'office');
    if (brief) this.completeWorkflowStep(brief.id, {});
    this.emit();
  }

  runWorkflowStep(step) {
    const b = WF.blockers(step, this.accessCtx());
    if (b.length) {
      this.notify(`Chưa thực hiện được: ${b.join('; ')}`, 'warn');
      if (step.requires?.permit) this.notify('Đến Bảng HSE để xin giấy phép (mô phỏng).', 'info');
      return;
    }
    const inst = this.sp.task.current;
    const node = this.taskNode();
    const done = (outcome) => this.completeWorkflowStep(step.id, outcome);
    if (this.fieldTargets().includes(step.target) || step.target === 'object') this.mission({ type: 'interact', target: 'object' });
    switch (step.kind) {
      case 'interact':
      case 'report':
        return done({});
      case 'dialog':
        return this.openDialog({ kind: 'text', title: step.label, lines: this.dialogLines(step.dialog) }, () => done({}));
      case 'hold':
        this.hold = { stepId: step.id, target: step.target, t: 0, need: step.seconds ?? 4 };
        this.holdDown = true;
        return this.emit();
      case 'ppe':
        return this.openPPECheck(step.extraPPE ?? [], () => done({}));
      case 'permit':
        return this.openPermit(step.permit, () => done({}));
      case 'quiz': {
        const q = step.quiz ?? WF.generateQuiz(step.quizGen, { node, sim: this.world.sim, zone: this.checkpoint?.zone, seed: `${inst.seed}:${step.id}` });
        return this.openDialog({ kind: 'quiz', title: step.label, question: q.q, options: q.options, grade: (i) => (i === q.answer ? { ok: true } : { ok: false, feedback: 'Chưa đúng. Quan sát lại thông tin và chọn lại.' }) }, () => done({}));
      }
      case 'checklist':
        return this.openDialog(
          {
            kind: 'checklist',
            title: step.label,
            items: step.checklist.map((c) => c.text),
            grade: (sel) => {
              const wrong = step.checklist.map((c, i) => (c.correct !== (sel ?? []).includes(i) ? i : null)).filter((x) => x !== null);
              return wrong.length ? { ok: false, feedback: 'Danh sách chưa đúng: thiếu điều kiện cần thiết hoặc chọn điều kiện mất an toàn.' } : { ok: true };
            },
          },
          () => done({}),
        );
      case 'inspect': {
        const f = WF.inspectionFindings(inst, step);
        return this.openDialog(
          {
            kind: 'inspect',
            title: step.label,
            findings: f.findings,
            options: ['Đạt — đồng ý nghiệm thu (mô phỏng)', 'Không đạt — yêu cầu sửa chữa'],
            grade: (i) => ((i === 1) === f.defect ? { ok: true } : { ok: false, feedback: f.defect ? 'Kết quả kiểm tra có sai lỗi — không thể nghiệm thu.' : 'Không có sai lỗi — không cần yêu cầu sửa.' }),
          },
          () => done({ pass: !f.defect }),
        );
      }
      case 'decision':
        return this.openDialog({ kind: 'quiz', title: step.label, question: step.hint, options: step.options.map((o) => o.label), grade: () => ({ ok: true }) }, (i) => done({ option: i }));
      default:
        return done({});
    }
  }

  completeWorkflowStep(stepId, outcome) {
    const inst0 = this.sp.task.current;
    if (!inst0) return;
    const step = WF.stepDef(inst0, stepId);
    const res = WF.completeStep(inst0, stepId, outcome);
    this.setSp({ ...this.sp, task: { ...this.sp.task, current: res.inst } }, false);
    if (res.branch === 'rework') {
      this.notify('Không đạt: thực hiện bước làm lại rồi kiểm tra lại.', 'warn');
      this.emit();
      return;
    }
    if (!res.completed) return;
    const c = claimOnce(this.profile.claimed, `${this.siteKey}:task:${inst0.id}:${stepId}`, step.xp ?? 0);
    this.profile = addXp({ ...this.profile, claimed: c.claimed }, c.xp);
    this.notify(`✔ ${step.label}${c.xp ? ` (+${c.xp} XP)` : ''}`, 'ok');
    this.mission({ type: 'workflow-step', tag: step.tag });
    if (WF.isDone(res.inst)) this.finishTask(res.inst);
    this.save();
    this.emit();
  }

  finishTask(inst) {
    const tpl = WF.template(inst.templateId);
    const node = this.world.doc.nodes[inst.objectId];
    // tác động THẬT lên tiến độ công trình (dùng engine): cộng khối lượng vào hoạt động hiện tại
    if (tpl.effect && node) {
      const st = this.world.sim.nodes[node.id] ?? {};
      const pr = progressOf(node, st);
      const k = Math.min(pr.k, pr.geo.plan.length - 1);
      const done = pr.geo.plan.map((a, i) => st.done?.[i] ?? 0);
      done[k] = Math.min(pr.geo.plan[k].work, done[k] + pr.geo.plan[k].work * tpl.effect + 0.5);
      const complete = isComplete(node, done);
      this.world.sim = { ...this.world.sim, nodes: { ...this.world.sim.nodes, [node.id]: { ...st, started: true, done, complete } } };
      this.setSp({ ...this.sp, delta: { ...this.sp.delta, [node.id]: done } }, false);
      if (complete) {
        this.zones = buildZones(this.world);
        this.refreshNav(true);
      }
    }
    const bonus = claimOnce(this.profile.claimed, `${this.siteKey}:task:${inst.id}`, DATA.missions.repeatable.xpBonus);
    this.profile = addXp({ ...this.profile, claimed: bonus.claimed }, bonus.xp);
    this.setSp({ ...this.sp, task: { current: null, seq: this.sp.task.seq, done: this.sp.task.done + 1 } }, false);
    this.workfront = null;
    this.notify(`★ Hoàn thành nhiệm vụ “${tpl.label}”${bonus.xp ? ` (+${bonus.xp} XP)` : ''}${tpl.effect ? ' — tiến độ hạng mục đã cập nhật' : ''}`, 'ok');
    this.mission({ type: 'workflow-done' });
    this.mission({ type: 'auto' });
  }

  // ---------------- PPE (đang ở công trường: không tháo được PPE bắt buộc) ----------------
  /** Nhận thêm PPE tuỳ chọn tại ki-ốt/kho (vào kho cá nhân, chưa mặc) */
  issueOptional(id) {
    if (!ppeDef(id)) return;
    this.profile = issuePPE(this.profile, [id]);
    this.notify(`Đã nhận ${ppeDef(id).label} vào kho cá nhân`, 'ok');
    this.save();
    this.emit();
  }
  equip(id) {
    const r = equipFn(this.profile, id, this.world ? this.requiredPPE() : []);
    if (r.error) return this.notify(r.error, 'warn');
    if (r.removed?.length) this.notify(`Đã thay: ${r.removed.map((x) => ppeDef(x).label).join(', ')} → ${ppeDef(id).label}`, 'info');
    this.setProfile(r.profile);
    if (this.world) this.refreshNav();
    this.save();
  }
  unequip(id) {
    const locked = this.world ? this.requiredPPE() : [];
    const r = unequipFn(this.profile, id, locked);
    if (r.error) return this.notify(r.error, 'warn');
    this.setProfile(r.profile);
    if (this.world) this.refreshNav();
    this.save();
  }
  setSettings(patch) {
    this.profile = { ...this.profile, settings: { ...this.profile.settings, ...patch } };
    this.save();
    this.emit();
  }

  // ---------------- HUD ----------------
  hudKey() {
    return {
      w: this.warnings.map((w) => `${w.zone.id}:${w.level}:${w.reasons.length}`),
      p: this.interactable?.action?.label ?? null,
      h: this.hold ? Math.round((this.hold.t / this.hold.need) * 20) : null,
      r: this.route ? Math.round(Math.hypot(this.route.target.x - this.char.x, this.route.target.z - this.char.z) / 2) : null,
      o: this.objective()?.title,
    };
  }
  getHud() {
    if (!this.profile) return null;
    const r = getRole(this.roleId);
    return {
      version: this.version,
      name: this.profile.character.name,
      role: r?.title,
      mode: this.mode,
      xp: this.profile.career.xp,
      roleXp: this.profile.career.roleXp[this.roleId] ?? 0,
      level: levelOf(this.profile.career.xp),
      site: this.world?.site.name,
      objective: this.world ? this.objective() : null,
      prompt: this.interactable?.action ? { label: this.interactable.action.label, target: this.interactable.label } : null,
      hold: this.hold ? this.hold.t / this.hold.need : null,
      warnings: this.warnings.map((w) => ({ id: w.zone.id, name: w.zone.name, level: w.level, zoneLevel: w.zone.level, dist: w.dist, reasons: w.reasons })),
      notices: this.notices.filter((n) => Date.now() - n.at < 5000),
      dialog: this.dialog,
      guide: this.guideBubble,
      route: this.route ? { dist: Math.hypot(this.route.target.x - this.char.x, this.route.target.z - this.char.z), label: this.route.target.label } : null,
      mapOpen: this.mapOpen,
      permits: (this.sp?.permits ?? []).filter((p) => p.status === 'active' && p.expiresAt > this.profile.playTime).length,
      onboarding: this.sp ? { index: this.sp.onboarding.index, total: ONBOARD.steps.length, done: onboardingDone(this.sp) } : null,
      canEdit: this.world ? this.canEdit() : false,
    };
  }
}

export const zonesInsideBoundary = (world, x, z) => insidePolygon(world.boundary, x, z);
export { worldMap, signedDistance };
