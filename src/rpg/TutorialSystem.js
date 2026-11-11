// ============================================================
//  TutorialSystem + NPCInteractionSystem — hội thoại theo KỊCH BẢN (MVP, không cần API key).
//  Interface GuideProvider: { name, lines(key, ctx) → string[], npcLines(kind, ctx) → string[] }
//  → sau này có thể thay ScriptedGuide bằng provider gọi AI hội thoại mà không đổi phần còn lại.
// ============================================================
import { DATA, ppeLabel } from './data.js';
import { getRole } from './RoleManagementSystem.js';

const fill = (t, ctx) => t.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '');

export function guideContext(profile, site, siteEntryPPE) {
  const r = getRole(profile.career.roleId);
  return {
    name: profile.character.name,
    project: site?.name ?? '',
    role: r?.title ?? '',
    roleDesc: r?.description ?? '',
    tasks: r?.tasks.join(', ') ?? '',
    ppe: (siteEntryPPE ?? []).map(ppeLabel).join(', '),
  };
}

export const ScriptedGuide = {
  name: DATA.dialogues.guideName,
  lines: (key, ctx) => (DATA.dialogues.guide[key] ?? []).map((t) => fill(t, ctx)),
  npcLines: (kind, ctx) => (DATA.dialogues.npc[kind] ?? ['Chào bạn!']).map((t) => fill(t, ctx)),
};

let provider = ScriptedGuide;
export const setGuideProvider = (p) => (provider = p);
export const guide = () => provider;

/** Ghi lịch sử hướng dẫn (xem lại bằng phím H); không trùng khoá trong cùng công trường */
export function recordGuide(profile, siteKey, key, lines) {
  const hk = `${siteKey}:${key}`;
  if (profile.tutorial.seen[hk]) return profile;
  return {
    ...profile,
    tutorial: { ...profile.tutorial, seen: { ...profile.tutorial.seen, [hk]: true }, history: [...profile.tutorial.history, { at: new Date().toISOString(), key, siteKey, lines }].slice(-60) },
  };
}
