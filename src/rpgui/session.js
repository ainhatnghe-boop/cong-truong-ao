// Phiên chơi dùng chung cho toàn UI + hook React (re-render khi session phát thay đổi)
import { useSyncExternalStore } from 'react';
import { GameSession } from '../rpg/GameSession.js';

export const session = new GameSession();
if (typeof window !== 'undefined') {
  // Hook CHỈ ĐỌC cho kiểm thử tự động
  window.__rpg = () => ({ hud: session.getHud(), profile: session.profile, char: session.char && { x: session.char.x, z: session.char.z, y: session.char.y, anim: session.char.anim }, siteKey: session.siteKey, interactable: session.interactable?.key ?? null, route: session.route?.points ?? null, dialog: session.dialog?.kind ?? null });
  window.addEventListener('beforeunload', () => session.save());
}

export function useSession(selector = (s) => s.version) {
  useSyncExternalStore(session.subscribe.bind(session), () => session.version);
  return selector(session);
}
