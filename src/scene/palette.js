// Bảng màu cảnh 3D — đồng bộ với token CSS trong src/styles.css (xem docs/02 RULE UXUI.md)
// Hai bộ: ca ngày (DAY) và ca đêm (NIGHT). Màu vật liệu dùng chung lấy từ PAL.
export const PAL = {
  ink: '#14203A',
  sand: '#D9CFB8',
  pad: '#CFC6B0',
  asphalt: '#4A5263',
  roadLine: '#F5F1E6',
  sea: '#5FA8C8',
  seaDeep: '#3F86AA',
  concrete: '#C9C5BC',
  concreteDark: '#A9A49A',
  steel: '#8A94A6',
  steelDark: '#5F6879',
  primer: '#B4543A',
  craneYellow: '#F5B700',
  amber: '#F5A524',
  glass: '#86B6DA',
  white: '#F8F7F2',
  gravel: '#B8B2A4',
  grass: '#8DB36B',
  tree: '#4C8A4F',
  trunk: '#7A5A3A',
  rebar: '#8C5A3C',
  safety: '#FF7A1A',
};

export const SKY = {
  day: { bg: '#E6EEF2', fog: '#E6EEF2', hemiSky: '#FFFFFF', hemiGround: '#B9B2A2', hemi: 0.95, sun: 1.7, sunColor: '#FFF6E5' },
  night: { bg: '#0D1424', fog: '#0D1424', hemiSky: '#5B6B99', hemiGround: '#1A1F2E', hemi: 0.35, sun: 0.25, sunColor: '#9DB4FF' },
};
