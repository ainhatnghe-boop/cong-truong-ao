// ============================================================
//  Thư viện vật liệu (PBR) + đơn giá & định mức mô phỏng.
//  price: triệu đồng / m³ hình học ; labor: tổ-ngày / m³ (1 tổ = 10 người).
//  Đây là số liệu GAMEPLAY để mô phỏng, không phải định mức/đơn giá thực tế.
// ============================================================
export const MATERIALS = {
  concrete: { label: 'Bê tông cốt thép', color: '#B8B4AB', roughness: 0.92, metalness: 0, price: 3.2, labor: 0.12 },
  leanConcrete: { label: 'Bê tông lót / móng', color: '#A6A196', roughness: 0.95, metalness: 0, price: 2.2, labor: 0.08 },
  steel: { label: 'Thép kết cấu', color: '#6F7C8C', roughness: 0.42, metalness: 0.78, price: 190, labor: 1.6 },
  primer: { label: 'Thép sơn chống gỉ', color: '#9C4A33', roughness: 0.6, metalness: 0.35, price: 195, labor: 1.6 },
  glass: { label: 'Vách kính', color: '#8EC0E2', roughness: 0.06, metalness: 0.2, opacity: 0.42, price: 60, labor: 0.8 },
  brick: { label: 'Tường gạch', color: '#B0644A', roughness: 0.96, metalness: 0, price: 1.8, labor: 0.45 },
  plaster: { label: 'Tường trát sơn', color: '#E6E1D6', roughness: 0.9, metalness: 0, price: 2.0, labor: 0.5 },
  roofSheet: { label: 'Tôn lợp / vách tôn', color: '#9CB0C4', roughness: 0.48, metalness: 0.6, price: 30, labor: 0.35 },
  asphalt: { label: 'Bê tông nhựa', color: '#3A3E45', roughness: 0.96, metalness: 0, price: 2.6, labor: 0.05 },
  gravel: { label: 'Cấp phối đá dăm', color: '#A39C8E', roughness: 1, metalness: 0, price: 0.45, labor: 0.02 },
  paint: { label: 'Sơn kẻ vạch', color: '#F3F1EA', roughness: 0.7, metalness: 0, price: 8, labor: 0.6 },
  pipe: { label: 'Ống thép công nghệ', color: '#C8CDD4', roughness: 0.32, metalness: 0.82, price: 210, labor: 2.4 },
  tray: { label: 'Máng cáp mạ kẽm', color: '#A9AFB8', roughness: 0.4, metalness: 0.75, price: 160, labor: 2.0 },
  mep: { label: 'Thiết bị cơ điện', color: '#7F8D9B', roughness: 0.5, metalness: 0.5, price: 420, labor: 3.0 },
  insulation: { label: 'Bảo ôn', color: '#E9ECEF', roughness: 0.85, metalness: 0, price: 25, labor: 0.8 },
  // vật liệu chỉ để hiển thị máy móc (không tính chi phí)
  machine: { label: 'Sơn máy', color: '#E5A91A', roughness: 0.55, metalness: 0.3, price: 0, labor: 0 },
  machineDark: { label: 'Khung máy', color: '#30353D', roughness: 0.7, metalness: 0.4, price: 0, labor: 0 },
};

/** Tổ đội (kỹ năng). wage: triệu đồng / tổ / ngày; hire: phí tuyển một tổ */
export const SKILLS = {
  civil: { label: 'Đất, cọc & hạ tầng', color: '#A16207', wage: 9, hire: 40 },
  concrete: { label: 'Bê tông cốt thép', color: '#64748B', wage: 11, hire: 50 },
  steel: { label: 'Kết cấu thép', color: '#B45309', wage: 13, hire: 60 },
  envelope: { label: 'Bao che & hoàn thiện', color: '#0E7490', wage: 10, hire: 45 },
  mep: { label: 'Cơ điện & đường ống', color: '#7C3AED', wage: 14, hire: 65 },
};
