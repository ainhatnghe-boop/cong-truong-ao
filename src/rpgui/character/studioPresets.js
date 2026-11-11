// Thiết lập ánh sáng & chất lượng cho studio nhân vật (tách riêng để UI không phải nạp three.js)
export const LIGHT_PRESETS = {
  daylight: { label: 'Ánh sáng ban ngày', bg: '#B9CCDD', fog: '#B9CCDD', key: ['#FFF3DD', 2.6], fill: ['#BFD8FF', 0.7], rim: ['#FFFFFF', 1.2], hemi: ['#EAF3FF', '#8B7F68', 0.65], ground: '#8E8676' },
  industrial: { label: 'Studio công nghiệp', bg: '#13253B', fog: '#13253B', key: ['#FFE3B0', 2.4], fill: ['#7FA8D9', 0.55], rim: ['#7CC0FF', 2.0], hemi: ['#3A5576', '#0B1726', 0.45], ground: '#263544' },
  site: { label: 'Công trường', bg: '#9DA9B3', fog: '#A7A396', key: ['#FFD9A0', 2.3], fill: ['#C9D6E2', 0.6], rim: ['#FFBF36', 1.3], hemi: ['#E1E6EA', '#6F6250', 0.6], ground: '#7B7363' },
};

export const QUALITY = {
  low: { label: 'Thấp', dpr: [1, 1], shadows: false, env: false, backdrop: 1 },
  medium: { label: 'Trung bình', dpr: [1, 1.5], shadows: true, shadowMap: 1024, env: true, backdrop: 2 },
  high: { label: 'Cao', dpr: [1, 2], shadows: true, shadowMap: 2048, env: true, backdrop: 3 },
};
