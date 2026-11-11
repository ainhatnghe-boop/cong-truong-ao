// Ảnh thu nhỏ SVG (vẽ bằng mã, không cần file ảnh) cho thẻ lựa chọn trong màn hình tạo nhân vật.
const SK = '#D9A57B';
const Svg = ({ children, vb = '0 0 64 64' }) => (
  <svg viewBox={vb} width="100%" height="100%" aria-hidden focusable="false">
    {children}
  </svg>
);

export function BuildThumb({ girth = 1 }) {
  const w = 12 * girth;
  return (
    <Svg>
      <circle cx="32" cy="12" r="6" fill={SK} />
      <path d={`M${32 - w} 21 Q32 18 ${32 + w} 21 L${32 + w * 0.8} 42 L${32 - w * 0.8} 42 Z`} fill="#5B8CC9" />
      <rect x={32 - w * 0.75} y="42" width={w * 0.65} height="18" rx="2" fill="#2F3A4A" />
      <rect x={32 + w * 0.1} y="42" width={w * 0.65} height="18" rx="2" fill="#2F3A4A" />
    </Svg>
  );
}

export function FrameThumb({ frame }) {
  const f = frame === 'female';
  return (
    <Svg>
      <circle cx="32" cy="13" r="7" fill={SK} />
      {f && <path d="M24 12 Q24 3 32 4 Q40 3 40 12 L41 22 Q36 18 32 18 Q28 18 23 22 Z" fill="#2B211B" />}
      <path d={f ? 'M22 24 Q32 21 42 24 L39 36 L42 46 L22 46 L25 36 Z' : 'M19 24 Q32 20 45 24 L42 46 L22 46 Z'} fill="#5B8CC9" />
      <rect x="24" y="46" width="7" height="15" rx="2" fill="#2F3A4A" />
      <rect x="33" y="46" width="7" height="15" rx="2" fill="#2F3A4A" />
    </Svg>
  );
}

const FACE = { oval: [13, 17], round: [16, 16], square: [15, 16], long: [12, 19] };
export function FaceThumb({ shape = 'oval' }) {
  const [rx, ry] = FACE[shape] ?? FACE.oval;
  return (
    <Svg>
      {shape === 'square' ? <rect x={32 - rx} y={32 - ry} width={rx * 2} height={ry * 2} rx="7" fill={SK} /> : <ellipse cx="32" cy="32" rx={rx} ry={ry} fill={SK} />}
      <circle cx="27" cy="30" r="1.6" fill="#1E1A17" />
      <circle cx="37" cy="30" r="1.6" fill="#1E1A17" />
      <path d="M28 40 Q32 42 36 40" stroke="#8A4B3A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function EyesThumb({ opt }) {
  const s = opt?.size ?? 1;
  const q = opt?.squint ?? 1;
  return (
    <Svg>
      {[22, 42].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="32" rx={8 * s} ry={5 * s * q} fill="#FFFFFF" stroke="#A97A5C" strokeWidth="1" />
          <circle cx={x} cy="32" r={3.4 * s * Math.min(1, q + 0.2)} fill="#3B2A20" />
          <path d={`M${x - 8} ${24 - 2 * q} Q${x} ${20 - 2 * q} ${x + 8} ${24 - 2 * q}`} stroke="#2B211B" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </Svg>
  );
}

export function NoseThumb({ scale = [1, 1, 1] }) {
  const [w, h, d] = scale;
  return (
    <Svg>
      <path d={`M32 ${32 - 16 * h} Q${32 + 3 * d} 32 ${32 + 9 * w} ${38 + 4 * h} Q32 ${42 + 3 * h} ${32 - 9 * w} ${38 + 4 * h} Q${32 - 3 * d} 32 32 ${32 - 16 * h}`} fill={SK} stroke="#A97A5C" strokeWidth="1.4" />
    </Svg>
  );
}

const MOUTH = {
  neutral: 'M20 34 Q32 36 44 34',
  smile: 'M18 30 Q32 44 46 30',
  serious: 'M20 35 L44 35',
  full: 'M18 33 Q32 26 46 33 Q32 44 18 33',
};
export function MouthThumb({ id }) {
  return (
    <Svg>
      <path d={MOUTH[id] ?? MOUTH.neutral} stroke="#8A4B3A" strokeWidth="3" fill={id === 'full' ? '#B5655A' : 'none'} strokeLinecap="round" />
    </Svg>
  );
}

const BEARD = {
  none: null,
  stubble: <path d="M18 36 Q32 56 46 36 L46 42 Q32 60 18 42 Z" fill="#3B2A20" opacity="0.35" />,
  mustache: <path d="M24 40 Q32 36 40 40 Q32 43 24 40 Z" fill="#2B211B" />,
  beard: <path d="M17 32 Q16 56 32 58 Q48 56 47 32 L44 34 Q40 48 32 48 Q24 48 20 34 Z" fill="#2B211B" />,
};
export function BeardThumb({ id }) {
  return (
    <Svg>
      <ellipse cx="32" cy="34" rx="15" ry="19" fill={SK} />
      {BEARD[id]}
    </Svg>
  );
}

const HAIR = {
  short: 'M17 30 Q16 12 32 12 Q48 12 47 30 Q44 20 32 20 Q20 20 17 30 Z',
  buzz: 'M18 28 Q18 14 32 14 Q46 14 46 28 Q44 22 32 21 Q20 22 18 28 Z',
  side: 'M16 32 Q14 10 34 11 Q50 12 48 30 Q44 18 30 22 Q22 22 16 32 Z',
  curly: 'M14 32 Q10 22 16 16 Q18 8 28 9 Q34 4 42 9 Q52 12 50 22 Q54 30 48 33 Q46 20 32 20 Q20 20 16 33 Z',
  long: 'M15 34 Q14 10 32 11 Q50 10 49 34 L50 48 Q46 40 46 30 Q42 20 32 20 Q22 20 18 30 Q18 40 14 48 Z',
  bun: 'M17 30 Q16 12 32 12 Q48 12 47 30 Q44 20 32 20 Q20 20 17 30 Z M26 10 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0',
  bald: '',
};
export function HairThumb({ id, color = '#1E1A17' }) {
  return (
    <Svg>
      <ellipse cx="32" cy="34" rx="15" ry="18" fill={SK} />
      {HAIR[id] && <path d={HAIR[id]} fill={color} />}
    </Svg>
  );
}

/** Áo + quần theo kiểu trang phục */
export function OutfitThumb({ def, top, bottom }) {
  const t = def.top.style;
  const short = def.top.sleeves === 'short';
  const b = def.bottom.style === 'coverall' ? top : bottom;
  return (
    <Svg>
      {/* tay áo */}
      <path d={short ? 'M14 18 L22 14 L24 28 L16 30 Z' : 'M14 18 L22 14 L22 40 L15 40 Z'} fill={top} />
      <path d={short ? 'M50 18 L42 14 L40 28 L48 30 Z' : 'M50 18 L42 14 L42 40 L49 40 Z'} fill={top} />
      {short && (
        <>
          <rect x="15" y="30" width="6" height="10" rx="2" fill={SK} />
          <rect x="43" y="30" width="6" height="10" rx="2" fill={SK} />
        </>
      )}
      {/* thân */}
      <path d="M22 13 Q32 10 42 13 L42 40 L22 40 Z" fill={top} />
      {(t === 'jacket' || t === 'workjacket') && def.top.inner && <path d="M28 12 L32 26 L36 12 Z" fill={def.top.inner} />}
      {t === 'jacket' && <path d="M28 12 L30 40 M36 12 L34 40" stroke="#00000033" strokeWidth="1.4" />}
      {t === 'workjacket' && <path d="M32 13 L32 40" stroke="#00000044" strokeWidth="1.6" />}
      {t === 'coverall' && <path d="M32 13 L32 44" stroke="#00000044" strokeWidth="1.6" />}
      {(t === 'shirt' || t === 'polo') && <path d="M27 12 L32 17 L37 12" stroke="#00000033" strokeWidth="1.6" fill="none" />}
      {t === 'shirt' && [20, 26, 32].map((y) => <circle key={y} cx="32" cy={y} r="0.9" fill="#00000055" />)}
      {/* quần */}
      <path d="M22 40 L42 40 L42 60 L34 60 L32 46 L30 60 L22 60 Z" fill={b} />
      {def.bottom.style === 'cargo' && (
        <>
          <rect x="22.5" y="47" width="5" height="5" rx="1" fill="#00000030" />
          <rect x="36.5" y="47" width="5" height="5" rx="1" fill="#00000030" />
        </>
      )}
    </Svg>
  );
}

export function HelmetThumb({ color = '#F5F7FA', style = 'cap' }) {
  return (
    <Svg>
      <path d="M14 38 Q14 14 32 14 Q50 14 50 38 Z" fill={color} stroke="#00000033" />
      <path d="M32 14 L32 38" stroke="#00000022" strokeWidth="3" />
      {style === 'full' ? <ellipse cx="32" cy="39" rx="26" ry="4" fill={color} stroke="#00000033" /> : <path d="M14 38 L50 38 L58 42 L14 41 Z" fill={color} stroke="#00000033" />}
    </Svg>
  );
}

export function SwatchDot({ color }) {
  return <span className="cc-dot" style={{ background: color }} />;
}
