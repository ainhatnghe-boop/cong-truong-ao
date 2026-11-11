import { useState } from 'react';
import { useUI, select } from '../store/ui.js';
import { db } from '../store/db.js';

export default function ActivityFeed() {
  const items = useUI((s) => s.activities);
  const [open, setOpen] = useState(true);
  return (
    <section className={`feed panel${open ? '' : ' is-collapsed'}`} aria-live="polite">
      <header>
        <h3>Nhật ký công trường</h3>
        <button className="btn btn--icon" onClick={() => setOpen(!open)} aria-label={open ? 'Thu gọn' : 'Mở rộng'}>
          {open ? '▾' : '▴'}
        </button>
      </header>
      {open && (
        <ul>
          {!items.length && <li className="muted">Đang chờ hoạt động đầu tiên…</li>}
          {items.slice(0, 8).map((it) => {
            const w = db.get(it.actorId);
            const ctr = db.get(w?.contractorId);
            return (
              <li key={it.id}>
                <time>{it.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
                <button className="feed__who" style={{ color: ctr?.color }} onClick={() => it.actorId && select(it.actorId)} aria-label={w ? `Xem ${w.title}` : 'Xem'}>
                  ●
                </button>
                <span>{it.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
