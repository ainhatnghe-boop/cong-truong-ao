# SITE 3D · Công trường ảo

React 18 + three.js (@react-three/fiber, drei) + Vite. Gồm hai ứng dụng, chọn ở `src/Root.jsx`:
- **SITE 3D Studio** (`src/engine/` + `src/studio/`): nền tảng mô phỏng xây dựng tự do. Đây là nơi phát triển chính.
- **Công trường mẫu v0.1** (`src/data/`, `src/store/`, `src/scene/`, `src/ui/`, `src/App.jsx`): giữ nguyên.

**Bắt buộc đọc trước khi sửa:**
- `docs/01 RULE AGENTS.md`: quy tắc AI lập trình; **Phần C là kiến trúc engine Studio** (không engine riêng theo loại công trình; mọi lệnh qua `ProjectManager.apply`)
- `docs/02 RULE UXUI.md`: token, thành phần, cảnh 3D; mục 9 dành cho Studio
- `docs/03 RULE CHANGELOG.md`: cách ghi `CHANGELOG.md`
- `README.md`: tổng quan, cách thử, giới hạn, lộ trình

Lệnh:
- `npm run dev`: http://127.0.0.1:5200
- `npm run test:engine`: kiểm thử engine Studio bằng Node (phải đạt 100%)
- `npm run check:data`: kiểm tra dữ liệu Công trường mẫu
- `npm run check`: chạy cả ba (check:data + test:engine + build) trước khi bàn giao

Thêm loại công trình hoặc cấu kiện: viết generator (`src/engine/generators.js`) → khai báo ở `src/engine/ObjectRegistry.js` → thêm ca vào `scripts/test-engine.mjs`. Không cần sửa UI.
