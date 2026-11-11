// ============================================================
//  ProjectWorkforceSystem — cơ cấu nhân sự ĐỘC LẬP theo từng dự án (ProjectRole), đăng ký, đổi vị trí,
//  thực tập, sơ đồ tổ chức. NPC luôn gắn nhãn NPC — không giả làm người chơi trực tuyến.
//  ProjectRole: { roleId, projectId, title, department, totalSlots, occupiedSlots, requiredSkills,
//                 requiredTraining, requiredPPE, authorizedZones, availableTasks }
// ============================================================
import { DATA } from './data.js';
import { competency } from './RoleManagementSystem.js';
import { requiredPPE } from './PPEManagementSystem.js';

export const INTERN_SLOTS = 3;
const NPC_FIRST = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hoa', 'Hùng', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Minh', 'Nam', 'Ngọc', 'Phong', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trung', 'Tú', 'Vy'];

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h);
}

/** Danh sách ProjectRole của một dự án (cấu hình workforce: scale, fill, full) */
export function projectRoles(site) {
  const wf = site.workforce ?? { scale: 1, fill: 0.6, full: [] };
  return DATA.roles.map((r) => {
    const total = Math.max(1, Math.round((r.defaultSlots ?? 1) * (wf.scale ?? 1)));
    const occupied = wf.full?.includes(r.id) ? total : Math.min(total, Math.floor(total * (wf.fill ?? 0.6) + ((hash(site.id + r.id) % 3) - 1) * 0.5));
    return {
      roleId: r.id,
      projectId: site.id,
      title: r.title,
      department: r.department,
      group: r.group,
      totalSlots: total,
      occupiedSlots: Math.max(0, occupied),
      requiredSkills: r.skills,
      requiredTraining: site.entry?.training ?? ['induction'],
      requiredPPE: requiredPPE(site, r.id),
      authorizedZones: r.access.zones,
      availableTasks: r.tasks,
    };
  });
}

/** Số chỗ đã dùng có tính người chơi đang giữ chỗ */
export function slotStatus(site, siteProgress, roleId) {
  const pr = projectRoles(site).find((x) => x.roleId === roleId);
  const mine = siteProgress?.joined?.roleId === roleId && siteProgress.joined.mode === 'member' ? 1 : 0;
  return { ...pr, occupiedSlots: pr.occupiedSlots + mine, free: pr.totalSlots - pr.occupiedSlots - mine, mine: !!mine };
}

/**
 * Đăng ký tham gia dự án ở vị trí roleId. Kiểm tra: còn chỗ, năng lực. Không đủ → gợi ý vị trí khác / thực tập.
 * mode: 'member' | 'intern'. Trả về { siteProgress } hoặc { error, suggestions, canIntern }.
 */
export function joinProject(profile, site, siteProgress, roleId, mode = 'member') {
  const st = slotStatus(site, siteProgress, roleId);
  const comp = competency(profile, roleId);
  if (mode === 'member') {
    if (!comp.ok) return { error: comp.reason, canIntern: true, suggestions: suggestRoles(profile, site, siteProgress, roleId) };
    const alreadyMine = siteProgress?.joined?.roleId === roleId && siteProgress.joined.mode === 'member';
    if (!alreadyMine && st.totalSlots - (st.occupiedSlots - (st.mine ? 1 : 0)) <= 0)
      return { error: `Vị trí ${st.title} đã đủ ${st.totalSlots}/${st.totalSlots} người`, canIntern: true, suggestions: suggestRoles(profile, site, siteProgress, roleId) };
  }
  return { siteProgress: { ...siteProgress, joined: { roleId, mode, at: new Date().toISOString() } } };
}

/** Gợi ý vị trí còn chỗ: ưu tiên cùng nhóm nghề, đạt năng lực */
export function suggestRoles(profile, site, siteProgress, roleId) {
  const g = DATA.roleById[roleId]?.group;
  return projectRoles(site)
    .map((pr) => ({ ...pr, free: pr.totalSlots - pr.occupiedSlots }))
    .filter((pr) => pr.roleId !== roleId && pr.free > 0 && competency(profile, pr.roleId).ok)
    .sort((a, b) => (b.group === g) - (a.group === g) || b.free - a.free)
    .slice(0, 4);
}

/** Sơ đồ tổ chức: nhóm → vị trí → danh sách thành viên (NPC có nhãn, người chơi ghi rõ) */
export function orgChart(site, siteProgress, playerName) {
  const roles = projectRoles(site);
  return DATA.roleGroups.map((g) => ({
    ...g,
    roles: roles
      .filter((r) => r.group === g.id)
      .map((r) => {
        const members = Array.from({ length: r.occupiedSlots }, (_, i) => ({ npc: true, name: `${NPC_FIRST[hash(site.id + r.roleId + i) % NPC_FIRST.length]} (NPC)` }));
        if (siteProgress?.joined?.roleId === r.roleId) members.unshift({ npc: false, name: `${playerName} (bạn${siteProgress.joined.mode === 'intern' ? ' · thực tập' : ''})` });
        return { ...r, members };
      }),
  }));
}

export const npcName = (seed) => NPC_FIRST[hash(String(seed)) % NPC_FIRST.length];
