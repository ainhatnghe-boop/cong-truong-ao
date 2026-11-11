# 02 · RULE UXUI

Quy chuẩn giao diện cho Công trường ảo (cảnh 3D và lớp giao diện HTML).

- Mục 1–8: quy chuẩn chung và **Công trường mẫu v0.1** (phong cách low-poly viền mực).
- **Mục 9: SITE 3D Studio** (từ v0.2, phong cách bán thực, PBR).
- **Mục 10: Nhập vai** (từ v0.3). Token màu, chữ, khoảng cách ở mục 2–3 dùng chung cho cả ba ứng dụng.

## 1. Nguyên tắc chung
1. **Cảnh 3D là trung tâm.** Panel nổi trên cảnh, bo góc, không che quá 40% chiều ngang màn hình desktop.
2. **Bấm vào đâu cũng mở đúng chi tiết.** Mọi thực thể hiển thị (hạng mục, người, thiết bị, gói thầu, công việc, PTW, NCR, HSE) đều bấm được, mở panel theo id và camera bay tới đúng vị trí.
3. **Một nguồn dữ liệu.** Giao diện chỉ đọc qua `db`, `metrics` và `ui` store. Không giữ bản sao dữ liệu trong state cục bộ.
4. **Tiến độ nhìn thấy được.** % thực tế của hạng mục phải thể hiện bằng hình khối 3D (phần đã xây), không chỉ bằng con số.
5. **Tiếng Việt đầy đủ dấu.** Thuật ngữ chuyên ngành giữ nguyên (SPI, PTW, NCR, HSE, JSA, ITP, LOTO). Số thập phân dùng dấu phẩy (`toLocaleString('vi-VN')`).

## 2. Token thiết kế (`src/styles.css`, `src/scene/palette.js`)
| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--ink` | `#14203A` | `#E8ECF7` | Chữ chính, viền |
| `--bg` | `#E9E4D8` | `#0F1526` | Nền trang |
| `--surface` | `#FFFDF8` (92%) | `#161E34` (92%) | Panel |
| `--primary` | `#1F5EFF` | `#5B8CFF` | Hành động chính, liên kết id |
| `--accent` | `#F5A524` | | Điểm nhấn, bản ghi đã sửa |
| `--ok` / `--warn` / `--bad` | `#16A34A` / `#F59E0B` / `#DC2626` | | Trạng thái, ngưỡng SPI |

- **Không viết mã màu trực tiếp trong `src/ui/`**, trừ màu nghiệp vụ lấy từ dữ liệu (`contractor.color`, `contractor.helmet`, `package.color`, `ENUMS.*.color`).
- Trong `src/scene/`, màu vật liệu dùng chung (bê tông, thép, sơn chống gỉ, kính, nhựa đường…) lấy từ `PAL` trong `palette.js`; màu bầu trời và ánh sáng theo ca lấy từ `SKY.day` / `SKY.night`.
- **Màu nhận diện:**
  - Gói thầu (`package.color`): nền hạng mục, biển tên hạng mục, thanh tiến độ, thanh Gantt.
  - Nhà thầu (`contractor.color`): vòng chọn dưới chân người, viền avatar, chấm trong nhật ký.
  - Mũ bảo hộ (`contractor.helmet`): mũ trong cảnh 3D, chấm trên bảng tên.
- **Ngưỡng SPI** (`spiTone` trong `metrics.js`): ≥ 0,98 → `tone-ok`; ≥ 0,90 → `tone-warn`; còn lại → `tone-bad`. Luôn hiển thị SPI bằng component `Spi`.
- Chế độ tối: khai báo trong `@media (prefers-color-scheme: dark)` với `:root:not([data-theme='light'])`, đồng thời lặp lại trong `:root[data-theme='dark']`. Nút ◐/○/● luân phiên auto → sáng → tối.
- **Ca ngày / ca đêm** (☾/☀) là trạng thái của *cảnh*, độc lập với giao diện sáng/tối. Ca đêm: bật đèn pha công trường, đèn cảnh báo trên cẩu.

## 3. Chữ & khoảng cách
- Font: **Be Vietnam Pro** (400–800), dự phòng system-ui. Số liệu dùng `font-variant-numeric: tabular-nums`.
- Cỡ chữ: thân 14px · phụ 12px · tiêu đề panel 18px/800 · tiêu đề mục 12px viết hoa, giãn chữ 0.06em.
- Khoảng cách theo thang 4: `4 / 8 / 12 / 16 / 24`. Bo góc: 6 / 10 / 16px.
- Viền "nét mực" 1.5px `--ink` kèm bóng đổ cứng `0 1px 0`, đồng bộ với outline của khối 3D.

## 4. Cảnh 3D
- Phong cách **low-poly, flat shading, viền mực** (`<Edges>`). Mọi khối dùng `Box`/`Cyl` trong `scene/Primitives.jsx`. Tắt viền (`outline={false}`) cho chi tiết nhỏ và lặp nhiều để giữ hiệu năng.
- Tỉ lệ: 1 đơn vị ≈ 1 m nhưng công trình được **thu nhỏ** để vừa tổng mặt bằng (khoảng 130 × 95 m). Nhân lực phóng 1,35 lần (`WORKER_SCALE`) cho dễ nhìn.
- Hệ trục: +x = Đông, −z = Bắc (biển). Bờ biển ở z = −38, cổng chính ở phía Nam.
- **Bộ dựng theo tiến độ** (`Structures.jsx`): mỗi `kind` nhận `p` (0..1) và chia thành các giai đoạn bằng `step(p, a, b)`, ví dụ móng → kết cấu → bao che → hoàn thiện. Phần đang thi công đánh dấu bằng vòng giàn giáo màu `PAL.amber`.
- Nhãn trong cảnh (biển hạng mục, tên người, bong bóng thoại, tag thiết bị) dùng `<Html>` **không** `distanceFactor` để giữ cỡ chữ cố định.
- Tên nhân lực **mặc định ẩn** để tránh rối. Tên hiện khi rê chuột, khi chọn, khi đang nói, hoặc khi bật nút **Aa**.
- Bong bóng thoại: rộng tối đa 220px, hiện 4,2 giây. Mỗi người chỉ có 1 bong bóng tại một thời điểm.
- Camera: `CameraControls`; góc nghiêng tối đa 1.3 rad, khoảng cách 6–190 m. Khi chọn, camera nhìn từ hướng Tây-Nam: hạng mục ở khoảng cách `kích thước × 1,3 + 20`, người nhìn từ phía ngoài hạng mục (hướng tâm → người, cao 20 m), thiết bị 30 (cẩu tháp 48), gói thầu 75. Bấm logo để về toàn cảnh.
- Lọc gói thầu: hạng mục ngoài gói bị ẩn khối 3D và làm mờ biển tên (vẫn giữ nền để định hướng).
- **Tham quan** (✈): mỗi 7 giây tự chọn hạng mục kế tiếp. Esc hoặc bấm lại để dừng.

## 5. Thành phần giao diện
| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| TopBar | trên cùng | Logo (về toàn cảnh), lọc gói thầu, KPI (tiến độ, nhân lực, ngày an toàn, NCR mở, PTW chờ duyệt), nút Tiến độ / An toàn & Chất lượng / CSDL / Tham quan / Aa / ca / tạm dừng / giao diện, đồng hồ |
| Dock | trái | 4 tab: Hạng mục · Gói thầu · Nhân lực · Thiết bị |
| DetailPanel | phải, rộng 380px | View theo tiền tố: `ZONE`, `WK`, `PKG`, `CTR`, `EQ`; còn lại dùng `RecordDetail` (có nút trạng thái cho TSK/PTW/NCR/HSE/MS) |
| ActivityFeed | góc trái dưới | "Nhật ký công trường", 8 dòng mới nhất, thu gọn được |
| Modal Tiến độ | giữa | Gantt theo hạng mục, có mốc ◆, vạch "hôm nay", thanh kế hoạch nhạt + thực tế đậm |
| Modal An toàn & Chất lượng | giữa | 4 ô thống kê + 3 cột: PTW · NCR · HSE, thao tác duyệt/đóng ngay trên thẻ |
| Modal CSDL | giữa | Tra cứu theo id, xem từng bảng, khôi phục dữ liệu gốc |

- Thành phần dùng chung trong `ui/common.jsx`: `Chip`, `EnumChip`, `Progress` (có vạch kế hoạch), `Spi`, `IdLink`, `Avatar`, `Section`. `TaskRow` trong `DetailPanel.jsx` dùng cho mọi danh sách công việc. **Dùng lại trước khi tạo mới.**
- Trạng thái, loại, mức độ luôn hiển thị bằng `EnumChip` (màu lấy từ `ENUMS`), không tự đặt màu.
- Việc chậm (thực tế < kế hoạch − 5%) và NCR quá hạn: viền trái đỏ 3px, chữ ngày/% tô đỏ.
- KPI trên TopBar bấm được và mở modal tương ứng.

## 6. Tương tác & trợ năng
- Vùng bấm tối thiểu 32×32px (nút icon 34px; nút nhỏ `btn--sm` cao 26px chỉ dùng trong thẻ/danh sách).
- Mọi nút chỉ có icon phải có `aria-label` hoặc `title`.
- `:focus-visible` có viền 2px màu `--primary`.
- Modal có `role="dialog"` và `aria-modal`. Nhật ký có `aria-live="polite"`.
- Con trỏ đổi sang `pointer` khi rê lên vật thể bấm được trong cảnh 3D. Vật thể được rê/chọn có vòng sáng: màu gói thầu (hạng mục), màu nhà thầu (người), `PAL.amber` (thiết bị).

## 7. Responsive
- ≤ 1600px: nút trên TopBar chỉ còn icon; ẩn KPI nhân lực và đồng hồ.
- ≤ 1100px: ẩn toàn bộ KPI.
- ≤ 760px: TopBar xuống dòng; Dock thành tấm đáy (tối đa 38vh); DetailPanel thành tấm đáy (tối đa 70vh); ẩn Nhật ký và dòng gợi ý; cột HSE của bảng An toàn không còn chiếm 2 cột.
- Không có cuộn ngang ở cấp trang. Gantt, bảng An toàn, bảng CSDL cuộn ngang bên trong khung của chúng.

## 8. Checklist trước khi bàn giao giao diện
- [ ] Đúng token màu, không có mã hex mới trong `src/ui/`
- [ ] Kiểm tra cả giao diện sáng/tối **và** ca ngày/đêm
- [ ] Kiểm tra ở độ rộng 1440, 1024 và 390px
- [ ] Mọi id hiển thị đều bấm được (`IdLink`), camera bay đúng chỗ
- [ ] Sửa % một TSK thì khối 3D của hạng mục thay đổi tương ứng
- [ ] Không có lỗi trong console

---

## 9. SITE 3D Studio (từ v0.2)

### 9.1 Bố cục (phần mềm 3D + game chiến thuật)
| Vùng | Thành phần | Nội dung |
|---|---|---|
| Trên | `StudioTopBar` | Tên dự án (• = chưa lưu), 💰 tiền, ★ cấp + thanh XP, 📅 ngày / mục tiêu, **✎ Chỉnh sửa / ▶ Vận hành**, tốc độ ×1/×2/×5/×10, Đơn giản/Nâng cao, Undo/Redo, Lưu/Mở/Xuất/Nhập, chất lượng đồ hoạ, ngày/đêm, phóng to 3D, bật/tắt từng panel |
| Trái | `LeftPanel` | Tab **Cây dự án** (tìm kiếm, lọc theo loại, ẩn/khoá, kéo thả đổi cấp, thêm Khu vực/Hạng mục/Công trình) · Tab **Thư viện** (theo danh mục, 🔒 khi chưa đủ cấp) |
| Giữa | `StudioScene` | Không gian 3D |
| Phải | `Inspector` | Không chọn: thông tin dự án · 1 đối tượng: vị trí/hướng, tham số, máy móc, thi công · nhiều đối tượng: nhóm/nhân bản/khởi công/xoá |
| Dưới | `BottomBar` | **Công cụ dựng** · **Nhân lực & máy** · **Nhiệm vụ** · **Nhật ký** |

- Kích thước panel điều khiển bằng biến CSS `--st-left/--st-right/--st-bottom` trên `.st-app`; panel ẩn đặt biến về `0px` → vùng 3D tự mở rộng.
- **Bố cục được lưu** (`ctao.studio.layout`): panel bật/tắt, tab đang mở, chất lượng đồ hoạ, lưới, bắt dính, ngày/đêm.
- Form thông số **sinh tự động** từ lược đồ `params` trong `ObjectRegistry` (`number/int` → thanh trượt + ô số; `enum` → chọn; `bool` → ô tích). Không viết form tay cho từng loại.
- Trường không sửa được (chế độ Vận hành, đối tượng khoá) dùng `<fieldset disabled>`, không ẩn đi.

### 9.2 Tương tác 3D
| Thao tác | Cách làm |
|---|---|
| Chọn | Bấm đối tượng · Shift/Ctrl+bấm: chọn nhiều · bấm nền đất: bỏ chọn |
| Di chuyển / xoay | Gizmo (W / E). Ghi lệnh khi **thả chuột**. Bắt dính lưới, cạnh/tâm đối tượng, bám mặt đất theo tuỳ chọn |
| Đặt mới | Chọn ở Thư viện → bóng xanh lá theo chuột → bấm lên mặt đất hoặc lên công trình. Shift: đặt liên tiếp. Esc: huỷ. Đang chọn 1 nút phân cấp ⇒ đối tượng mới vào nút đó |
| Địa hình | T hoặc ⛰: kéo chuột trái để Đắp/Đào/San phẳng/Làm mịn; vòng vàng = bán kính; mỗi nét = 1 bước Undo; vùng đào/đắp đổi màu đất |
| Camera | Chuột trái xoay (mặt bằng: kéo), phải: dịch, cuộn: phóng tới con trỏ, mũi tên: bay, F: tới đối tượng, P: mặt bằng ↔ phối cảnh, nhấp đúp: tới đối tượng |
| Xem theo tầng | ✂ Cắt cao độ + thanh trượt: ẩn cấu kiện có đáy cao hơn mức cắt |
| Lớp | Ô tích theo danh mục ở thanh dưới |

- **Phím tắt** (không chạy khi đang gõ trong ô nhập): Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z), Ctrl+S, Ctrl+D, Ctrl+G / Ctrl+Shift+G, Delete, Esc, Q/W/E/T/G/F/P, Space (vận hành: tạm dừng/tiếp tục).
- Dòng gợi ý ở chân vùng 3D đổi theo công cụ đang dùng.
- Thông báo (`project.notify`): 4,2 giây, viền theo tông `ok / warn / bad`. Lệnh bị từ chối **luôn** có thông báo nêu lý do.

### 9.3 Đồ hoạ
- Phong cách **bán thực (semi-realistic)**: vật liệu PBR trong `engine/materials.js` (màu, độ nhám, kim loại, độ trong), tone mapping ACES, bầu trời vật lý (`Sky`), sương mù theo kích thước bản đồ, bóng đổ đi theo điểm nhìn.
- Cấu kiện **đã thi công**: vật liệu thật · **đang thi công**: cam mờ · **chưa thi công**: xanh mờ (ghost) · **bóng xem trước khi đặt**: xanh lá mờ.
- Khung chọn màu `--accent` (xám khi đối tượng khoá). Vòng vàng dưới máy = phạm vi tác động.
- Lưới vẽ **trên bề mặt địa hình** bằng shader (đường đậm mỗi 10 ô), không dùng mặt phẳng lưới riêng.
- Ranh giới khu đất: nét đứt đỏ bám địa hình.
- Hiệu năng: cấu kiện vẽ bằng `InstancedMesh` theo (hình khối × vật liệu); địa hình chia chunk 32×32 ô; chất lượng Thấp/Trung bình/Cao điều khiển bóng đổ và độ phân giải.
- Máy chuyển động **chỉ khi** đang phục vụ ít nhất một hoạt động. Công nhân hiện quanh chân công trình đang thi công, mũ màu theo kỹ năng (`SKILLS[k].color`).

### 9.4 Checklist riêng cho Studio
- [ ] Thao tác mới ghi được Undo/Redo và có nhãn rõ ràng
- [ ] Lệnh không hợp lệ bị từ chối kèm thông báo, không làm hỏng dữ liệu
- [ ] Hoạt động ở 1600, 1280 và 390px; ẩn từng panel vẫn dùng được
- [ ] Kiểm tra trên địa hình đồi núi (không chỉ đất bằng)
- [ ] `npm run test:engine` và kịch bản E2E đạt

---

## 10. Công trường ảo · Nhập vai (từ v0.3)

### 10.1 Nguyên tắc UX
1. **Mỗi lúc chỉ một việc quan trọng.** Thẻ mục tiêu hiện *bước hiện tại* và *gợi ý bước tiếp theo*. Quy trình đầy đủ chỉ mở khi bấm "📋 Xem quy trình".
2. Luôn có các nút:
   - **❓ Tôi cần làm gì tiếp theo?**
   - **🧭 Dẫn tôi đến nơi làm việc**
   - **📋 Xem quy trình** (khi có nhiệm vụ)
   - **🎮 Trợ giúp điều khiển**
3. Việc đơn giản chỉ cần **một phím E**, không bắt mở menu. Việc cần thời gian thì **giữ E** (có thanh tiến độ).
4. Nhãn tương tác phụ thuộc nghề, quyền và trạng thái nhiệm vụ. Khi nhiều đối tượng ở gần, ưu tiên đối tượng **liên quan tới nhiệm vụ**, sau đó mới xét khoảng cách.
5. Hướng dẫn điều khiển chỉ hiện lần đầu (bỏ qua được). Điều kiện an toàn bắt buộc **không bao giờ** bỏ qua được.
6. Có hai chế độ bật/tắt trong Cài đặt: **người mới** (tự hiện vạch dẫn đường) và **khám phá tự do** (ẩn thẻ nhiệm vụ).
7. UI không che quá ~35% màn hình; mọi panel thu gọn được; hộp thoại đóng bằng Esc.

### 10.2 Bố cục HUD
| Vị trí | Thành phần |
|---|---|
| Trên trái | Thanh trạng thái: menu ☰, tên · nghề · thực tập, cấp + thanh XP, số PTW đang hiệu lực, tên công trường |
| Dưới thanh trạng thái | Thẻ mục tiêu: nhiệm vụ, bước x/15, mô tả, điều kiện còn thiếu ⛔, bước tiếp theo, khoảng cách ➜ |
| Trên giữa (dưới thanh trạng thái) | Cảnh báo vùng: mức 1 viền xanh, mức 2 nền vàng, mức 3 nền đỏ (⛔), kèm lý do cụ thể |
| Trên phải | Minimap tròn (bấm để mở bản đồ). Thông báo hiện ngay bên dưới |
| Dưới giữa | Gợi ý `[E] hành động · đối tượng`; thanh giữ E |
| Dưới trái | Bong bóng **AI hướng dẫn** (nhãn NPC, nút "Đã hiểu", phím H để xem lại) |
| Dưới phải | Dòng phím tắt |

### 10.3 Thế giới 3D
- Nhân vật procedural bán thực tế (v0.4: thân tròn dạng lathe, mặt có mắt/mũi/miệng, ngón tay, đầu gối, giày có đế & mũi thép, mũ có vành & quai cằm), có khớp hông/gối/vai/khuỷu/cổ chân. PPE đang mặc **hiện trên người**: mũ có màu, áo phản quang có dải phản quang, giày, kính, găng, chống ồn, dây an toàn, mặt nạ.
- Vùng an toàn vẽ trên mặt đất theo màu của mức (`safety.json → levels`). Vùng **đang chặn bạn** có thêm rào băng bán trong suốt cao 1 m.
- Vạch dẫn đường màu cyan nét đứt. Mục tiêu là mũi tên cam nhấp nhô kèm vòng cam. Đối tượng tương tác được có vòng cyan.
- NPC luôn có nhãn `NPC`; AI hướng dẫn có nhãn nền xanh dương 🤖.
- Camera thứ ba: kéo chuột để xoay, cuộn để zoom (2,5–16 m), **tự kéo gần** khi vướng công trình. Phím C chuyển sang camera tự do.

### 10.4 Checklist riêng cho nhập vai
- [ ] Hành động mới có nhãn "E – …" rõ ràng, chỉ hiện khi phù hợp nghề/quyền/nhiệm vụ
- [ ] "Dẫn tôi đến nơi làm việc" đưa người chơi **vào trong** vùng tương tác
- [ ] Không có cảnh báo hay chặn nào xuất hiện sau khi người chơi đã bước vào vùng
- [ ] Văn bản liên quan an toàn ghi rõ "mô phỏng"
- [ ] Chạy E2E trên cả `npm run dev` (StrictMode) và bản build

### 10.5 Màn hình tạo nhân vật điện ảnh (từ v0.4)
**Bảng màu riêng** (biến `--cc-*` trong `src/rpgui/character/creator.css`): Navy `#0B1726` · Dark Blue `#13253B` · Industrial Gray `#263544` · Construction Yellow `#FFBF36` (nút chính, mục đang chọn) · Safety Orange `#F58220` (cảnh báo, xung đột) · Highlight Blue `#168BFF` (focus, thông tin) · Text `#F4F7FA`. Glassmorphism nhẹ (`backdrop-filter: blur`), glow chỉ dùng cho thanh tiến độ và nút chính.

| Vùng | Quy tắc |
|---|---|
| Trái: hành trình | 4 bước (Tạo nhân vật · Chọn nghề · Chọn công trường · Bắt đầu hành trình), thanh tiến độ, thu gọn được (`«`/`»`); dưới 900 px chuyển thành dải số bước nằm ngang. Bước đã xong có ✓; bước chưa tới được thì mờ và không bấm được |
| Giữa: studio 3D | Chiếm khoảng 50–60% chiều rộng. Bệ tròn có vòng vàng nhẹ, bối cảnh công trường phía sau (khung thép, cẩu tháp, nhà xưởng, container) **không che nhân vật**. Trên: góc xem Toàn thân/Khuôn mặt/Chi tiết PPE, ⟲ đặt lại, ? hướng dẫn. Dưới: thử animation, tên preset ánh sáng |
| Phải: bảng tuỳ chỉnh | 5 tab: Thông tin · Ngoại hình · Trang phục · Bảo hộ PPE · Phụ kiện. Dùng **thẻ có ảnh thu nhỏ** và mẫu màu, không dùng dropdown. Bảng cuộn riêng, không tràn ngang |
| Chân trang | ← Quay lại · ↺ Khôi phục mặc định (có xác nhận ngay tại chỗ) · **Tiếp tục** (vàng, bên phải). Trạng thái "Đã lưu tự động hh:mm:ss" ở góc trên phải |

- **Camera**: kéo chuột xoay, cuộn zoom có giới hạn (không xuyên model: tối thiểu 1,6 m toàn thân / 0,55 m khuôn mặt, tối đa 6 m), phím ← → ↑ ↓, + −, 1/2/3, R. Chuyển góc xem nội suy mượt; người chơi kéo chuột thì dừng nội suy.
- **Không có tuỳ chọn vô tác dụng**: nhóm mà bộ dựng hiện tại không hỗ trợ phải hiện 🔒 kèm lý do, không ẩn im lặng.
- **PPE**: mỗi món ghi rõ huy hiệu *Đã cấp* / *Chưa cấp – xem thử*, *✓ PPE được công nhận*, *Đang xem thử – không được công nhận*, *Bắt buộc tại công trường*; báo trước món sẽ bị thay khi xung đột. Luôn có hộp giải thích "cách hệ thống an toàn công nhận PPE (mô phỏng)".
- **Trạng thái**: đang tải studio 3D (spinner), lỗi nạp model (thông báo + tự dùng nhân vật procedural), focus rõ (`outline` xanh), `prefers-reduced-motion` tắt hiệu ứng quay.
- **Chất lượng đồ hoạ** Thấp/Trung bình/Cao: Thấp tắt bóng, môi trường PBR và bớt bối cảnh để chạy trên máy yếu.
