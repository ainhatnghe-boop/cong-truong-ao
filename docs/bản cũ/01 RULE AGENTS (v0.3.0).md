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
Từ v0.3 có **ba ứng dụng** trong cùng project, chọn ở `src/Root.jsx`:
- **Công trường ảo · Nhập vai** (`src/rpg/` + `src/rpgui/`, mặc định): xem **Phần D**.
- **SITE 3D Studio** (`src/engine/` + `src/studio/`): nền tảng xây dựng tự do. Xem **Phần C**.
- **Công trường mẫu v0.1** (`src/data/`, `src/store/`, `src/scene/`, `src/ui/`, `src/App.jsx`): giữ nguyên, không phát triển thêm tính năng.

Chiều phụ thuộc cho phép: `rpgui → rpg → engine`; `rpgui → studio` chỉ để dùng lại renderer (TerrainView, PartsView, EquipmentModel); `studio → engine`. **Cấm** chiều ngược lại. Công trường mẫu không import và không bị import.
```
src/
  Root.jsx   chọn Nhập vai / Studio / Công trường mẫu
  rpg/       LOGIC NHẬP VAI THUẦN JS + data/*.json cấu hình: xem Phần D
  rpgui/     Giao diện & cảnh 3D nhập vai
  engine/    ENGINE THUẦN JS (không React, không three): xem Phần C
  studio/    Giao diện & cảnh 3D của Studio
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
1. `npm run check:data` không lỗi (dữ liệu Công trường mẫu).
2. `npm run test:engine` (engine Studio) và `npm run test:rpg` (nhập vai, gồm bot tự chơi) đạt 100%, `npm run build` không lỗi. Lệnh gộp: `npm run check`.
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

---

## Phần C: SITE 3D Studio (engine dùng chung cho mọi loại dự án)

### C1. Triết lý: không viết engine riêng cho từng loại công trình
- **Modular + Procedural + Parametric**: mọi công trình (toà nhà, nhà xưởng, cầu, bồn, đường…) đều được **sinh ra thành danh sách cấu kiện** (`part`) từ tham số. Engine chỉ làm việc với cấu kiện, không làm việc với "toà nhà" hay "nhà máy".
- Từ danh sách cấu kiện, engine tính chung cho mọi loại: khối lượng, chi phí vật tư, công tổ đội, trình tự thi công, hộp bao, phần đã thi công (hiển thị theo tiến độ).
- **Cấm**: hard-code bố cục mặt bằng, toạ độ cố định, số tầng cố định, hoặc nhánh `if (type === 'building')` trong engine mô phỏng, lưu/mở, chỉnh sửa. Logic riêng theo loại **chỉ** được nằm trong generator của loại đó.
- Thông số hình học là **gameplay**, không phải kết quả thiết kế kết cấu đạt tiêu chuẩn. Không ghi hay hiển thị như kết quả tính toán.

### C2. Module (`src/engine/`) và giao diện của từng module
| Module | Trách nhiệm | Không được |
|---|---|---|
| `materials.js` | Vật liệu PBR + đơn giá/định mức mô phỏng; danh mục kỹ năng tổ đội | Chứa logic |
| `generators.js` | Hàm thuần `(params) → { parts, acts }` cho từng loại | Đọc state, gọi UI |
| `ObjectRegistry.js` | Danh mục loại đối tượng + **lược đồ tham số** (min/max/step/unit/enum) | Sinh hình học |
| `ParametricGeometryEngine.js` | `build(node)` → parts đã sắp xếp + plan (work/cost/idx theo hoạt động) + bbox; cache theo `params` | Biết loại cụ thể |
| `TerrainEngine.js` | Heightmap chia chunk, sinh địa hình, bút (nâng/hạ/san/làm mịn), đào đắp, ranh giới | Phụ thuộc three |
| `PlacementSystem.js` | Toạ độ thế giới theo phân cấp, đổi hệ toạ độ khi đổi cha, bắt dính lưới/đối tượng | — |
| `schema.js` | Định dạng dữ liệu có **version**, `validate`, `repair`, `serialize`, `deserialize`, **migration** | — |
| `ProjectManager.js` | Kho dự án đang mở, **mọi lệnh chỉnh sửa**, Undo/Redo | Bỏ qua `apply()` |
| `ConstructionSimulationEngine.js` | `tick(doc, sim) → sim` thuần; khởi công; tự tuyển (chế độ Đơn giản) | Sửa `doc` |
| `ResourceManager.js` | Tổ đội (tuyển/cho nghỉ), máy trong phạm vi, hệ số năng suất, yêu cầu cẩu | — |
| `EconomyManager.js` | Cấp độ/XP, thanh toán theo đợt, thưởng bàn giao, định dạng tiền | — |
| `MissionManager.js` | Nhiệm vụ = điều kiện chung trên dữ liệu | Gắn với 1 dự án cụ thể |
| `SaveManager.js` | Lưu/mở localStorage, xuất/nhập tệp `.ctao.json` | Lưu khi `validate` còn lỗi |

- `src/engine/` **không import** React (trừ `useSyncExternalStore` trong `ProjectManager`), three.js hay bất kỳ file nào trong `src/studio/`. Nhờ vậy `npm run test:engine` chạy được bằng Node.
- UI (`src/studio/`) chỉ **đọc** qua `useProject` và **ghi** qua các lệnh của `ProjectManager` / hàm thuần của engine rồi `project.setSim()`.

### C3. Dữ liệu dự án (schema `ctao.project`, version hiện tại = 1)
- **Thiết kế** (`doc`, có Undo/Redo): `meta`, `site` (kích thước, ranh giới, địa hình), `nodes` (map id → nút).
- **Vận hành** (`sim`, KHÔNG vào Undo/Redo): ngày, tiền, XP, tổ đội, trạng thái thi công theo nút, nhiệm vụ, nhật ký.
- Nút: `{ id, type, name, parentId, order, t: { p:[x,y,z], ry }, params, locked, hidden }`. `t` là **cục bộ trong nút cha**.
- Phân cấp linh hoạt: nút `container` có `params.level` ∈ khu vực / hạng mục / công trình / hệ thống / gói công việc / nhóm. Không bắt buộc dùng đủ cấp.
- Id: `OBJ-0001` (cấu kiện/công trình), `EQ-0001` (máy), `GRP-0001` (nút phân cấp), cấp bởi `doc.seq`, **không tái sử dụng**.
- **Đổi định dạng** ⇒ tăng `SCHEMA_VERSION`, thêm `MIGRATIONS[vCũ]` trong `schema.js`, thêm ca kiểm thử mở tệp cũ vào `scripts/test-engine.mjs`, ghi CHANGELOG nhóm **Dữ liệu**.

### C4. Tính nhất quán (bắt buộc)
- Mọi thay đổi thiết kế đi qua `project.apply(label, nextDoc, { coalesce })`. Hàm này chạy `validate()` **trước**; có lỗi ⇒ từ chối, không ghi lịch sử, hiện thông báo.
- Thao tác kéo (thanh trượt, ô số, nét bút địa hình) dùng `coalesce` để gộp thành **một** bước Undo.
- Gizmo kéo thả chỉ ghi lệnh khi **thả chuột**; lệnh bị từ chối thì trả object 3D về đúng dữ liệu.
- Lưu: `validate` còn lỗi ⇒ **không lưu**. Mở/nhập: `migrate → repair → validate`; báo số điểm đã tự sửa.
- Sau Undo/Xoá/Mở, lựa chọn trỏ tới nút không còn tồn tại được dọn tự động (`useSelectionHygiene`).

### C5. Thêm loại đối tượng mới (ví dụ: tháp giải nhiệt, đập, hầm)
1. Viết generator trong `generators.js`: trả `parts` (hộp `b` / trụ `c` / nón `k`, vật liệu có trong `MATERIALS`, `a` = chỉ số hoạt động) và `acts` (`label`, `skill` ∈ `SKILLS`). Sắp cấu kiện theo thứ tự xây (dưới lên).
2. Khai báo trong `ObjectRegistry.js`: `type`, `label`, `category`, `icon`, `params` (dùng `num/int/enm/bool` có min/max), tuỳ chọn `unlock` (cấp mở khoá).
3. Thêm ca kiểm thử vào `scripts/test-engine.mjs` (đổi tham số → số cấu kiện đổi đúng quy tắc).
4. Không cần sửa UI: Thư viện, Inspector, cây dự án, mô phỏng, lưu/mở tự nhận.
- **Máy móc mới**: khai báo `equip: { model, footprint, range, boost: { skill: hệ số }, lift?, mobilize, daily }` và thêm model vào `MODELS` trong `studio/EquipmentModels.jsx`.
- **Thay hình procedural bằng GLB/GLTF** (giai đoạn sau): giữ nguyên dữ liệu và `build()` (để tính khối lượng/tiến độ); trong `studio/ObjectView.jsx` hoặc `EquipmentModels.jsx` render model theo `type` thay cho `PartsView`/model procedural. Hiện chưa có loại nào dùng GLB.

### C6. Mô phỏng thi công (quy tắc gameplay chung)
- Hoạt động trong một đối tượng chạy **tuần tự**. Đối tượng chạy song song, ưu tiên theo thứ tự khởi công.
- Mỗi hoạt động nhận tối đa 4 tổ cùng kỹ năng. Năng suất = số tổ × hệ số máy trong phạm vi (`boost`).
- Cấu kiện cao hơn 12 m mà không có máy `lift` trong phạm vi ⇒ năng suất × 0,35.
- Chi phí mỗi ngày = lương tổ đội + chi phí máy + vật tư theo % khối lượng làm được. Máy đặt lần đầu tính phí huy động.
- Xong một hoạt động ⇒ thanh toán = vật tư × 1,3. Bàn giao đối tượng ⇒ thưởng + XP. Tiền âm ⇒ tự dừng.
- Chế độ **Đơn giản**: khi bấm Vận hành, tự khởi công mọi đối tượng và tự tuyển 1 tổ cho kỹ năng còn thiếu. Chế độ **Nâng cao**: người chơi tự khởi công và tự tuyển. Hai chế độ dùng **cùng** định dạng dữ liệu.

---

## Phần D: Công trường ảo · Nhập vai (từ v0.3)

### D1. Nguyên tắc
- **Không hardcode** nghề, công trường, mặt bằng, quy trình, nhiệm vụ, PPE, giấy phép, vùng an toàn. Tất cả nằm trong `src/rpg/data/*.json`.
- **Dùng lại engine Studio** cho thế giới:
  - Mặt bằng sinh bằng `createProject` + `ObjectRegistry`.
  - Tiến độ chính là `sim` của engine.
  - Va chạm, vùng an toàn và dẫn đường suy ra từ **hộp bao** của đối tượng.
  - Không có code riêng cho "toà nhà" hay "nhà máy".
- Logic game nằm trong `src/rpg/` (thuần JS, chạy được bằng Node). `src/rpgui/` chỉ hiển thị và gọi hành động của `GameSession`.
- Chuyển động dùng **bước thời gian cố định** (`FIXED_DT = 1/60`); animation dùng delta-time. Không phụ thuộc FPS.
- **Trung thực về phạm vi**:
  - PPE, PTW, huấn luyện, quy trình và vùng an toàn là **mô phỏng học tập**. Không ghi hay hiển thị chúng như hệ thống an toàn thực, biện pháp thi công được duyệt, hay giấy phép thật.
  - NPC luôn có nhãn **NPC**, không giả làm người chơi trực tuyến.
  - Không tuyên bố có multiplayer hay AI hội thoại khi chưa có.
- Vào/rời công trường phải **đối xứng** trong vòng đời component (effect vào, cleanup rời im lặng). Component cảnh 3D phải chịu được `session.world = null` (React StrictMode).

### D2. Module (`src/rpg/`)
| Module | Trách nhiệm |
|---|---|
| `data.js` | Nạp & đánh chỉ mục JSON cấu hình |
| `schema.js` + `SaveSystem.js` | Hồ sơ `ctao.rpg` có **version**; `validateProfile`, `repairProfile`, `migrateProfile`. Lưu ở `localStorage['ctao.rpg.profile']`; khi kiểm thử thì truyền storage khác |
| `AvatarCustomizationSystem.js` | Chuẩn hoá ngoại hình theo `avatar.json` |
| `RoleManagementSystem.js` | Nghề, cấp/XP, đổi nghề (giữ XP), năng lực; quyền vào vùng, quyền sửa công trình, quyền xác nhận PTW |
| `ProjectWorkforceSystem.js` | `ProjectRole` theo dự án; đăng ký; hết chỗ → gợi ý vị trí khác hoặc thực tập; sơ đồ tổ chức (NPC có nhãn) |
| `ProjectSelectionSystem.js` | Danh sách công trường: `cfg:<id>` (sites.json) + `studio:<id>` (dự án Studio đã lưu) |
| `WorldBuilder.js` | Dựng doc/sim từ cấu hình. **Tự đặt** cổng, ki-ốt PPE, văn phòng, kho, bảng HSE, bảng bản vẽ, né vật cản, nước và vùng an toàn |
| `SafetyZoneSystem.js` | Vùng sinh từ đối tượng theo luật, vùng tĩnh, vùng toàn công trường. `zoneAccess`, `evaluate` (cảnh báo 3 mức theo khoảng cách), `blockingZones` |
| `CharacterController.js` | `CollisionWorld` (hộp xoay, mặt đi được, cầu thang, hàng rào có lối cổng, nước, biên bản đồ) và `stepCharacter` |
| `NavigationSystem.js` | Lưới chiếm chỗ + A*. Ô bị chặn gồm vật cản và **vùng chưa được phép** |
| `PPEManagementSystem.js` | Kho PPE, mặc/tháo; khoá PPE bắt buộc khi ở công trường |
| `PTWSimulator.js` | Phiếu PTW mô phỏng: chấm điều kiện, thời hạn tính theo thời gian chơi |
| `DynamicWorkflowEngine.js` | MỘT engine cho mọi quy trình; câu hỏi sinh từ số liệu engine |
| `MissionSystem.js` | Chuỗi nhập môn (đúng trình tự), sổ thưởng `claimed` |
| `TutorialSystem.js` | `GuideProvider` theo kịch bản (`ScriptedGuide`); `setGuideProvider` để thay bằng AI hội thoại sau này |
| `MinimapSystem.js` | Lớp dữ liệu vẽ minimap và bản đồ |
| `GameSession.js` | Điều phối tất cả, InteractionSystem (hành động "E – …" theo nghề/quyền/nhiệm vụ) và HUD snapshot |

### D3. Dữ liệu cấu hình (`src/rpg/data/`)
| File | Nội dung | Khi thêm mới |
|---|---|---|
| `roles.json` | Nhóm A–E. Mỗi nghề: mô tả, kỹ năng, nhiệm vụ, mức kinh nghiệm, `minLevel`, `ppe`, `access{zones,levels,edit,approve}`, `workflow`, `workSkills`, `defaultSlots` | `workflow` phải có trong `workflows.json`, hoặc là `'work'` kèm `workSkills` |
| `sites.json` | Công trường: map (kích thước, địa hình, ranh giới, seed), `objects` (loại trong ObjectRegistry + `progress`), `zones` tĩnh, `workforce`, `entry`, `safety` | Chạy `npm run test:rpg` để kiểm tra: dựng được, cổng/văn phòng tới được, công trình phụ trợ nằm ngoài vùng rủi ro |
| `safety.json` | Mức vùng, loại vùng, **luật sinh vùng từ đối tượng**, vùng toàn công trường | Luật khớp theo `type` / `types` / `category`; `when: always\|unfinished` |
| `workflows.json` | `workMap` (kỹ năng → quy trình) và các mẫu quy trình | Mỗi bước có `id, kind, target, label, hint, xp`. Dùng thêm `after`, `requires`, `onFail`/`retry`, `options`, `tag` (`brief`/`main`/`report`). Bước `optional` chỉ được kích hoạt qua `onFail` hoặc `next` |
| `missions.json` | Chuỗi "NGÀY ĐẦU TIÊN TẠI CÔNG TRƯỜNG" | `complete` theo sự kiện: `interact`, `reach`, `ppe-ok`, `training`, `map-opened`, `workflow-step`, `workflow-done`, `auto` |
| `ppe.json`, `permits.json`, `trainings.json`, `avatar.json`, `dialogues.json` | PPE, PTW mô phỏng, huấn luyện (quiz), ngoại hình, kịch bản hướng dẫn & NPC | — |

### D4. Quy tắc gameplay an toàn (bắt buộc giữ)
- Vùng chưa đủ điều kiện là **ranh giới cứng**: chỉ cho đi ra, không cho đi vào. Cảnh báo phát **trước** khi chạm ranh giới (mức 1 khi ≤ 8 m; mức 2/3 khi ≤ 2 m).
- Vùng `forbidden`: không ai vào được, không có thao tác bỏ qua.
- PPE bắt buộc (của công trường và của nghề) **không tháo được** khi đang ở công trường.
- Tuyến dẫn đường luôn tránh vật cản, hàng rào và vùng chưa được phép. Không tới được thì báo, không dẫn xuyên. Tuyến phải đưa người chơi **vào trong** vùng tương tác.
- Thưởng XP chỉ một lần cho mỗi khoá (`claimed`). Xem lại hướng dẫn không cộng thưởng.
- Đổi nghề:
  - Giữ nhân vật, XP tổng và XP từng nghề.
  - Huỷ nhiệm vụ đang làm theo nghề cũ.
  - Quyền truy cập được tính lại ngay.

### D5. Hồ sơ người chơi (`ctao.rpg`, version 1)
- Đổi cấu trúc hồ sơ thì phải:
  1. Tăng `RPG_VERSION`.
  2. Thêm `MIGRATIONS[vCũ]` trong `src/rpg/schema.js`.
  3. Thêm ca migrate vào `scripts/test-rpg.mjs`.
  4. Ghi CHANGELOG ở nhóm **Dữ liệu**.
- Tiến độ người chơi đóng góp vào công trình được lưu ở `sites[key].delta` theo id nút. **Không** ghi đè dự án Studio của người chơi.

### D6. Kiểm thử bắt buộc (`scripts/test-rpg.mjs`)
- Ca đơn vị:
  - Nhân vật và lưu; đổi nghề giữ XP.
  - Giới hạn chỗ, năng lực.
  - Dựng được mọi công trường.
  - Va chạm; vùng cấm, hạn chế, nguy hiểm.
  - Trình tự nhiệm vụ, migration.
- **Bot tự chơi** chuỗi nhập môn bằng chính `CharacterController` + `NavigationSystem`, cho nhiều nghề trên nhiều công trường. Thêm nghề hoặc công trường mới thì thêm vào danh sách `plays`.
