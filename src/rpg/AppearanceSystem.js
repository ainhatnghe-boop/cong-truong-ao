// ============================================================
//  AppearanceSystem — chuẩn hoá ngoại hình theo appearance.json + khoá nhóm không được bộ dựng hỗ trợ.
//  Mọi tuỳ chọn hiển thị phải có tác dụng thật với bộ dựng hiện tại; nếu không thì bị khoá kèm thông báo.
// ============================================================
import { DATA } from './data.js';

const A = () => DATA.appearance;
const ids = (opts) => opts.map((o) => (typeof o === 'string' ? o : o.id));
const clamp = (v, r) => Math.round(Math.min(r.max, Math.max(r.min, Number.isFinite(Number(v)) ? Number(v) : r.def)) * 100) / 100;

export const APPEARANCE_FIELDS = ['bodyFrame', 'height', 'build', 'shoulders', 'torso', 'faceShape', 'eyes', 'nose', 'mouth', 'facialHair', 'skin', 'hair', 'hairColor'];

export function defaultAppearance(frame = 'male') {
  return { ...(A().defaults[frame] ?? A().defaults.male) };
}

export function sanitizeAppearanceV2(a = {}) {
  const frame = ids(A().bodyFrame.options).includes(a?.bodyFrame) ? a.bodyFrame : 'male';
  const d = defaultAppearance(frame);
  const pick = (k) => (ids(A()[k].options).includes(a?.[k]) ? a[k] : d[k]);
  return {
    bodyFrame: frame,
    height: clamp(a?.height ?? d.height, A().height),
    build: pick('build'),
    shoulders: clamp(a?.shoulders ?? d.shoulders, A().shoulders),
    torso: clamp(a?.torso ?? d.torso, A().torso),
    faceShape: pick('faceShape'),
    eyes: pick('eyes'),
    nose: pick('nose'),
    mouth: pick('mouth'),
    facialHair: pick('facialHair'),
    skin: pick('skin'),
    hair: pick('hair'),
    hairColor: pick('hairColor'),
  };
}

/** Nhóm tuỳ chọn → capability; supported(capability) theo bộ dựng hiện tại */
export const capabilityOf = (field) => A()[field]?.capability ?? field;
export function lockedFields(capabilities) {
  return APPEARANCE_FIELDS.filter((f) => !capabilities.includes(capabilityOf(f)));
}

export const option = (field, id) => A()[field]?.options?.find((o) => (typeof o === 'string' ? o === id : o.id === id));
