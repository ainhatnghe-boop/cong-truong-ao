// Minimap (góc phải, bám người chơi) & Bản đồ công trường (M) — vẽ canvas 2D từ MinimapSystem.mapLayers
import { useEffect, useRef } from 'react';
import { mapLayers, FACILITY_ICONS } from '../rpg/MinimapSystem.js';
import { rotY } from '../engine/PlacementSystem.js';
import { session, useSession } from './session.js';
import { DATA } from '../rpg/data.js';

function draw(cv, L, view) {
  const ctx = cv.getContext('2d');
  const W = cv.width;
  const H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = L.water ? '#9CC6DA' : '#C9C2AE';
  ctx.fillRect(0, 0, W, H);
  const { cx, cz, scale } = view;
  const X = (x) => W / 2 + (x - cx) * scale;
  const Z = (z) => H / 2 + (z - cz) * scale;
  // nền trong hàng rào
  ctx.beginPath();
  L.boundary.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))));
  ctx.closePath();
  ctx.fillStyle = '#DAD3BF';
  ctx.fill();
  const box = (o, fill, stroke) => {
    const pts = [
      [-o.hx, -o.hz],
      [o.hx, -o.hz],
      [o.hx, o.hz],
      [-o.hx, o.hz],
    ].map(([a, b]) => rotY(a, b, o.ry));
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(X(o.cx + a), Z(o.cz + b)) : ctx.moveTo(X(o.cx + a), Z(o.cz + b))));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };
  for (const r of L.roads) box(r, r.road ? '#555B66' : '#A39C8E');
  // vùng an toàn
  for (const z of L.zones) {
    ctx.globalAlpha = z.blocked ? 0.45 : 0.22;
    ctx.fillStyle = z.color;
    ctx.strokeStyle = z.color;
    ctx.lineWidth = z.blocked ? 2 : 1;
    ctx.beginPath();
    if (z.shape.type === 'circle') ctx.arc(X(z.shape.c[0]), Z(z.shape.c[1]), z.shape.r * scale, 0, Math.PI * 2);
    else if (z.shape.type === 'box') {
      const o = { cx: z.shape.c[0], cz: z.shape.c[1], hx: z.shape.hx, hz: z.shape.hz, ry: z.shape.ry ?? 0 };
      box(o, z.color, z.color);
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  for (const o of L.objects) box(o, o.equip ? '#E5A91A' : '#6B7280', '#1F2937');
  // hàng rào
  ctx.strokeStyle = '#2F6B4F';
  ctx.lineWidth = 2;
  ctx.beginPath();
  L.boundary.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))));
  ctx.closePath();
  ctx.stroke();
  // công trình phụ trợ
  ctx.font = `${Math.max(12, Math.min(20, 3.2 * scale))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of L.facilities) ctx.fillText(FACILITY_ICONS[f.kind] ?? '■', X(f.x), Z(f.z));
  // tuyến đường
  if (L.route) {
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    L.route.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // NPC
  for (const n of L.npcs) {
    ctx.fillStyle = n.kind === 'guide' ? '#2563EB' : '#F8FAFC';
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(X(n.x), Z(n.z), n.kind === 'guide' ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // mục tiêu
  if (L.target) {
    ctx.fillStyle = '#F5A524';
    ctx.font = '18px sans-serif';
    ctx.fillText('★', X(L.target.x), Z(L.target.z));
  }
  // người chơi (mũi tên theo hướng)
  if (L.player) {
    const { x, z, yaw } = L.player;
    ctx.save();
    ctx.translate(X(x), Z(z));
    ctx.rotate(-yaw + Math.PI);
    ctx.fillStyle = '#DC2626';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export function Minimap() {
  const ref = useRef();
  useEffect(() => {
    let raf;
    let last = 0;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 100 || !ref.current || !session.char) return; // 10 Hz là đủ cho minimap
      last = t;
      const L = mapLayers(session);
      if (L) draw(ref.current, L, { cx: session.char.x, cz: session.char.z, scale: 1.6 });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <button className="rp-minimap" onClick={() => session.openMap()} title="Bản đồ công trường (M)" aria-label="Mở bản đồ công trường">
      <canvas ref={ref} width={200} height={200} />
      <span>M · Bản đồ</span>
    </button>
  );
}

export function WorldMap() {
  useSession();
  const ref = useRef();
  const L = mapLayers(session);
  const view = { cx: 0, cz: 0, scale: Math.min(820 / L.size.w, 560 / L.size.d) };
  useEffect(() => {
    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const LL = mapLayers(session);
      if (ref.current && LL) draw(ref.current, LL, view);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
  const click = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * ref.current.width;
    const z = ((e.clientY - r.top) / r.height) * ref.current.height;
    const wx = (x - ref.current.width / 2) / view.scale + view.cx;
    const wz = (z - ref.current.height / 2) / view.scale + view.cz;
    session.routeTo({ x: wx, z: wz, label: 'Điểm đánh dấu trên bản đồ' });
  };
  const o = session.objective();
  const keys = ['office', 'warehouse', 'hseBoard', 'drawing', 'gate'];
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Bản đồ công trường" onMouseDown={(e) => e.target === e.currentTarget && session.closeMap()}>
      <div className="modal__card panel rp-map">
        <header className="modal__head">
          <h2>Bản đồ công trường · {session.world.site.name}</h2>
          <button className="btn btn--icon" onClick={() => session.closeMap()} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="rp-map__body">
          <canvas ref={ref} width={840} height={580} onClick={click} title="Bấm để tìm tuyến đường được phép tới điểm này" />
          <aside>
            <h4>Nhiệm vụ</h4>
            {o?.target && (
              <button className="rp-chip is-active" onClick={() => (session.routeTo(o.target), session.closeMap())}>
                ★ {o.title}
              </button>
            )}
            <h4>Địa điểm</h4>
            {keys.map((k) => (
              <button key={k} className="rp-chip" onClick={() => (session.routeTo(k), session.closeMap())}>
                {FACILITY_ICONS[k]} {session.facility(k).label}
              </button>
            ))}
            <button className="rp-chip" onClick={() => (session.routeTo('guide'), session.closeMap())}>
              🤖 AI hướng dẫn
            </button>
            <h4>Chú giải</h4>
            <ul className="rp-legend">
              {DATA.safety.levels.map((l) => (
                <li key={l.id}>
                  <i style={{ background: l.color }} /> {l.label}
                </li>
              ))}
              <li>
                <i style={{ background: '#555B66' }} /> Đường được phép đi
              </li>
              <li>
                <i style={{ background: '#06B6D4' }} /> Tuyến đề xuất
              </li>
              <li>▲ Bạn · ● NPC · 🔵 AI hướng dẫn · ★ Mục tiêu</li>
            </ul>
            <p className="small muted">Bấm lên bản đồ để tìm tuyến. Tuyến luôn tránh công trình, hàng rào và vùng bạn chưa được phép vào.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
