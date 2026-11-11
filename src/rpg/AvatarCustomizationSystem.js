// ============================================================
//  AvatarCustomizationSystem — điều phối cấu hình nhân vật (hồ sơ v2):
//   character = { name, code, appearance, outfit, ppeStyle, accessories }
//  + spec hiển thị cho renderer (procedural / GLB) — renderer KHÔNG đọc trực tiếp dữ liệu thô.
//  Hàm v1 (sanitizeAppearance / resolveAppearance / randomAppearance) giữ lại dạng tương thích.
// ============================================================
import { DATA } from './data.js';
import { sanitizeAppearanceV2, defaultAppearance } from './AppearanceSystem.js';
import { sanitizeOutfit, defaultOutfit, resolveOutfit } from './OutfitSystem.js';

const pickId = (list, id, def) => (list.some((x) => x.id === id) ? id : def);

export function sanitizePpeStyle(s = {}) {
  const S = DATA.ppeStyles;
  return {
    helmetColor: pickId(S.helmetColors, s?.helmetColor, 'white'),
    helmetStyle: pickId(S.helmetStyles, s?.helmetStyle, 'cap'),
    vestColor: pickId(S.vestColors, s?.vestColor, 'orange'),
    bootsColor: pickId(S.bootColors, s?.bootsColor, 'black'),
  };
}

export const sanitizeAccessories = (list) => [...new Set((Array.isArray(list) ? list : []).filter((id) => DATA.accessoryById[id]))];

/** Mã nhân vật tự sinh (ổn định theo hạt giống) */
export function characterCode(seed = Date.now()) {
  return `NV-${(Math.abs(Number(seed) || 0) % 46656 ** 2).toString(36).toUpperCase().padStart(4, '0')}`;
}

export function defaultCharacter(frame = 'male', name = '') {
  return { name, code: characterCode(), appearance: defaultAppearance(frame), outfit: defaultOutfit(), ppeStyle: sanitizePpeStyle({}), accessories: [] };
}

export function sanitizeCharacter(c = {}) {
  return {
    name: String(c?.name ?? '').trim().slice(0, 24),
    code: /^NV-[0-9A-Z]{4,}$/.test(c?.code ?? '') ? c.code : characterCode(),
    appearance: sanitizeAppearanceV2(c?.appearance),
    outfit: sanitizeOutfit(c?.outfit),
    ppeStyle: sanitizePpeStyle(c?.ppeStyle),
    accessories: sanitizeAccessories(c?.accessories),
  };
}

/** Áp mẫu nhanh (giữ tên & mã) */
export function applyPreset(c, preset) {
  return sanitizeCharacter({
    ...c,
    appearance: { ...defaultAppearance(preset.appearance?.bodyFrame), ...preset.appearance },
    outfit: { ...defaultOutfit(preset.outfit?.id), ...preset.outfit },
    ppeStyle: preset.ppeStyle,
    accessories: preset.accessories,
  });
}

/** Ngoại hình NPC từ characterPresets.npc (biến thể nhẹ theo hạt giống để NPC không giống hệt nhau) */
export function npcCharacter(kind, seed = 1) {
  const p = DATA.npcPresets[kind] ?? {};
  const c = applyPreset(defaultCharacter(p.appearance?.bodyFrame ?? 'male'), p);
  return { ...c, appearance: { ...c.appearance, height: Math.round((c.appearance.height - 0.04 + (seed % 9) / 100) * 100) / 100 } };
}

const color = (list, id) => list.find((x) => x.id === id)?.color;

/**
 * Spec hiển thị: gộp ngoại hình + trang phục + PPE (đang mặc hoặc xem thử) + phụ kiện.
 * equippedOrPreview: danh sách id PPE để VẼ (có thể gồm món xem thử) — không liên quan công nhận gameplay.
 */
export function renderSpec(character, equippedOrPreview = []) {
  const c = sanitizeCharacter(character);
  const ap = DATA.appearance;
  const build = ap.build.options.find((b) => b.id === c.appearance.build);
  const face = ap.faceShape.options.find((f) => f.id === c.appearance.faceShape);
  const S = DATA.ppeStyles;
  const parts = {};
  for (const id of equippedOrPreview) {
    const d = DATA.ppeById[id];
    if (d) parts[d.part] = { id, style: d.style ?? null };
  }
  for (const id of c.accessories) parts[DATA.accessoryById[id].part] = { id, cosmetic: true };
  return {
    ...c.appearance,
    girth: build.girth,
    skull: face.skull,
    jaw: face.jaw,
    eyeOpt: ap.eyes.options.find((e) => e.id === c.appearance.eyes),
    noseScale: ap.nose.options.find((n) => n.id === c.appearance.nose).scale,
    outfit: resolveOutfit(c.outfit),
    helmetColor: color(S.helmetColors, c.ppeStyle.helmetColor),
    helmetStyle: c.ppeStyle.helmetStyle,
    vestColor: color(S.vestColors, c.ppeStyle.vestColor),
    bootsColor: color(S.bootColors, c.ppeStyle.bootsColor),
    parts,
    logo: c.outfit.logo,
  };
}

// ---------------- tương thích v1 ----------------
/** Ngoại hình v1 (phẳng) → character v2 (dùng cho migration hồ sơ & API cũ) */
export function characterFromV1(name, a = {}) {
  const OUT = {
    workwear: { id: 'worker', top: '#2F4A73', bottom: '#2B3445' },
    coverall: { id: 'coverall', top: '#E4572E', bottom: '#E4572E' },
    engineer: { id: 'engineer', top: '#E9EEF4', bottom: '#2F3A4A' },
    polo: { id: 'supervisor', top: '#1E5AA8', bottom: '#2F3A4A' },
    khaki: { id: 'visitor', top: '#C9C3B6', bottom: '#5A4E39' },
  };
  const face = a.face ?? 'calm';
  return sanitizeCharacter({
    name,
    appearance: {
      bodyFrame: 'male',
      height: a.height,
      build: a.body,
      skin: a.skin,
      hair: a.hair,
      hairColor: a.hairColor,
      mouth: face === 'smile' ? 'smile' : 'neutral',
      facialHair: face === 'beard' ? 'beard' : face === 'mustache' ? 'mustache' : 'none',
    },
    outfit: OUT[a.outfit] ?? undefined,
    ppeStyle: { helmetColor: a.helmet, vestColor: a.vest, bootsColor: a.boots === 'brown' ? 'brown' : 'black' },
    accessories: face === 'glasses' ? ['eyeglasses'] : [],
  });
}

/** API cũ: chuẩn hoá ngoại hình v1 → trả về character v2 */
export const sanitizeAppearance = (a) => characterFromV1('', a);
export function randomCharacter(seed = Math.random()) {
  let s = Math.floor(seed * 1e9) || 1;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const ap = DATA.appearance;
  const one = (list) => {
    const x = list[Math.floor(r() * list.length)];
    return typeof x === 'string' ? x : x.id;
  };
  const frame = one(ap.bodyFrame.options);
  const outfit = DATA.outfits[Math.floor(r() * DATA.outfits.length)];
  return sanitizeCharacter({
    appearance: {
      bodyFrame: frame,
      height: frame === 'female' ? 1.55 + r() * 0.17 : 1.64 + r() * 0.2,
      build: one(ap.build.options),
      shoulders: 0.94 + r() * 0.14,
      faceShape: one(ap.faceShape.options),
      eyes: one(ap.eyes.options),
      nose: one(ap.nose.options),
      mouth: one(ap.mouth.options),
      facialHair: frame === 'female' ? 'none' : one(ap.facialHair.options),
      skin: one(ap.skin.options),
      hair: one(ap.hair.options),
      hairColor: one(ap.hairColor.options),
    },
    outfit: { id: outfit.id, top: outfit.top.palette[Math.floor(r() * outfit.top.palette.length)] },
    ppeStyle: { helmetColor: one(DATA.ppeStyles.helmetColors), helmetStyle: one(DATA.ppeStyles.helmetStyles), vestColor: one(DATA.ppeStyles.vestColors) },
    accessories: [],
  });
}
export const randomAppearance = randomCharacter;
export { resolveOutfit };
