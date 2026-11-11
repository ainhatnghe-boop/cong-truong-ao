# 01 · RULE AGENTS

Quy tắc cho **hai loại agent** trong dự án Công trường ảo:

- **Phần A**: AI agent lập trình (Claude Code, Copilot…) khi sửa mã nguồn.
- **Phần B**: Nhân lực ảo (công nhân, kỹ sư, cán bộ HSE…) sống trong công trường 3D: khai báo, hành vi, lời thoại, quyền ghi dữ liệu.

---

## Phần A: Quy tắc cho AI agent lập trình

### A1. Đọc trước khi làm
1. Đọc 3 file quy tắc: `docs/01 RULE AGENTS.md`, `docs/02 RULE UXUI.md`, `docs/03 RULE CHANGELOG.md`.
2. Đọc `src/data/schema.json` để biết bảng, tiền tố id và quan hệ tham chiếu.
3. Đọc mục mới nhất trong `CHANGELOG.md` để biết trạng thái hiện tại.

### A2. Dữ liệu tách khỏi mã nguồn
- Mọi nội dung nghiệp vụ (hạng mục, gói thầu, nhân lực, thiết bị, tiến độ, HSE, NCR, PTW, lời thoại) nằm trong `src/data/*.json`. **Không** viết cứng vào component.
- Component lấy dữ liệu **chỉ qua id**: `db.get('ZONE-03')`, `db.list('tasks', t => t.zoneId === id)`, `db.resolve(id)`, `db.backlinks(id)`.
- Ghi dữ liệu runtime **chỉ qua** `db.update(id, patch)` hoặc `db.create(prefix, rec)`. Không sửa trực tiếp mảng JSON đã import.
- Thay đổi khi chạy được lưu thành bản vá theo id trong localStorage (`ctao.patches.v1`). File JSON gốc không bị sửa. Nút "Khôi phục dữ liệu gốc" trong màn CSDL xoá toàn bộ bản vá.

### A3. Nguồn sự thật duy nhất về cấu trúc: `src/data/schema.json`
- `schema.json` được dùng chung bởi ứng dụng (`src/data/index.js`) **và** script kiểm tra (`scripts/check-data.mjs`). Không khai báo cấu trúc bảng ở nơi khác.
- **Thêm bảng mới:**
  1. Tạo `src/data/<table>.json` (mảng bản ghi, mỗi bản ghi có `id`).
  2. Khai báo trong `schema.json → tables`: `"<TIỀN TỐ>": { "table", "label", "refs": { "xxxId": "<TIỀN TỐ>" }, "listRefs": { "xxxIds": "<TIỀN TỐ>" } }`.
  3. Chạy `npm run check:data`.
  4. Bảng mới tự xuất hiện trong màn CSDL và panel chi tiết (`RecordDetail`). Chỉ viết view riêng khi thật sự cần.

### A4. Quy ước id
| Tiền tố | Bảng | Ví dụ | Ghi chú |
|---|---|---|---|
| `PRJ` | projects | `PRJ-01` | Siêu dự án |
| `PKG` | packages | `PKG-02` | Gói thầu, có `contractorId`, `value` (tỷ đồng) |
| `CTR` | contractors | `CTR-03` | Đơn vị, có màu nhận diện `color` và màu mũ `helmet` |
| `ROLE` | roles | `ROLE-05` | Chức danh, kỹ năng, thẩm quyền |
| `ZONE` | zones | `ZONE-03` | Hạng mục/khu vực trên mặt bằng, `kind` quyết định mô hình 3D |
| `RT` | routes | `RT-01` | Tuyến đường nội bộ (đồ thị đi bộ + tuyến xe) |
| `WK` | workers | `WK-08` | Nhân lực ảo |
| `EQ` | equipment | `EQ-01` | Thiết bị thi công |
| `TSK` | tasks | `TSK-010` | Công việc tiến độ, **quyết định % hạng mục** |
| `MS` | milestones | `MS-04` | Mốc tiến độ |
| `HSE` | hse | `HSE-004` | Quan sát an toàn |
| `NCR` | ncrs | `NCR-002` | Phiếu không phù hợp |
| `PTW` | permits | `PTW-003` | Giấy phép làm việc |

- Định dạng `<TIỀN TỐ>-<2–3 chữ số>`, viết hoa, **không tái sử dụng** id đã xoá.
- Trường tham chiếu: `<thực thể>Id` (`zoneId`, `assigneeId`); danh sách: `<thực thể>Ids`.
- Tiền tố quyết định loại bản ghi: panel chi tiết, camera (`focusOf` trong `Site3D.jsx`) và tra cứu đều suy ra từ tiền tố. **Đừng đổi tiền tố.**

### A5. Chỉ số suy ra, không lưu
- `% thực tế`, `% kế hoạch`, `SPI` của hạng mục, gói thầu, dự án được **tính** trong `src/store/metrics.js` từ `tasks.json` (`progress`, `weight`, `start`, `finish`). **Không** thêm trường `progress` vào `zones`/`packages`/`projects`.
- % kế hoạch của một công việc = tuyến tính giữa `start` và `finish` theo ngày hôm nay.
- Tiến độ dự án = trung bình các gói thầu, trọng số theo `value`.
- Muốn mô hình 3D của một hạng mục thay đổi thì sửa `progress` của các `TSK` thuộc hạng mục đó.

### A6. Cấu trúc thư mục
```
src/
  data/      schema.json + <table>.json + dialogues.json + index.js (SCHEMA, ENUMS)
  store/     db.js (CSDL runtime), metrics.js (chỉ số suy ra), ui.js (trạng thái giao diện), sim.js (mô phỏng)
  scene/     Three.js / R3F: Site3D, Structures (bộ dựng theo kind), Worker, Equipment, layout (đồ thị đường), runtime, palette, Primitives
  ui/        Giao diện HTML phủ trên cảnh 3D
scripts/     check-data.mjs
docs/        Quy tắc dự án
```
- Logic 3D đặt trong `scene/`, giao diện 2D đặt trong `ui/`. Không import `ui/` từ `scene/`.
- Vị trí và chuyển động (người, xe) nằm trong `scene/runtime.js` (mutable, đọc trong `useFrame`), **không** đưa vào React state.
- **Thêm loại công trình mới:** viết component trong `Structures.jsx` nhận `{ p, params, size }` (p = 0..1) → đăng ký vào `BUILDERS` → thêm `kind` vào danh sách `KINDS` trong `scripts/check-data.mjs`.
- **Thêm loại thiết bị mới:** viết component trong `Equipment.jsx` → đăng ký vào `KINDS` và `TAG_Y` → thêm vào `EQ_KINDS` trong `check-data.mjs`.

### A7. Phiên bản thư viện
- Ghim cứng phiên bản trong `package.json` (không dùng `^`/`~`). Nâng phiên bản thì ghi vào CHANGELOG.
- Hiện tại: React 18.3.1, three 0.169.0, @react-three/fiber 8.17.10, @react-three/drei 9.114.0, Vite 5.4.10.

### A8. Trước khi bàn giao một thay đổi
1. `npm run check:data` không lỗi.
2. `npm run build` không lỗi.
3. Mở thử (`npm run dev` → http://127.0.0.1:5200), console không có lỗi đỏ.
4. Cập nhật `CHANGELOG.md` theo `docs/03 RULE CHANGELOG.md`.
5. Báo cáo đúng sự thật: bước nào chưa chạy thì nói rõ là chưa chạy.

### A9. Không được làm
- Không sao chép tên, nhân vật, hình ảnh, cơ chế đặc trưng của sản phẩm khác. Trang tham khảo chỉ dùng để lấy ý tưởng bố cục và phong cách low-poly.
- Không đưa dữ liệu thật của khách hàng hoặc dự án vào `src/data` khi chưa được phép. Tên dự án, nhà thầu mẫu phải ghi "(demo)".
- Không xoá hoặc ghi đè file tài liệu cũ. Bản cũ chuyển sang thư mục `bản cũ`.

---

## Phần B: Quy tắc cho nhân lực ảo (agent trên công trường)

### B1. Khai báo một người mới (`src/data/workers.json`)
```json
{
  "id": "WK-27",
  "name": "Tên gọi",
  "title": "Anh/Chị Tên gọi",
  "roleId": "ROLE-xx",
  "contractorId": "CTR-xx",
  "zoneId": "ZONE-xx",
  "look": { "shirt": "#hex", "skin": "#hex", "vest": true, "hair": "long" },
  "status": "on-site",
  "routine": ["work", "work", "inspect", "break"]
}
```
- `zoneId` là **vị trí thường trực** (nơi về làm việc). Cán bộ văn phòng đặt ở `ZONE-09` (Ban chỉ huy); HSE đặt ở `ZONE-12` (Cổng).
- **Màu mũ bảo hộ lấy theo nhà thầu** (`contractors.json → helmet`), không khai báo trong worker. Áo (`shirt`) nên cùng tông `contractor.color`.
- `vest: true` cho người làm việc tại hiện trường (bắt buộc với thợ, cẩu, rigger, HSE, TVGS).
- `status: "off"` thì người đó không xuất hiện trong cảnh 3D.

### B2. Hành vi (`routine`)
| Hành vi | Ý nghĩa | Đích đến | Tư thế khi tới |
|---|---|---|---|
| `work` | Thi công tại vị trí thường trực | `zoneId` của người đó | Vung tay thao tác (`work`), hoặc đứng nếu là công trình phụ trợ |
| `inspect` | Đi kiểm tra / nghiệm thu / tuần tra AT | Ngẫu nhiên một hạng mục đang thi công | Đứng quan sát |
| `office` | Họp, làm hồ sơ | Hạng mục `kind: office` | Đứng |
| `break` | Nghỉ giữa ca | Hạng mục `kind: canteen` | Ngồi tại bàn ăn |

- Tần suất một hành vi = số lần nó xuất hiện trong mảng `routine`.
- Người đang ở ngoài vị trí thường trực có 60% khả năng quay về `work` ở lượt kế tiếp (`store/sim.js`).
- **Đường đi:** hạng mục hiện tại → điểm `access` → theo mạng đường `routes.json` (Dijkstra) → `access` của hạng mục đích → điểm làm việc. Không đi xuyên công trình.
- Mỗi hạng mục phải có `access` nằm **trên** một tuyến đường. Có thể khai báo `workSpots` để định vị trí đứng/ngồi cụ thể (bắt buộc với nhà ăn, cầu cảng).

### B3. Lời thoại (`src/data/dialogues.json`)
- `byWorker["WK-xx"]`: 2–4 câu, mỗi câu ≤ 80 ký tự, đúng chuyên môn của chức danh.
- Giọng văn: ngắn, đúng thuật ngữ công trường (PTW, JSA, ITP, NCR, NDT, RT, LOTO, SPI…). Không dùng nội dung nhạy cảm, không nêu tên người thật.
- Xưng hô khớp `title` của người được nhắc tới.
- `behaviors` dùng placeholder `{task}`, `{zone}`. `hseAuto` và `ptwAuto` dùng `{zone}`.
- `ptwAuto` khai báo theo **chức danh** (`ROLE-xx`): chức danh nào có mục này thì người giữ chức danh đó sẽ tự gửi yêu cầu PTW.

### B4. Quyền ghi dữ liệu của mô phỏng
| Mô phỏng ĐƯỢC | Mô phỏng KHÔNG ĐƯỢC |
|---|---|
| Tăng `progress` của TSK đang `doing`; khi đạt 100% chuyển sang `review` (chờ nghiệm thu) | Chuyển `review → done`: **chỉ người dùng** bấm "Nghiệm thu" |
| Chuyển TSK `todo → doing` khi đã tới ngày `start` | Sửa `start`, `finish`, `weight` |
| Cán bộ HSE (ROLE-05) tạo quan sát `HSE` mới khi đi kiểm tra | Đóng HSE / NCR |
| Thợ theo `ptwAuto` tạo `PTW` trạng thái `requested` (tối đa 4 yêu cầu chờ cùng lúc) | **Duyệt PTW**: chỉ người dùng |
| | Đổi trạng thái thiết bị, nhân lực |

- Tổng số bản ghi mô phỏng tự tạo trong một phiên tối đa 30 (`MAX_AUTO_RECORDS`) để localStorage không phình.
- Mọi thay đổi đều ghi vào Nhật ký công trường (`logActivity`).
