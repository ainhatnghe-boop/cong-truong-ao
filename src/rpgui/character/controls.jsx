// Thành phần giao diện dùng chung cho các tab tuỳ chỉnh nhân vật (thẻ có ảnh thu nhỏ, mẫu màu, thanh trượt, nhóm bị khoá)
export function Section({ title, hint, locked, lockText, children }) {
  return (
    <section className={`cc-sec${locked ? ' is-locked' : ''}`}>
      <header className="cc-sec__head">
        <h4>{title}</h4>
        {hint && !locked && <span className="cc-sec__hint">{hint}</span>}
      </header>
      {locked ? (
        <p className="cc-lock" role="note">
          🔒 {lockText}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

/** Lưới thẻ chọn 1 (role=radiogroup) */
export function Cards({ label, options, value, onChange, thumb, cols = 4, testid }) {
  return (
    <div className={`cc-cards cc-cards--${cols}`} role="radiogroup" aria-label={label} data-testid={testid}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} className={`cc-card${on ? ' is-on' : ''}`} onClick={() => onChange(o.id)} title={o.desc ?? o.label} data-id={o.id}>
            {thumb && <span className="cc-card__thumb">{thumb(o)}</span>}
            <span className="cc-card__label">{o.label}</span>
            {on && (
              <span className="cc-card__check" aria-hidden>
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Mẫu màu (options: [hex] hoặc [{id,label,color}]) */
export function Swatches({ label, options, value, onChange, testid }) {
  return (
    <div className="cc-swatches" role="radiogroup" aria-label={label} data-testid={testid}>
      {options.map((o) => {
        const id = typeof o === 'string' ? o : o.id;
        const color = typeof o === 'string' ? o : o.color;
        const name = typeof o === 'string' ? o : o.label;
        const on = id === value;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} aria-label={name} title={name} className={`cc-swatch${on ? ' is-on' : ''}`} style={{ '--c': color }} onClick={() => onChange(id)} data-id={id} />
        );
      })}
    </div>
  );
}

export function Slider({ label, min, max, step = 0.01, value, onChange, format = (v) => v.toFixed(2), testid }) {
  return (
    <label className="cc-slider">
      <span className="cc-slider__row">
        <span>{label}</span>
        <b>{format(value)}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testid} />
    </label>
  );
}

export const Badge = ({ tone = 'info', children }) => <span className={`cc-badge cc-badge--${tone}`}>{children}</span>;
