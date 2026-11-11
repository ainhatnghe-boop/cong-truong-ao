// ============================================================
//  MultiplayerClient — đồng bộ vị trí/animation/ngoại hình giữa người chơi qua Supabase Realtime.
//  CHỈ dùng trong src/rpgui/* (browser) — KHÔNG import file này từ src/rpg/* hay scripts/test-rpg.mjs,
//  để GameSession.js và bộ kiểm thử Node (npm run test:rpg) không đụng mạng/SDK trình duyệt.
//
//  Phạm vi thật (xem docs/01 RULE AGENTS.md D1):
//  - Chỉ đồng bộ vị trí/hướng/animation/ngoại hình hiển thị — mỗi máy tự chạy GameSession cục bộ.
//  - KHÔNG có máy chủ quyền uy (authoritative server): không chống gian lận, không đồng bộ PPE công nhận,
//    nhiệm vụ, hay dữ liệu hồ sơ giữa người chơi.
//  - Cần VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (build-time env). Thiếu 1 trong 2 → tự tắt, không lỗi.
// ============================================================
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STALE_MS = 10_000;
const PLAYER_ID_KEY = 'ctao.rpg.playerId';

function getPlayerId() {
  try {
    let id = localStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

class MultiplayerClient {
  constructor() {
    this.enabled = !!(URL && ANON_KEY);
    this.playerId = getPlayerId();
    this.supabase = this.enabled ? createClient(URL, ANON_KEY) : null;
    this.channel = null;
    this.status = 'offline'; // offline | connecting | online | error
    this.remote = new Map(); // id -> { id, name, rendererId, character, equipped, x,y,z, yaw, anim, t }
    this.listeners = new Set();
    this._staleTimer = null;
  }

  _emit() {
    for (const cb of this.listeners) cb(this.remote, this.status);
  }

  subscribe(cb) {
    this.listeners.add(cb);
    cb(this.remote, this.status);
    return () => this.listeners.delete(cb);
  }

  connect(siteId, meta) {
    if (!this.enabled || !siteId) return;
    if (this.channel && this._siteId === siteId) return; // đã kết nối đúng kênh
    this.disconnect();
    this._siteId = siteId;
    this.status = 'connecting';
    this._emit();
    const channel = this.supabase.channel(`world:${siteId}`, { config: { presence: { key: this.playerId } } });
    channel
      // presence = "ai đang có mặt" + ngoại hình (ít đổi) — KHÔNG gửi mỗi frame
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        for (const [id, metas] of Object.entries(state)) {
          if (id === this.playerId) continue;
          const m = metas[0];
          this.remote.set(id, { ...this.remote.get(id), id, name: m?.name, rendererId: m?.rendererId, character: m?.character, equipped: m?.equipped, t: Date.now() });
        }
        const ids = new Set(Object.keys(state));
        for (const id of [...this.remote.keys()]) if (!ids.has(id) && id !== this.playerId) this.remote.delete(id);
        this._emit();
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        this.remote.delete(key);
        this._emit();
      })
      // broadcast = vị trí/hướng/animation — gửi liên tục, nhẹ (không kèm character/ngoại hình)
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        if (!payload || payload.id === this.playerId || !this.remote.has(payload.id)) return;
        this.remote.set(payload.id, { ...this.remote.get(payload.id), ...payload, t: Date.now() });
        this._emit();
      })
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          this.status = 'online';
          channel.track({ name: meta?.name, rendererId: meta?.rendererId, character: meta?.character, equipped: meta?.equipped });
        } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
          this.status = 'error';
        }
        this._emit();
      });
    this.channel = channel;
    this._staleTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, p] of this.remote) {
        if (now - (p.t ?? 0) > STALE_MS) {
          this.remote.delete(id);
          changed = true;
        }
      }
      if (changed) this._emit();
    }, 3000);
  }

  sendTransform({ x, y, z, yaw, anim }) {
    if (!this.enabled || !this.channel || this.status !== 'online') return;
    this.channel.send({ type: 'broadcast', event: 'move', payload: { id: this.playerId, x, y, z, yaw, anim } });
  }

  disconnect() {
    if (this._staleTimer) clearInterval(this._staleTimer);
    this._staleTimer = null;
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this._siteId = null;
    this.remote.clear();
    this.status = 'offline';
    this._emit();
  }
}

export const multiplayerClient = new MultiplayerClient();
