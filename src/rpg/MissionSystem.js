// ============================================================
//  MissionSystem — nhiệm vụ chuỗi bước (onboarding) + nhiệm vụ lặp theo nghề.
//  - Bước chỉ hoàn thành khi là BƯỚC HIỆN TẠI (đúng trình tự)
//  - Phần thưởng ghi vào sổ claimed → xem lại / làm lại KHÔNG nhận trùng
//  - Bước dựa trên trạng thái (PPE, huấn luyện, đã mở bản đồ) được kiểm tra lại khi trở thành bước hiện tại
// ============================================================
import { DATA } from './data.js';

export const ONBOARD = DATA.missions.onboarding;
const GLOBAL_STEPS = new Set(['s01', 's02', 's03']);

export const claimKey = (siteKey, stepId) => (GLOBAL_STEPS.has(stepId) ? `${ONBOARD.id}:${stepId}` : `${siteKey}:${ONBOARD.id}:${stepId}`);
export const currentStep = (sp) => ONBOARD.steps[sp.onboarding.index] ?? null;
export const onboardingDone = (sp) => sp.onboarding.index >= ONBOARD.steps.length;

function matches(cond, ev) {
  if (cond.event === 'auto') return true;
  if (cond.event !== ev.type) return false;
  if (cond.target && cond.target !== ev.target) return false;
  if (cond.tag && cond.tag !== ev.tag) return false;
  if (cond.id && cond.id !== ev.id) return false;
  return true;
}

/** Điều kiện dựa trên trạng thái đã đạt sẵn chưa (để không bắt người chơi làm lại) */
function satisfiedByState(cond, state) {
  if (cond.event === 'ppe-ok') return state.ppeOk;
  if (cond.event === 'training') return state.trainings.includes(cond.id);
  if (cond.event === 'map-opened') return state.mapOpened;
  if (['character-created', 'role-chosen', 'site-joined', 'spawned'].includes(cond.event)) return state.flowDone?.includes(cond.event);
  return false;
}

/**
 * Xử lý sự kiện. Trả về { siteProgress, claimed, xp, completed:[step] }
 * state: { ppeOk, trainings:[], mapOpened, flowDone:[] } để kiểm tra bước dựa trên trạng thái.
 */
export function handleEvent(sp0, claimed0, siteKey, ev, state) {
  let sp = sp0;
  let claimed = claimed0;
  let xp = 0;
  const completed = [];
  for (let guard = 0; guard < ONBOARD.steps.length; guard++) {
    const step = currentStep(sp);
    if (!step) break;
    const byEvent = !!ev && matches(step.complete, ev);
    const hit = byEvent || satisfiedByState(step.complete, state) || step.complete.event === 'auto';
    if (!hit) break;
    const key = claimKey(siteKey, step.id);
    if (!claimed[key]) {
      claimed = { ...claimed, [key]: true };
      xp += step.xp ?? 0;
    }
    sp = { ...sp, onboarding: { index: sp.onboarding.index + 1, done: { ...sp.onboarding.done, [step.id]: true } } };
    completed.push(step);
    if (byEvent) ev = null; // một sự kiện chỉ hoàn thành 1 bước; bước hoàn thành nhờ trạng thái không tiêu sự kiện
  }
  return { siteProgress: sp, claimed, xp, completed };
}

/** Thưởng 1 lần theo khoá (bước quy trình, hoàn thành nhiệm vụ lặp) */
export function claimOnce(claimed, key, amount) {
  if (claimed[key]) return { claimed, xp: 0 };
  return { claimed: { ...claimed, [key]: true }, xp: amount };
}
