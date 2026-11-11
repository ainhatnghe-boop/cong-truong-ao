# SITE 3D · Công trường ảo

Nền tảng mô phỏng xây dựng 3D chạy trên trình duyệt (React 18 + three.js / @react-three/fiber + Vite). Gồm hai ứng dụng:

| Ứng dụng | Thư mục | Mô tả |
|---|---|---|
| **SITE 3D Studio** (v0.2, mặc định) | `src/engine/`, `src/studio/` | Tạo dự án bất kỳ từ bản đồ trống. Công trình sinh từ **cấu kiện + tham số**. Tổ chức thi công, tổ đội, máy móc, chi phí. Lưu/mở dự án. |
| Công trường mẫu (v0.1) | `src/data/`, `src/scene/`, `src/ui/`… | Công trường LNG dựng sẵn (demo), dữ liệu JSON theo id. Giữ nguyên để tham khảo. |

> Thông số hình học chỉ phục vụ **gameplay**. Đây không phải kết quả thiết kế kết cấu đạt tiêu chuẩn kỹ thuật thực tế. Đơn giá và định mức là số liệu mô phỏng.

## Chạy

```bash
npm install
npm run dev          # http://127.0.0.1:5200
npm run check        # kiểm tra dữ liệu mẫu + kiểm thử engine + build
npm run test:engine  # 39 ca kiểm thử engine Studio (Node, không cần trình duyệt)
npm run build        # đóng gói vào dist/  →  npm run preview (http://127.0.0.1:5201)
```

## Thử nhanh Vertical Slice (khoảng 3 phút)

1. Màn hình bắt đầu → **＋ TẠO DỰ ÁN MỚI**. Chọn kích thước bản đồ (ví dụ 800 × 500 m), địa hình *Đồi núi*, ranh giới *Chữ L* → **Tạo dự án**. Dự án mở ra với bản đồ trống.
2. Tab **Thư viện** → **Toà nhà nhiều tầng** → bấm lên mặt đất. Panel phải hiện form thông số: kéo *Số tầng* lên 25 để thấy mô hình sinh lại ngay.
3. **Nhà xưởng khung thép** → đặt bên cạnh. Đổi *Chiều dài* từ 100 lên 150 m: số khung tự tăng từ 11 lên 16.
4. Kéo gizmo để di chuyển (W), xoay (E). **Ctrl+Z / Ctrl+Y** để hoàn tác/làm lại. **Ctrl+D** để nhân bản, **Delete** để xoá.
5. Thư viện → **Cẩu tháp** → đặt cạnh toà nhà. Vòng vàng là phạm vi cẩu; cấu kiện cao hơn 12 m mà không có cẩu thì làm rất chậm.
6. **▶ Vận hành** (chế độ Đơn giản tự khởi công và tự tuyển tổ), chọn **×10**. Công trình hiện dần từng cấu kiện; tiền, XP, ngày và nhật ký thay đổi theo.
7. **💾 Lưu** → tải lại trang → **📂 Mở dự án**: mọi thứ được khôi phục, kể cả tiến độ và địa hình đã chỉnh.

Hoặc bấm **🧪 Dự án kiểm thử** để mở sẵn toà 25 tầng và nhà thép 10 nhịp trên cùng công trường.

## Phím tắt

| Phím | Tác dụng | Phím | Tác dụng |
|---|---|---|---|
| Q / W | Chọn & di chuyển | Ctrl+Z / Ctrl+Y | Hoàn tác / làm lại |
| E | Xoay | Ctrl+D | Nhân bản |
| T | Bút địa hình | Ctrl+G / Ctrl+Shift+G | Nhóm / bỏ nhóm |
| G | Bật/tắt lưới | Delete | Xoá |
| F | Camera tới đối tượng | Ctrl+S | Lưu |
| P | Mặt bằng ↔ phối cảnh | Esc | Huỷ công cụ / bỏ chọn |
| Mũi tên | Bay camera | Space | (Vận hành) tạm dừng / tiếp tục |

## Kiến trúc

```
src/engine/                       ← THUẦN JS, không phụ thuộc UI/three → kiểm thử bằng Node
  materials.js                    vật liệu PBR + đơn giá/định mức mô phỏng; 5 kỹ năng tổ đội
  generators.js                   (params) → { parts, acts }: toà nhà, nhà thép, cầu, móng, cột, dầm, bồn…
  ObjectRegistry.js               34 loại đối tượng + lược đồ tham số (UI tự sinh form)
  ParametricGeometryEngine.js     build(node): cấu kiện, hoạt động (khối lượng/chi phí/công), hộp bao
  TerrainEngine.js                heightmap chia chunk, bút địa hình, đào đắp, ranh giới
  PlacementSystem.js              toạ độ thế giới theo phân cấp, bắt dính
  schema.js                       định dạng có version, validate / repair / migrate
  ProjectManager.js               mọi lệnh sửa + Undo/Redo (kiểm tra nhất quán trước khi nhận)
  ConstructionSimulationEngine.js tick(doc, sim) → sim: phân bổ tổ đội, máy, chi phí, bàn giao
  ResourceManager.js · EconomyManager.js · MissionManager.js · SaveManager.js
src/studio/                       ← React + three
  StudioApp.jsx                   bố cục, vòng lặp mô phỏng, phím tắt, tự lưu
  StudioScene.jsx                 cảnh 3D, gizmo, đặt đối tượng, bút địa hình, camera
  ObjectView.jsx                  vẽ cấu kiện bằng InstancedMesh (đã thi công / đang / chưa)
  TerrainView.jsx                 địa hình chunk + lưới vẽ bằng shader
  EquipmentModels.jsx             máy móc & công nhân có chuyển động
  StartScreen.jsx · StudioTopBar.jsx · LeftPanel.jsx · Inspector.jsx · BottomBar.jsx · editorStore.js
```

**Ý tưởng cốt lõi:** mọi công trình được sinh ra thành danh sách cấu kiện. Mỗi cấu kiện có vật liệu và thuộc một hoạt động. Engine mô phỏng, lưu/mở và chỉnh sửa chỉ làm việc với danh sách đó, nên không có engine riêng cho từng loại dự án. Thêm loại công trình mới gồm ba bước: viết generator, khai báo trong Registry, thêm ca kiểm thử. Chi tiết ở `docs/01 RULE AGENTS.md`, Phần C.

### Dữ liệu dự án (`ctao.project`, version 1)
- `doc` (thiết kế, có Undo/Redo): `meta`, `site` (kích thước, ranh giới, địa hình), `nodes` (id → `{ type, name, parentId, t:{p,ry}, params, locked, hidden }`).
- `sim` (vận hành, không Undo): ngày, tiền, XP, tổ đội, tiến độ từng nút, nhiệm vụ, nhật ký.
- Lưu trình duyệt: `localStorage` (`ctao.studio.*`). Xuất/nhập: tệp `.ctao.json`. Mở tệp cũ: migrate → tự sửa → kiểm tra.

## Quy tắc dự án
- `docs/01 RULE AGENTS.md`: quy tắc cho AI lập trình, nhân lực ảo (v0.1) và kiến trúc Studio (Phần C)
- `docs/02 RULE UXUI.md`: token, thành phần, cảnh 3D; mục 9 dành cho Studio
- `docs/03 RULE CHANGELOG.md`: cách ghi `CHANGELOG.md`

## Giới hạn hiện tại (v0.2.0)
- Chỉ xoay quanh trục đứng (Y). Đối tượng không nghiêng được.
- Bắt dính đối tượng căn theo hộp bao ngang. Chưa bắt dính theo điểm nút cấu kiện hay theo cao độ mặt trên.
- Gizmo chỉ thao tác một đối tượng mỗi lần. Chọn nhiều thì dùng nhóm.
- Địa hình chưa tự san nền dưới chân công trình. Đào/đắp chỉ tính khối lượng, chưa tính chi phí hay thời gian.
- Đường là đoạn thẳng, chưa vẽ tuyến cong hay đa điểm. Ranh giới chọn theo mẫu, chưa vẽ tay.
- Bản đồ lớn dùng chunk nhưng chưa có LOD và chưa tải/giải phóng theo vùng nhìn. Toàn bộ dự án nằm trong bộ nhớ.
- Máy móc đứng yên tại chỗ (có chuyển động tại chỗ), chưa tự chạy giữa các công trình. Công nhân chưa đi lại.
- Cấp độ hiện chỉ mở khoá 3 mục (cầu, xe bơm, máy đóng cọc).
- Chưa có model GLB/GLTF. Kiến trúc đã tách sẵn chỗ thay thế (`docs/01 RULE AGENTS.md` C5).
- Lưu trong trình duyệt bị giới hạn khoảng 5 MB. Dự án rất lớn nên dùng *Xuất tệp*.
- Đơn giá, định mức, năng suất là số liệu gameplay.

## Bước nâng cấp tiếp theo (đề xuất)
1. **Giai đoạn 2, hoàn thiện tham số:** công cụ thông minh của chế độ Đơn giản (vẽ khung chữ nhật để tạo nhà; đường đa điểm), lõi thang và ô mở sàn cho toà nhà, cầu trục và giằng cho nhà thép, bắt dính theo nút cấu kiện, chọn nhiều + gizmo nhóm.
2. **Giai đoạn 3, mô phỏng sâu:** kho vật tư (mua, tồn, giao nhận bằng xe ben/xe trộn chạy trên đường); máy và công nhân di chuyển giữa công trình; ràng buộc trình tự giữa các đối tượng (móng trước cột); Gantt và đường găng; đào đắp có chi phí và thời gian.
3. **Giai đoạn 4, mega project:** tải chunk theo vùng nhìn và LOD, Web Worker cho mô phỏng, thay mô hình bằng GLB, thời tiết, góc nhìn thứ nhất, lưu trên máy chủ để nhiều người cùng xem.
