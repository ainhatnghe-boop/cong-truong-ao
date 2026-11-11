// Khung cửa sổ dùng chung: đóng bằng Esc, nút ✕ hoặc bấm nền
import { useEffect } from 'react';
import { openModal } from '../store/ui.js';

export default function Modal({ title, children, wide, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && openModal(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && openModal(null)}>
      <div className={`modal__card panel${wide ? ' modal__card--wide' : ''}`}>
        <header className="modal__head">
          <h2>{title}</h2>
          <button className="btn btn--icon" onClick={() => openModal(null)} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}
