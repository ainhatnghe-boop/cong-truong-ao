// ============================================================
//  OutfitSystem — trang phục (outfits.json). Trang phục là NGOẠI HÌNH, không phải PPE.
//  Đổi trang phục chỉ đổi tham số vật liệu/hình khối của cùng một bộ khung → không mất rig/animation.
// ============================================================
import { DATA } from './data.js';

const LOGO_MAX = 12;

export function defaultOutfit(id = DATA.defaultOutfit) {
  const o = DATA.outfitById[id] ?? DATA.outfitById[DATA.defaultOutfit];
  return { id: o.id, top: o.top.color, bottom: o.bottom.color, logo: { enabled: true, text: 'CTA' } };
}

export function sanitizeOutfit(v = {}) {
  const def = DATA.outfitById[v?.id] ?? DATA.outfitById[DATA.defaultOutfit];
  const top = def.top.palette.includes(v?.top) ? v.top : def.top.color;
  const bottom = def.bottom.palette.includes(v?.bottom) ? v.bottom : def.bottom.color;
  const text = String(v?.logo?.text ?? 'CTA')
    .replace(/[^\p{L}\p{N} .&-]/gu, '')
    .trim()
    .slice(0, LOGO_MAX);
  return { id: def.id, top, bottom, logo: { enabled: v?.logo?.enabled !== false, text: text || 'CTA' } };
}

/** Thông số hiển thị đã giải (kiểu áo/quần, màu, áo trong của áo khoác) */
export function resolveOutfit(v) {
  const o = sanitizeOutfit(v);
  const def = DATA.outfitById[o.id];
  return { ...o, topStyle: def.top.style, bottomStyle: def.bottom.style, sleeves: def.top.sleeves, inner: def.top.inner ?? null, label: def.label };
}

export const LOGO_MAX_LEN = LOGO_MAX;
