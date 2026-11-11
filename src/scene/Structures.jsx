// ============================================================
//  Công trình theo tiến độ: mỗi "kind" của hạng mục (zones.json) có 1 bộ dựng.
//  Tham số p (0..1) = % thực tế suy ra từ tasks.json → phần đã xây hiện dần theo p.
//  Toạ độ trong component là toạ độ cục bộ (tâm hạng mục = 0,0). 1 đơn vị ≈ 1 m (mô hình thu nhỏ).
// ============================================================
import { Box, Cyl } from './Primitives.jsx';
import { PAL } from './palette.js';

export const step = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
const range = (n) => Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => i);

/** Vòng giàn giáo/sàn công tác đánh dấu vị trí đang thi công */
function WorkRing({ r, y }) {
  return (
    <mesh position={[0, y, 0]}>
      <cylinderGeometry args={[r, r, 0.9, 24, 1, true]} />
      <meshBasicMaterial color={PAL.amber} wireframe />
    </mesh>
  );
}

// ---------------- Bồn chứa LNG ----------------
function Tank({ p, params }) {
  const { r = 9, h = 11 } = params;
  const courses = 8;
  const ch = h / courses;
  const built = Math.floor(step(p, 0.08, 0.55) * courses);
  const wallH = built * ch;
  const roof = p >= 0.6;
  const roofDone = p >= 0.8;
  return (
    <group>
      <Cyl r={r + 1.2} h={0.6} position={[0, 0.3, 0]} color={PAL.concreteDark} seg={32} />
      {range(built).map((i) => (
        <Cyl key={i} r={r} h={ch} position={[0, 0.6 + ch * (i + 0.5), 0]} color={i % 2 ? PAL.concrete : '#D2CEC5'} seg={32} outline={i === built - 1} />
      ))}
      {built > 0 && built < courses && <WorkRing r={r + 0.35} y={0.6 + wallH} />}
      {/* tháp cầu thang đi kèm thành bồn */}
      {built > 0 && <Box size={[1.6, wallH + (roof ? 2.4 : 0.6), 1.6]} position={[r + 1.1, (wallH + (roof ? 2.4 : 0.6)) / 2 + 0.6, 0]} color={PAL.steel} />}
      {roof && (
        <mesh position={[0, 0.6 + h, 0]} scale={[1, 0.32, 1]} castShadow>
          <sphereGeometry args={[r, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={roofDone ? PAL.concrete : PAL.steel} flatShading roughness={0.8} />
        </mesh>
      )}
      {p >= 0.9 && (
        <group position={[0, 0.6 + h + r * 0.32, 0]}>
          <Box size={[4, 0.4, 3]} color={PAL.steelDark} />
          <Cyl r={0.35} h={2} position={[1.2, 1, 0]} color={PAL.white} />
          <Cyl r={0.35} h={2} position={[-1.2, 1, 0]} color={PAL.white} />
        </group>
      )}
    </group>
  );
}

// ---------------- Nhà tua-bin (khung thép khẩu độ lớn) ----------------
function Hall({ p, params, size }) {
  const { bays = 6, h = 11 } = params;
  const W = size[0] - 2;
  const D = size[1] - 2;
  const nCols = bays + 1;
  const cols = Math.ceil(step(p, 0.05, 0.4) * nCols * 2);
  const trusses = Math.ceil(step(p, 0.35, 0.55) * nCols);
  const roofLen = step(p, 0.5, 0.75) * W;
  const cladLen = step(p, 0.6, 0.92) * W;
  const xs = range(nCols).map((i) => -W / 2 + (W / bays) * i);
  return (
    <group>
      <Box size={[W + 1, 0.5, D + 1]} position={[0, 0.25, 0]} color={PAL.concreteDark} />
      {/* bệ máy tua-bin */}
      <Box size={[W * 0.5, 1.4, 3]} position={[-W * 0.1, 1.2, 0]} color={PAL.concrete} />
      {p > 0.85 && <Cyl r={1.3} h={7} rotation={[0, 0, Math.PI / 2]} position={[-W * 0.1, 3.2, 0]} color="#4B6584" seg={12} />}
      {range(cols).map((i) => {
        const side = i % 2 ? 1 : -1;
        const x = xs[Math.floor(i / 2)];
        return <Box key={i} size={[0.55, h, 0.55]} position={[x, h / 2 + 0.5, (side * D) / 2]} color={PAL.primer} />;
      })}
      {range(trusses).map((i) => (
        <Box key={i} size={[0.4, 0.9, D]} position={[xs[i], h + 0.5, 0]} color={PAL.primer} />
      ))}
      {trusses > 1 && <Box size={[xs[trusses - 1] - xs[0], 0.3, 0.3]} position={[(xs[0] + xs[trusses - 1]) / 2, h + 0.3, D / 2]} color={PAL.primer} outline={false} />}
      {roofLen > 0 && <Box size={[roofLen, 0.35, D + 0.8]} position={[-W / 2 + roofLen / 2, h + 1.1, 0]} color="#9FB3C8" />}
      {cladLen > 0 && (
        <>
          <Box size={[cladLen, h * 0.9, 0.25]} position={[-W / 2 + cladLen / 2, h * 0.45 + 0.5, D / 2 + 0.3]} color="#DCE3EA" />
          <Box size={[cladLen, h * 0.9, 0.25]} position={[-W / 2 + cladLen / 2, h * 0.45 + 0.5, -D / 2 - 0.3]} color="#DCE3EA" />
        </>
      )}
      {p >= 0.95 && range(3).map((i) => <Box key={i} size={[1.4, 1, 1.4]} position={[-W / 3 + i * (W / 3), h + 1.8, 0]} color={PAL.steel} />)}
    </group>
  );
}

// ---------------- Lò thu hồi nhiệt + ống khói ----------------
function Hrsg({ p, params, size }) {
  const { modules = 4, stackH = 30 } = params;
  const W = size[0] - 2;
  const D = size[1] - 3;
  const mods = Math.floor(step(p, 0.1, 0.7) * modules + 0.001);
  const segH = 5;
  const segs = Math.floor(step(p, 0.25, 0.95) * (stackH / segH));
  const mw = (W - 4) / modules;
  return (
    <group>
      <Box size={[W + 1, 0.5, D + 2]} position={[0, 0.25, 0]} color={PAL.concreteDark} />
      {range(mods).map((i) => (
        <Box key={i} size={[mw - 0.2, 9, D]} position={[-W / 2 + mw * (i + 0.5), 5, 0]} color={i === mods - 1 && mods < modules ? PAL.steel : '#9AA3AE'} />
      ))}
      {mods > 0 && <Box size={[2.5, 4, D * 0.6]} position={[-W / 2 - 0.6, 3, 0]} color={PAL.steelDark} />}
      <Cyl r={2.2} h={1} position={[W / 2 - 1.5, 1, 0]} color={PAL.concrete} seg={14} />
      {range(segs).map((i) => (
        <Cyl key={i} r={1.5} h={segH} position={[W / 2 - 1.5, 1.5 + segH * (i + 0.5), 0]} seg={14} color={segs === stackH / segH && i >= segs - 1 ? '#D94F3D' : '#B8BEC6'} outline={i === segs - 1} />
      ))}
      {segs > 0 && segs < stackH / segH && <WorkRing r={1.9} y={1.5 + segH * segs} />}
    </group>
  );
}

// ---------------- Trạm biến áp 500kV ----------------
function Substation({ p, params, size }) {
  const { bays = 5 } = params;
  const W = size[0] - 2;
  const D = size[1] - 2;
  const gantries = Math.ceil(step(p, 0.08, 0.55) * bays);
  const trafos = Math.floor(step(p, 0.4, 0.8) * 2 + 0.001);
  const breakers = Math.floor(step(p, 0.5, 0.9) * bays * 3);
  const gx = (i) => -W / 2 + 3 + ((W - 8) / (bays - 1)) * i;
  return (
    <group>
      <Box size={[W, 0.2, D]} position={[0, 0.1, 0]} color={PAL.gravel} outline={false} />
      {p > 0.15 && <Box size={[6, 3.2, 4]} position={[W / 2 - 3.5, 1.6, D / 2 - 2.5]} color={PAL.white} />}
      {range(gantries).map((i) => (
        <group key={i} position={[gx(i), 0, -D / 2 + 3]}>
          <Box size={[0.5, 9, 0.5]} position={[0, 4.5, -2]} color={PAL.steel} />
          <Box size={[0.5, 9, 0.5]} position={[0, 4.5, 2]} color={PAL.steel} />
          <Box size={[0.5, 0.5, 4.6]} position={[0, 9, 0]} color={PAL.steel} />
          {p >= 0.92 && <Box size={[0.06, 0.06, D - 6]} position={[0, 8.5, (D - 6) / 2]} color={PAL.ink} outline={false} shadow={false} />}
        </group>
      ))}
      {range(trafos).map((i) => (
        <group key={i} position={[-W / 4 + i * (W / 3.2), 0, D / 2 - 4]}>
          <Box size={[4, 3.4, 2.6]} position={[0, 1.9, 0]} color="#7D8A99" />
          <Box size={[4.4, 2.2, 0.4]} position={[0, 1.7, 1.6]} color={PAL.steelDark} />
          {[-1.2, 0, 1.2].map((x) => (
            <Cyl key={x} r={0.16} h={2.2} position={[x, 4.7, 0]} color="#C26B4A" seg={8} />
          ))}
        </group>
      ))}
      {range(breakers).map((i) => {
        const b = i % bays;
        const k = Math.floor(i / bays);
        return (
          <group key={i} position={[gx(b), 0, -D / 2 + 7 + k * 2.4]}>
            <Box size={[0.8, 1.6, 0.8]} position={[0, 0.8, 0]} color={PAL.steel} />
            <Cyl r={0.2} h={2} position={[0, 2.6, 0]} color="#C26B4A" seg={8} />
          </group>
        );
      })}
    </group>
  );
}

// ---------------- Cầu cảng nhập LNG ----------------
function Jetty({ p, params, size }) {
  const { piles = 10 } = params;
  const L = size[1];
  const n = Math.ceil(step(p, 0, 0.55) * piles);
  const deck = step(p, 0.3, 0.85) * (L - 6);
  const zOf = (i) => L / 2 - 1 - ((L - 4) / (piles - 1)) * i; // từ bờ (+z) ra biển (-z)
  return (
    <group>
      {range(n).map((i) => (
        <group key={i} position={[0, 0, zOf(i)]}>
          <Cyl r={0.35} h={4} position={[-2, -1.8, 0]} color={PAL.steelDark} seg={8} />
          <Cyl r={0.35} h={4} position={[2, -1.8, 0]} color={PAL.steelDark} seg={8} />
        </group>
      ))}
      {deck > 0 && <Box size={[5.6, 0.6, deck]} position={[0, -0.25, L / 2 - deck / 2]} color={PAL.concrete} />}
      {p >= 0.8 && <Cyl r={0.35} h={deck} rotation={[Math.PI / 2, 0, 0]} position={[1.9, 0.4, L / 2 - deck / 2]} color={PAL.white} />}
      {p >= 0.85 && <Box size={[12, 0.8, 8]} position={[0, -0.35, -L / 2 + 2]} color={PAL.concrete} />}
      {p >= 0.93 &&
        [-3, 0, 3].map((x) => (
          <group key={x} position={[x, 0, -L / 2 + 1]}>
            <Box size={[0.6, 5, 0.6]} position={[0, 2.5, 0]} color={PAL.white} />
            <Box size={[0.4, 0.4, 4]} position={[0, 5, -1.8]} color={PAL.white} />
          </group>
        ))}
    </group>
  );
}

// ---------------- Pipe rack ----------------
function PipeRack({ p, params, size }) {
  const { bents = 12 } = params;
  const L = size[0] - 2;
  const n = Math.ceil(step(p, 0.05, 0.6) * bents);
  const xOf = (i) => -L / 2 + (L / (bents - 1)) * i;
  const pipeLen = step(p, 0.65, 1) * L;
  return (
    <group>
      {range(bents).map((i) => (
        <Box key={`f${i}`} size={[1.2, 0.4, 4.4]} position={[xOf(i), 0.2, 0]} color={PAL.concreteDark} outline={false} />
      ))}
      {range(n).map((i) => (
        <group key={i} position={[xOf(i), 0, 0]}>
          <Box size={[0.4, 6.4, 0.4]} position={[0, 3.2, -1.8]} color={PAL.primer} />
          <Box size={[0.4, 6.4, 0.4]} position={[0, 3.2, 1.8]} color={PAL.primer} />
          <Box size={[0.4, 0.35, 4]} position={[0, 3.6, 0]} color={PAL.primer} outline={false} />
          <Box size={[0.4, 0.35, 4]} position={[0, 6.2, 0]} color={PAL.primer} outline={false} />
        </group>
      ))}
      {n > 1 && <Box size={[xOf(n - 1) - xOf(0), 0.3, 0.3]} position={[(xOf(0) + xOf(n - 1)) / 2, 6.2, 1.8]} color={PAL.primer} outline={false} />}
      {n > 1 && <Box size={[xOf(n - 1) - xOf(0), 0.3, 0.3]} position={[(xOf(0) + xOf(n - 1)) / 2, 6.2, -1.8]} color={PAL.primer} outline={false} />}
      {pipeLen > 0 &&
        [
          [-1, 6.75, PAL.white, 0.4],
          [0.2, 6.7, PAL.white, 0.35],
          [1.2, 6.65, PAL.safety, 0.25],
          [-0.6, 4.1, '#9CA3AF', 0.3],
        ].map(([z, y, c, r]) => <Cyl key={z} r={r} h={pipeLen} rotation={[0, 0, Math.PI / 2]} position={[-L / 2 + pipeLen / 2, y, z]} color={c} seg={8} />)}
    </group>
  );
}

// ---------------- Nhà cao tầng (nhà điều hành) ----------------
function Tower({ p, params, size }) {
  const { floors = 9 } = params;
  const fh = 3.2;
  const W = size[0] - 3;
  const D = size[1] - 2.5;
  const done = Math.floor(step(p, 0.08, 0.85) * floors);
  const facade = Math.max(0, done - 2);
  return (
    <group>
      <Box size={[W + 2, 0.6, D + 2]} position={[0, 0.3, 0]} color={PAL.concreteDark} />
      {done > 0 && <Box size={[3, Math.min(floors, done + 1) * fh, 3]} position={[W / 4, (Math.min(floors, done + 1) * fh) / 2 + 0.6, 0]} color={PAL.concrete} />}
      {range(done).map((i) => (
        <group key={i} position={[0, 0.6 + i * fh, 0]}>
          <Box size={[W, 0.3, D]} position={[0, fh, 0]} color={PAL.concrete} />
          {[
            [-W / 2 + 0.3, -D / 2 + 0.3],
            [W / 2 - 0.3, -D / 2 + 0.3],
            [-W / 2 + 0.3, D / 2 - 0.3],
            [W / 2 - 0.3, D / 2 - 0.3],
          ].map(([x, z]) => (
            <Box key={`${x}${z}`} size={[0.5, fh, 0.5]} position={[x, fh / 2, z]} color={PAL.concreteDark} outline={false} />
          ))}
          {i < facade && <Box size={[W - 0.3, fh - 0.35, D - 0.3]} position={[0, fh / 2, 0]} color={PAL.glass} />}
        </group>
      ))}
      {done > 0 && done < floors && (
        <group position={[0, 0.6 + done * fh, 0]}>
          <Box size={[W, 0.15, D]} position={[0, 0.3, 0]} color={PAL.amber} outline={false} />
          {range(6).map((i) => (
            <Box key={i} size={[0.08, 1.4, 0.08]} position={[-W / 2 + 0.6 + i * ((W - 1.2) / 5), 1, D / 2 - 0.4]} color={PAL.rebar} outline={false} />
          ))}
        </group>
      )}
      {done >= floors && <Box size={[W * 0.4, 2, D * 0.5]} position={[0, 0.6 + floors * fh + 1.1, 0]} color={PAL.white} />}
    </group>
  );
}

// ---------------- Công trình phụ trợ (luôn hoàn thiện) ----------------
function Office({ size }) {
  const cols = 4;
  const w = (size[0] - 4) / cols;
  return (
    <group>
      {range(cols * 2).map((i) => {
        const c = i % cols;
        const lv = Math.floor(i / cols);
        return <Box key={i} size={[w - 0.3, 2.6, 4]} position={[-size[0] / 2 + 2 + w * (c + 0.5), 1.3 + lv * 2.65, 0.6]} color={lv ? PAL.white : '#DCE6F5'} />;
      })}
      <Box size={[size[0] - 4, 0.15, 1.4]} position={[0, 2.65, -2.1]} color={PAL.steel} />
      <Box size={[1.2, 2.6, 2.4]} position={[size[0] / 2 - 1.2, 1.3, -1.6]} color={PAL.steelDark} />
      <Cyl r={0.08} h={7} position={[-size[0] / 2 + 0.8, 3.5, -2.8]} color={PAL.steel} outline={false} />
      <Box size={[1.6, 1, 0.05]} position={[-size[0] / 2 + 1.6, 6.4, -2.8]} color="#DA251D" outline={false} />
    </group>
  );
}

function Canteen({ size }) {
  const W = size[0] - 1;
  const D = size[1] - 1;
  return (
    <group>
      <Box size={[W, 0.2, D]} position={[0, 0.1, 0]} color={PAL.concrete} outline={false} />
      {[
        [-W / 2 + 0.3, -D / 2 + 0.3],
        [W / 2 - 0.3, -D / 2 + 0.3],
        [-W / 2 + 0.3, D / 2 - 0.3],
        [W / 2 - 0.3, D / 2 - 0.3],
        [0, -D / 2 + 0.3],
        [0, D / 2 - 0.3],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} size={[0.3, 3.4, 0.3]} position={[x, 1.7, z]} color={PAL.steel} outline={false} />
      ))}
      <Box size={[W + 0.8, 0.3, D + 0.8]} position={[0, 3.5, 0]} color="#2E7D6B" />
      {range(6).map((i) => (
        <group key={i} position={[-5 + i * 2, 0, 0]}>
          <Box size={[1.4, 0.75, 2.2]} position={[0, 0.55, 0]} color={PAL.white} />
          <Box size={[1.4, 0.45, 0.35]} position={[0, 0.32, -1.6]} color="#3A7BD5" outline={false} />
          <Box size={[1.4, 0.45, 0.35]} position={[0, 0.32, 1.6]} color="#3A7BD5" outline={false} />
        </group>
      ))}
      <Cyl r={0.9} h={2.4} position={[W / 2 + 1.4, 3, -1]} color="#6BA4D9" />
    </group>
  );
}

function Laydown({ size }) {
  const containers = ['#2563EB', '#DC2626', '#16A34A', '#F59E0B', '#7C3AED', '#0E7490'];
  return (
    <group>
      <Box size={[size[0], 0.12, size[1]]} position={[0, 0.06, 0]} color={PAL.gravel} outline={false} />
      {containers.map((c, i) => (
        <Box key={c} size={[6, 2.5, 2.4]} position={[-7 + (i % 3) * 6.6, 1.3 + Math.floor(i / 3) * 2.55, -4]} color={c} />
      ))}
      {range(3).map((k) => (
        <group key={k} position={[-6 + k * 6, 0, 2.5]}>
          {range(6).map((i) => (
            <Cyl key={i} r={0.38} h={5} rotation={[Math.PI / 2, 0, 0]} position={[-1.2 + (i % 3) * 0.8, 0.45 + Math.floor(i / 3) * 0.72, 0]} color={k === 1 ? PAL.primer : PAL.steel} seg={8} outline={false} />
          ))}
        </group>
      ))}
      {range(4).map((i) => (
        <Box key={i} size={[5, 0.25, 0.2]} position={[7.5, 0.2 + i * 0.27, 2 + (i % 2) * 0.3]} color={PAL.rebar} outline={false} />
      ))}
    </group>
  );
}

function Gate({ size }) {
  return (
    <group>
      <Box size={[3, 2.8, 3]} position={[-4, 1.4, 0]} color={PAL.white} />
      <Box size={[3.6, 0.3, 3.6]} position={[-4, 2.95, 0]} color="#1F5EFF" />
      <Box size={[0.4, 1.1, 0.4]} position={[-2.2, 0.55, -1]} color={PAL.steelDark} />
      <Box size={[5, 0.18, 0.18]} position={[0.4, 1, -1]} color="#DC2626" outline={false} />
      <Box size={[3.4, 2, 0.2]} position={[4, 2.2, -1.5]} color="#16A34A" />
      <Box size={[0.15, 1.2, 0.15]} position={[3, 0.6, -1.5]} color={PAL.steel} outline={false} />
      <Box size={[0.15, 1.2, 0.15]} position={[5, 0.6, -1.5]} color={PAL.steel} outline={false} />
      <Box size={[size[0], 0.05, 0.4]} position={[0, 0.03, 1.5]} color={PAL.roadLine} outline={false} />
    </group>
  );
}

function Batching() {
  return (
    <group>
      <Box size={[11, 0.3, 9]} position={[0, 0.15, 0]} color={PAL.concrete} outline={false} />
      {[-3.4, -1.2, 1].map((x) => (
        <group key={x} position={[x, 0, -2.6]}>
          <Cyl r={0.95} h={6} position={[0, 5.5, 0]} color={PAL.white} seg={12} />
          <mesh position={[0, 2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
            <coneGeometry args={[0.95, 1.6, 12]} />
            <meshStandardMaterial color={PAL.steel} flatShading />
          </mesh>
          <Box size={[0.15, 2, 0.15]} position={[0.7, 1, 0.7]} color={PAL.steelDark} outline={false} />
        </group>
      ))}
      <Box size={[4, 4, 3.4]} position={[3, 2, -1.8]} color="#E4572E" />
      <Box size={[1, 0.4, 9]} position={[3.2, 3.2, 2.6]} rotation={[0.45, 0, 0]} color={PAL.steel} />
      {[-3, 0].map((x) => (
        <Box key={x} size={[2.6, 1.2, 2.6]} position={[x, 0.6, 2.4]} color="#B8A88A" />
      ))}
    </group>
  );
}

export const BUILDERS = {
  tank: Tank,
  hall: Hall,
  hrsg: Hrsg,
  substation: Substation,
  jetty: Jetty,
  piperack: PipeRack,
  tower: Tower,
  office: Office,
  canteen: Canteen,
  laydown: Laydown,
  gate: Gate,
  batching: Batching,
};
