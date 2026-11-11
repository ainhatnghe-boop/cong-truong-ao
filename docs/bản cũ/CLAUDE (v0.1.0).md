# Công trường ảo siêu dự án (SITE 3D)

Công trường 3D của một siêu dự án (demo: Trung tâm Điện khí LNG): React 18 + three.js (@react-three/fiber, drei) + Vite.

**Bắt buộc đọc trước khi sửa:**
- `docs/01 RULE AGENTS.md`: quy tắc cho AI lập trình và cho nhân lực ảo
- `docs/02 RULE UXUI.md`: token, thành phần, cảnh 3D, responsive
- `docs/03 RULE CHANGELOG.md`: cách ghi `CHANGELOG.md`

Lệnh:
- `npm run dev`: chạy thử tại http://127.0.0.1:5200
- `npm run build`: đóng gói vào `dist/` (mở bằng `npm run preview` → http://127.0.0.1:5201)
- `npm run check:data`: kiểm tra toàn vẹn dữ liệu (chạy sau mọi thay đổi trong `src/data/`)

Dữ liệu nằm ở `src/data/*.json`, cấu trúc khai báo trong `src/data/schema.json`, gọi bằng id qua `db.get(id)`, `db.list(table, pred)`, `db.update(id, patch)` (`src/store/db.js`).
% tiến độ hạng mục/gói/dự án được tính từ `tasks.json` (`src/store/metrics.js`). Sửa % của TSK thì mô hình 3D thay đổi theo.
