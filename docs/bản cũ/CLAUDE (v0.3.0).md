# SITE 3D · Công trường ảo

React 18 + three.js (@react-three/fiber, drei) + Vite. Gồm ba ứng dụng, chọn ở `src/Root.jsx`:
- **Công trường ảo · Nhập vai** (`src/rpg/` + `src/rpgui/`, mặc định): nhân vật, nghề, công trường, nhiệm vụ, an toàn mô phỏng.
- **SITE 3D Studio** (`src/engine/` + `src/studio/`): nền tảng xây dựng tự do. Nhập vai dùng lại engine này.
- **Công trường mẫu v0.1** (`src/data/`, `src/store/`, `src/scene/`, `src/ui/`, `src/App.jsx`): giữ nguyên.

**Bắt buộc đọc trước khi sửa:**
- `docs/01 RULE AGENTS.md`: Phần C là kiến trúc engine Studio; **Phần D là kiến trúc nhập vai** (không hardcode, dữ liệu cấu hình, quy tắc an toàn gameplay, trung thực về phạm vi mô phỏng).
- `docs/02 RULE UXUI.md`: mục 9 dành cho Studio, mục 10 dành cho nhập vai.
- `docs/03 RULE CHANGELOG.md`: cách ghi `CHANGELOG.md`.
- `README.md`: tổng quan, cách chơi, đã/chưa triển khai, kết quả kiểm thử.

Lệnh:
- `npm run dev`: http://127.0.0.1:5200
- `npm run test:rpg`: kiểm thử nhập vai bằng Node, gồm bot tự chơi (phải đạt 100%).
- `npm run test:engine`: kiểm thử engine Studio.
- `npm run check:data`: kiểm tra dữ liệu Công trường mẫu.
- `npm run check`: chạy tất cả + build trước khi bàn giao.

Thêm nghề / công trường / quy trình / nhiệm vụ / luật vùng an toàn: sửa `src/rpg/data/*.json` rồi chạy `npm run test:rpg`. Logic game thuần JS trong `src/rpg/`; UI chỉ gọi `GameSession`.
