# Changelog

Mọi thay đổi đáng chú ý của dự án được ghi tại đây. Quy tắc ghi: xem `docs/03 RULE CHANGELOG.md`.

## [Chưa phát hành]
### Thêm
- **Chuột điều khiển camera** trong công trường: bấm vào cảnh để khoá con trỏ, di chuột (không cần giữ nút) để xoay camera, Esc để thả. Vẫn giữ cách giữ chuột & kéo. Tắt/bật trong Menu → Cài đặt (`settings.mouseLook`, mặc định bật). Con trỏ tự được thả khi mở menu, bản đồ hoặc hộp thoại. Có dòng gợi ý trên màn hình.
- Phím mũi tên ↑ ← ↓ → cũng di chuyển nhân vật.
- **Click-to-move**: bấm **chuột phải** vào mặt đất để nhân vật **tự đi** tới đó, dùng lại nguyên bộ dẫn đường đang có (`NavigationSystem` A\*, né vật cản và vùng chưa được phép). Vòng tròn xanh dương nhấp nháy đánh dấu điểm vừa bấm (`ClickMarker`). Chuột trái vẫn dành riêng cho xoay camera — không xung đột. Bấm chuột phải trong lúc đang khoá con trỏ sẽ thả con trỏ trước (toạ độ chuột không đáng tin khi bị khoá), bấm lại lần nữa để đi.
- Nút **"🧭 Dẫn tôi đến nơi làm việc"** giờ cũng cho nhân vật **tự đi** (trước đây chỉ vẽ đường tham khảo, người chơi vẫn phải tự bấm WASD). Thêm nút **"✕ Huỷ tuyến"** cạnh đó.
- Bấm WASD / phím mũi tên bất cứ lúc nào trong khi đang tự đi sẽ **giành lại quyền điều khiển ngay lập tức** (tuyến vẫn hiển thị, chỉ tắt tự động đi theo).
- Mũi tên đánh dấu mục tiêu nhiệm vụ đổi màu **xanh lá** (trước là cam) để phân biệt rõ với vòng tròn xanh dương của điểm vừa bấm chuột.
- `GameSession.walkTo(x, z)` và `GameSession.followRoute()` (logic thuần JS, kiểm thử bằng Node, không phụ thuộc UI).
- **NPC QA/QC** đứng cạnh bảng bản vẽ, gặp và trao đổi bằng phím E (đủ 6 NPC để gặp: AI hướng dẫn, kỹ sư hiện trường, thủ kho, cán bộ HSE, tổ trưởng, QA/QC).
- **Dải "Giai đoạn thi công / nhiệm vụ"** mới trong HUD (`PhasePanel`, góc phải, dưới minimap): liệt kê các bước theo **tên thật** kèm trạng thái rõ ràng (✔ xong — gạch mờ, ● đang làm — nổi bật nhấp nháy, ○ chưa tới, ✗ hỏng), bấm vào để mở bảng chi tiết (Nhiệm vụ hoặc Quy trình). Ưu tiên hiện chuỗi "Ngày đầu tiên" khi chưa xong, sau đó là quy trình công việc đang làm. Tự ẩn khi không có việc đang diễn ra hoặc ở chế độ khám phá tự do.
- **Cấu hình chất lượng đồ hoạ Thấp / Trung bình / Cao** cho công trường 3D (`settings.graphicsQuality`, Menu → Cài đặt): đổi độ phân giải bóng đổ, tỷ lệ pixel render (dpr); **Cao** bật thêm phản chiếu môi trường PBR (dựng bằng `Lightformer` tại chỗ, không tải ảnh HDR từ mạng) và bóng tiếp xúc mềm dưới chân nhân vật. Mặc định **Trung bình** giữ đúng hiệu năng bản trước.
- Tăng nhẹ độ phơi sáng tone mapping (ACES) cho công trường 3D.
- **Bộ dựng nhân vật GLB "Công nhân bảo hộ"** (`cong_nhan_bao_ho_lien_mach.glb`, sở hữu dự án — model tự tạo, toàn quyền sử dụng): khai báo trong `characterAssets.json` (id `gltf-cong-nhan-bao-ho`), chọn được ở tab Thông tin của màn hình tạo nhân vật / tủ đồ, dùng chung đường nạp `GltfAvatar.jsx`. Model có PPE (nón cứng, áo phản quang, giày) tạc liền khối — không tách rời theo hệ thống PPE tuỳ biến; chưa có rig/animation (đứng yên, không có idle/walk/run riêng).
- **Bộ dựng nhân vật GLB "Công nhân công trường (có animation)"** (`cong_nhan_cong_truong_animated.glb`, sở hữu dự án, id `gltf-cong-nhan-animated`): có rig xương cứng + clip Idle/Walk/Run thật, chuyển animation đúng theo trạng thái di chuyển trong game (đứng/đi/chạy). `GltfAvatar.jsx` nay **tự tính bbox thật (`THREE.Box3`) để đặt chân nhân vật xuống đất**, không còn giả định gốc rig luôn ở chân — áp dụng chung cho mọi bộ dựng GLB, kể cả bộ dựng thêm sau này.
- **`ProceduralAvatar` — chi tay/chân thon liền mạch, không phụ thuộc GLB**: thay cụm "capsule đều + khớp hình cầu" (tay/chân trông như đồ chơi lắp ghép, có ngấn rõ ở vai/khuỷu tay/đầu gối) bằng hình học `LatheGeometry` thon dần có phồng cơ tự nhiên (vai, bắp tay, đùi, bắp chân), bán kính khớp nối khít nhau giữa 2 đoạn nên không còn "khớp bóng" lộ rõ. Cổ cũng đổi từ hình trụ cứng sang thon liền vào vai. Vẫn thuần Three.js, không tải file ngoài, giữ nguyên toàn bộ hệ tuỳ biến ngoại hình/trang phục/PPE và animation hiện có.
- Bộ dựng nhân vật mặc định cho nhân vật mới vẫn là **`procedural-v2`** (đã cải tiến ở trên) — 2 model GLB "Công nhân bảo hộ" và "Công nhân công trường (có animation)" thêm ở bản trước vẫn chọn được thủ công ở tab Thông tin, không phải mặc định.
- **3 model GLB nhân vật mới có vertex-skin + 7 động tác thật** (`gltf-cong-nhan-a-rig`, `gltf-cong-nhan-b-rig`, `gltf-cong-nhan-c-rig`): dựng bằng cặp script Blender 5.2 tự viết (`tài liệu/21.1 DUNG NHAN VAT CONG NHAN.py` + `tài liệu/21.2 GAN XUONG VA DONG TAC.py`, sở hữu dự án), chạy headless (`blender --background --python …`) rồi xuất GLB bằng `bpy.ops.export_scene.gltf` (`export_animation_mode='ACTIONS'` để giữ cả 7 clip, mỗi file ~0,8 MB). Công nhân A (áo liền thân), B (áo sơ mi + miếng đầu gối), C (nữ). Idle/Walk/Run/Jump map vào clip `DUNG_NGHI`/`CHAY_CHAM`/`CHAY_NHANH`/`NHAY_TAI_CHO`; `interact` tự rơi về Idle. 2 clip còn lại (`DUNG_CHONG_HONG`, `DUNG_VAY_TAY`) đã có trong file nhưng chưa có trạng thái gameplay nào gọi tới. Thêm làm lựa chọn mới trong tab Thông tin, không phải mặc định, không thay thế 2 model GLB cũ. Không hỗ trợ đổi màu da (`capabilities` không có `skin`, dùng chung 1 material theo bảng màu, đổi màu da sẽ nhuộm sai cả quần áo). Xem `public/assets/characters/README.md`.
- **PPE thay đổi trực tiếp trên 3 model GLB trên** (`capabilities` có `ppe`): pipeline Blender tách riêng mũ bảo hộ và áo phản quang thành 2 node skin riêng trong cùng 1 GLB (dùng UV theo ô bảng màu để tách khối đã tạc sẵn, không phải hình học rời rạc mới) — game bật/tắt theo PPE đang mặc, lộ ra lớp bên dưới đã có sẵn (tóc, áo) chứ không để lộ lỗ hổng mesh; cả hai **đổi màu theo lựa chọn người chơi** (nhân màu lên texture, giống cách đổi màu da ở 2 model cũ). Giày tách node riêng nhưng **luôn hiện** (mesh chân bên dưới không đủ để lộ ra an toàn khi tắt) — chỉ đổi màu. Kính bảo hộ/kính chống bụi/tấm che mặt/mặt nạ hàn/mặt nạ phòng độc/chụp tai/nút tai/găng tay/dây đai an toàn (chưa tạc sẵn trong GLB) gắn bằng hình học procedural có sẵn của `ProceduralAvatar` (`HeadGear`, xuất dùng lại), neo vào bone đầu/tay/hông bằng `createPortal` của React Three Fiber. Đã sửa 2 lỗi phát sinh trong lúc làm: (1) `<primitive object={bone}>` lồng JSX con khiến R3F gắn lại bone đó vào cây scene theo vị trí JSX, phá vỡ quan hệ cha/con thật trong bộ xương (nhân vật biến dạng) — phải dùng `createPortal(children, bone)` thay vì lồng trực tiếp; (2) tên bone `mixamorig:Head` bị `GLTFLoader` của three.js tự bỏ dấu `:` thành `mixamorigHead` khi dựng scene — khai báo `attach` trong `characterAssets.json` phải dùng tên đã bị cắt, không dùng tên gốc trong file Blender/glTF.
- **Nhảy thật (Space)**: trọng lực + vận tốc bật nhảy trong `CharacterController.js` (đỉnh nhảy ≈ 0,46 m, không gắn với animation theo kiểu root-motion). Chỉ bật khi đang đứng trên bề mặt hợp lệ (đang ở trên mặt đất, không phải dưới nước); giữ phím không nhảy chồng nhảy. Va chạm ngang (tường, công trình, hàng rào, vùng an toàn chưa được phép) vẫn được kiểm tra **như bình thường trong lúc bay** — không thể nhảy xuyên vật thể hay nhảy qua ranh giới vùng cấm/hạn chế. Trạng thái `jump` tự áp cho `GltfAvatar` (map vào `NHAY_TAI_CHO` ở 3 model mới, rơi về Idle ở 2 model cũ không có clip này) và cho `ProceduralAvatar` (tư thế khuỵu gối, co chân, giơ tay mới trong `CharacterAnimationController.js`). Thêm nút **"Nhảy"** vào dải thử animation của màn hình tạo nhân vật (đã đóng vai trò studio thử nhân vật: xoay/zoom, 5 tab tuỳ chỉnh, bật/tắt PPE trực tiếp) bên cạnh Đứng/Đi bộ/Chạy/Tương tác.
### Sửa lỗi
- **Nhân vật không đồng nhất giữa màn hình tạo nhân vật và công trường**: khi tạo nhân vật **mới**, bộ dựng (model GLB) chọn trong màn hình tạo nhân vật chỉ lưu tạm ở `localStorage`, không được truyền vào hồ sơ mới (`session.profile.settings.characterRenderer` vẫn lấy mặc định `procedural-v2`) — vào công trường nhân vật hiện ra là bản dựng thủ tục (procedural) chứ không phải model GLB đã chọn lúc xem thử. Sửa bằng cách đồng bộ ngay `rendererId`/`lightPreset`/`creatorQuality` vào `session.setSettings(...)` ngay sau khi `createCharacter` thành công (`CharacterCreatorScreen.jsx`). Không có code dựng hình khối cũ (procedural) nào bị bỏ sót cần xoá — `ProceduralAvatar.jsx` là phương án dự phòng chủ đích khi GLB lỗi, vẫn giữ nguyên theo `docs/01 RULE AGENTS.md` D5b.
- Phím di chuyển W A S D và các phím tắt E, M, J, H, C không ăn khi bật bộ gõ tiếng Việt (Telex biến W thành "ư"). Nay đọc **phím vật lý** (`KeyboardEvent.code`). Phím 1/2/3/R trong màn hình tạo nhân vật cũng vậy.
- `npm run dev` / `npm run build` không chạy được trên máy có Windows Application Control chặn file nhị phân gốc của Rollup (`ERR_DLOPEN_FAILED`). Đổi sang dùng bản WASM chính thức `@rollup/wasm-node` (cùng phiên bản, cùng API, không có file `.node`) qua `package.json → overrides`, không đổi phiên bản Vite, không tắt chính sách bảo mật nào.
### Kiểm thử
- `npm run test:rpg` thêm mục 12 (click-to-move) + kiểm tra đủ NPC: 140 → **149/149**.
- Thêm 6 ca kiểm thử nhảy trong mục 5 (Va chạm): nhấn nhảy bay lên rồi rơi về đúng mặt đất; giữ phím liên tục không nhảy chồng nhảy; vừa chạy vừa nhảy liên tục lao vào toà nhà không xuyên qua; vừa chạy vừa nhảy liên tục về phía vùng cấm không lọt qua ranh giới: **149 → 155/155**.
- Xác nhận lại bằng Microsoft Edge thật (Playwright) trên `npm run dev`: chọn/đổi 3 model GLB mới trong màn hình tạo nhân vật (Toàn thân, Khuôn mặt cận cảnh, đứng/đi/chạy, không lỗi console); bật/tắt PPE (mũ, áo phản quang, kính, chụp tai, găng, dây đai) đổi đúng hình trên model, đổi màu mũ/áo đúng; chơi thật trong công trường (chọn nghề công nhân, vào "Chung cư Hoa Sen 18 tầng", WASD/Shift di chuyển, bấm Space nhảy thấy đúng tư thế khuỵu gối rồi rơi về bình thường) — không lỗi console trong toàn bộ quá trình.

## [0.4.0] - 2026-11-07
### Thêm
- **Màn hình tạo nhân vật điện ảnh** (`src/rpgui/character/`), bố cục 3 cột theo bảng màu công nghiệp (navy, vàng công trường, cam an toàn):
  - Trái: hành trình 4 bước (Tạo nhân vật · Chọn nghề · Chọn công trường · Bắt đầu hành trình), thanh tiến độ, thu gọn được, quay lại không mất dữ liệu.
  - Giữa: studio 3D nạp lười. Có bệ tròn; bối cảnh công trường (khung thép, cẩu tháp, nhà xưởng, container, máy đào); ánh sáng Key/Fill/Rim, môi trường PBR dựng tại chỗ, bóng tiếp xúc, ACES. Preset ánh sáng: Ban ngày / Studio công nghiệp / Công trường. Chất lượng: Thấp / Trung bình / Cao.
  - Phải: 5 tab Thông tin · Ngoại hình · Trang phục · Bảo hộ PPE · Phụ kiện, dùng thẻ có ảnh thu nhỏ SVG thay cho dropdown.
- **CharacterCameraController**: kéo xoay, zoom có giới hạn chống xuyên model, góc xem Toàn thân / Khuôn mặt / Chi tiết PPE chuyển mượt, đặt lại, phím ← → ↑ ↓ + − 1 2 3 R.
- **Nhân vật procedural bán thực tế** (`ProceduralAvatar.jsx`), thay mô hình khối v0.3:
  - Thân tròn dạng lathe theo dáng nam/nữ.
  - Mặt có mắt (tròng, con ngươi, lông mày), mũi, 4 kiểu miệng, tai, râu.
  - Ngón tay, khớp gối, cổ chân; giày có đế, mũi thép, dây; mũ có vành, gờ, quai cằm, logo.
  - Áo có nẹp, cúc, túi, khoá kéo, cổ áo, logo ngực; áo phản quang có 2 dải phản quang.
  - Geometry và vật liệu được cache.
- **CharacterAnimationController**: đứng / đi / chạy / tương tác nội suy mượt theo delta-time (thở, đung đưa, vung tay, gập gối).
- **Đường nạp model GLB/GLTF** (`GltfAvatar.jsx`, `AvatarRenderer.jsx`):
  - `useGLTF`, clone SkeletonUtils.
  - `AnimationMixer` crossfade 0,25 s; thiếu clip thì dùng Idle.
  - Màu da theo material; gắn mũ vào node đầu.
  - Lỗi nạp: tự quay về nhân vật procedural và báo cho người chơi.
  - Ma-nơ-canh kiểm thử CC0 tự tạo (`scripts/make-test-gltf.mjs`), chỉ hiện khi mở `?dev=1`.
- **Ngoại hình**:
  - Cơ thể: dáng nam/nữ, chiều cao, thể hình, chiều rộng vai, tỷ lệ thân/chân.
  - Mặt: khuôn mặt, mắt, mũi, miệng, râu.
  - Màu da, kiểu tóc (tóc tự gọn khi đội mũ), màu tóc.
  - Nhóm mà bộ dựng hiện tại không hỗ trợ bị **khoá 🔒 kèm lý do**.
- **Trang phục**: 8 bộ, mỗi bộ có id riêng (kỹ sư, công nhân, giám sát, HSE, QA/QC, quản lý, khách tham quan, áo liền quần). Chọn màu áo/quần trong bảng màu cho phép, logo ngực (tối đa 12 ký tự), phụ kiện gợi ý.
- **PPE**:
  - 15 món theo 6 nhóm: đầu; mắt & mặt (kính, kính chống bụi, tấm che mặt, mặt nạ hàn, mặt nạ phòng độc); tay (găng thường / chống cắt / cách điện); chân (giày, ủng); thính giác (nút tai, chụp tai); khác (áo phản quang, dây đai toàn thân).
  - Huy hiệu: Đã cấp / Chưa cấp – xem thử / ✓ PPE được công nhận / Bắt buộc tại công trường.
  - Báo xung đột trước khi mặc.
  - Màu và kiểu mũ, màu áo phản quang, màu giày.
- **Phụ kiện** chỉ ngoại hình: kính cận, bộ đàm, máy tính bảng, thẻ tên, đai dụng cụ, ba lô, đồng hồ.
- **Mẫu nhanh** (4 mẫu) và 🎲 ngẫu nhiên, giữ tên và mã. NPC dùng bộ dựng mới, ngoại hình theo `characterPresets.json`.
- **Mã nhân vật** `NV-xxxx` tự sinh.
- **Tự lưu**: bản nháp khi chưa có hồ sơ (tải lại trang vẫn còn); vào hồ sơ khi đã có. Khôi phục mặc định có xác nhận.
- Màn hình chính có thêm nút **☺ Tùy chỉnh nhân vật**.
- **Kiểm thử** `test:rpg` từ 116 lên 140 ca: migration v1 → v2; PPE được công nhận / xem thử / xung đột / món thay thế; màu mũ theo dự án.
### Thay đổi
- **Tủ đồ trong game** (Esc → Trang phục & PPE) dùng chung bộ tuỳ chỉnh với màn hình tạo nhân vật. PPE bắt buộc vẫn bị khoá khi ở trong công trường.
- **Gameplay chỉ công nhận PPE đã được cấp VÀ đang mặc.** Có món thay thế, ví dụ:
  - Kính chống bụi đáp ứng yêu cầu kính bảo hộ.
  - Ủng đáp ứng yêu cầu giày.
  - Nút tai đáp ứng yêu cầu chống ồn.
  - Găng cách điện đáp ứng yêu cầu găng tay.
- Mặc món xung đột (cùng vị trí, hoặc khai báo `conflicts`) sẽ tự tháo món cũ.
- **Màu mũ theo vị trí** chỉ áp dụng khi dự án quy định (`sites.json → ppePolicy.helmetColors`), không gán cứng theo nghề. Hiện chỉ công trường S-OG-01 có quy định. Hộp thoại kiểm tra PPE hiển thị quy định này và cho nhận thêm PPE tuỳ chọn.
- Bước chọn nghề và chọn công trường ghi "Bước 2/4", "Bước 3/4". Nút Quay lại ở bước chọn nghề về màn hình tuỳ chỉnh nhân vật.
- Quy tắc:
  - `docs/01 RULE AGENTS.md`: cập nhật D2, D3, D4, D5; thêm D5b.
  - `docs/02 RULE UXUI.md`: thêm mục 10.5.
  - Bản v0.3.0 của quy tắc, README, CLAUDE lưu tại `docs/bản cũ/`.
- `CharacterCreator.jsx` và `AvatarModel.jsx` (v0.3) được thay bằng các module trong `src/rpgui/character/`; bản cũ lưu tại `docs/bản cũ/src/rpgui/`.
### Sửa lỗi
- Phát hiện và sửa khi kiểm thử (trước khi phát hành):
  - Tay nhân vật mới bị đặt sai cao độ (giơ lên trên đầu).
  - Quai cài cằm của mũ chạy dọc giữa mặt.
  - Góc xem toàn thân cắt mất đầu.
### Dữ liệu
- Hồ sơ người chơi **`RPG_VERSION = 2`**:
  - `character = {name, code, appearance, outfit, ppeStyle, accessories}`.
  - `settings` thêm `characterRenderer`, `lightPreset`, `creatorQuality`.
  - Migration v1 → v2 (`characterFromV1`) giữ tên, nghề, XP, tiến trình công trường, nhiệm vụ, PPE. Kiểu ngoại hình cũ được ánh xạ sang trang phục, màu mũ, kính cận. Ủng cao su v1 → món PPE "Ủng bảo hộ".
  - Không xoá `localStorage`.
- Khoá mới `localStorage['ctao.rpg.characterDraft']`: bản nháp tạo nhân vật, xoá sau khi tạo hồ sơ. Tuỳ chọn hiển thị studio lưu ở `ctao.rpg.creatorPrefs`.
- Dữ liệu cấu hình mới: `appearance.json`, `outfits.json`, `accessories.json`, `characterPresets.json`, `characterAssets.json`. `ppe.json` viết lại theo nhóm, thêm `slot`, `part`, `satisfies`, `conflicts`, `styles`. `sites.json` thêm `ppePolicy` cho S-OG-01. `avatar.json` (v0.3) lưu tại `docs/bản cũ/data/`.
- Thêm `public/assets/characters/test-dummy.gltf`: ma-nơ-canh kiểm thử, giấy phép CC0, tự tạo.

## [0.3.0] - 2026-11-07
### Thêm
- **Công trường ảo · Nhập vai** (`src/rpg/`, `src/rpgui/`): ứng dụng mặc định. Lần đầu vào game sẽ tới thẳng màn hình TẠO NHÂN VẬT. Studio và Công trường mẫu vẫn mở được từ màn hình chính.
- **Tạo nhân vật**: tên, vóc dáng, chiều cao, màu da, khuôn mặt, kiểu và màu tóc, trang phục, mũ / giày / áo phản quang. Xem trước 3D xoay, zoom, thử 4 animation. Đổi ngoại hình sau khi tạo trong menu Trang phục & PPE.
- **Nhân vật 3D procedural** tỷ lệ thực, khớp hông–gối–vai–khuỷu. Animation đứng / đi / chạy / tương tác theo delta-time. PPE đang mặc hiện trên người (`src/rpgui/AvatarModel.jsx`).
- **25 nghề** thuộc 5 nhóm A–E (`roles.json`). Mỗi nghề có mô tả, kỹ năng, nhiệm vụ đặc trưng, mức kinh nghiệm, trang bị, quyền truy cập, XP nghề. Đổi nghề giữ nhân vật và XP; kiểm tra năng lực (chưa đủ cấp → thực tập).
- **Chọn công trường**: 8 dự án cấu hình (`sites.json`) thuộc 8 nhóm, cộng các dự án người chơi tạo trong Studio. Hiển thị quy mô, vốn giả lập, ngày bắt đầu, tiến độ, hạng mục, thiết bị, nhân sự, chỗ trống, an toàn, điều kiện ra vào.
- **Project Workforce System**: ProjectRole theo từng dự án, đăng ký, không vượt số chỗ, gợi ý vị trí khác, chế độ thực tập, sơ đồ tổ chức. NPC luôn có nhãn NPC.
- **Điều khiển nhân vật thứ ba** (WASD, Shift chạy, chuột xoay, cuộn zoom), bước thời gian cố định:
  - Va chạm hộp xoay, bậc thang.
  - Hàng rào có lối cổng.
  - Không ra khỏi bản đồ, không xuống nước.
  - Camera chống xuyên công trình; phím C chuyển camera tự do.
- **Vùng an toàn động** 5 mức, sinh từ đối tượng theo luật (`safety.json`): cẩu, hố đào, vật rơi, thiết bị điện, không gian hạn chế, xe máy, hàn cắt, cộng vùng tĩnh (chạy thử, phá dỡ, ngăn lộ mang điện).
  - Cảnh báo 3 mức **trước** khi chạm ranh giới.
  - Chặn cứng vùng chưa đủ điều kiện; vùng cấm không vào được.
- **PPE** 10 loại: cấp phát tại ki-ốt cổng và kho, mặc/tháo, khoá PPE bắt buộc khi ở công trường.
- **PTW mô phỏng** 6 loại: chấm điều kiện an toàn, thời hạn theo thời gian chơi, người xác nhận theo thẩm quyền nghề.
- **Huấn luyện** dạng câu hỏi: an toàn đầu vào (theo công trường), nâng hạ, làm việc trên cao.
- **Dynamic Workflow Engine** với 16 mẫu quy trình:
  - Theo loại việc: đổ bê tông, lắp thép, làm đường, lắp điện, đào đất, bao che.
  - Theo vai trò: hiện trường, MEP, quản lý, BIM, Planning, QS, Procurement, Document Control, QA/QC, HSE.
  - Có bước song song, chờ điều kiện, rẽ nhánh, không đạt thì làm lại.
  - Câu hỏi sinh từ khối lượng, tiến độ, thông số thật của engine.
  - Hoàn thành công việc làm tăng tiến độ hạng mục thật.
- **Chuỗi "NGÀY ĐẦU TIÊN TẠI CÔNG TRƯỜNG"** 15 bước: đúng trình tự, có hướng dẫn, mục tiêu trên bản đồ, điều kiện hoàn thành, thưởng XP **một lần**. Sau đó có nhiệm vụ lặp theo nghề.
- **AI hướng dẫn công trường** (NPC) theo kịch bản: đi trước dẫn đường, giới thiệu dự án / vai trò / điều khiển / PPE / bản đồ / an toàn, xem lại bằng phím H. Có interface `GuideProvider` để tích hợp AI hội thoại sau.
- **Dẫn đường A\*** tránh vật cản và vùng chưa được phép; mũi tên mục tiêu, vạch dẫn đường, khoảng cách, highlight đối tượng.
- **Minimap** và **bản đồ công trường** (M): bấm nhiệm vụ hoặc điểm trên bản đồ để có tuyến.
- **InteractionSystem**: "E – …" theo nghề / quyền / trạng thái nhiệm vụ, ưu tiên đối tượng liên quan nhiệm vụ. Giữ E cho việc cần thời gian.
- **HUD tối giản**: thẻ mục tiêu với các nút "Tôi cần làm gì tiếp theo?", "Dẫn tôi đến nơi làm việc", "Xem quy trình", "Trợ giúp điều khiển". Menu Esc gồm tủ đồ, đổi nghề, đổi công trường, sơ đồ tổ chức, cài đặt (tốc độ camera, độ nhạy chuột, chế độ người mới / khám phá), chỉnh sửa công trình cho nghề có quyền.
- **Kiểm thử**:
  - `npm run test:rpg`: 116 ca, gồm 10 bot tự chơi chuỗi nhập môn bằng bộ điều khiển nhân vật thật.
  - Lệnh gộp `npm run check` thêm `test:rpg`.
### Thay đổi
- `src/Root.jsx` có thêm ứng dụng `rpg` (mặc định). Màn hình bắt đầu Studio và Công trường mẫu có nút sang chế độ nhập vai.
- Quy tắc:
  - `docs/01 RULE AGENTS.md` thêm Phần D.
  - `docs/02 RULE UXUI.md` thêm mục 10.
  - `docs/03 RULE CHANGELOG.md` bổ sung quy tắc cho nhập vai.
  - Bản v0.2.0 của quy tắc, README, CLAUDE lưu tại `docs/bản cũ/`.
### Sửa lỗi
- Khi phát triển, phát hiện và sửa (trước khi phát hành):
  - Ở địa hình sông nước, ki-ốt PPE có thể bị đặt xuống sông.
  - Ở công trường sát mép bản đồ, điểm xuất hiện có thể nằm ngoài bản đồ.
  - Công trình phụ trợ có thể rơi vào vùng rủi ro.
  - Nghề HSE và Procurement bị kẹt ở bước nhập môn "Đến khu vực được phép".
  - Tuyến dẫn đường dừng ngoài vùng tương tác.
### Dữ liệu
- Hồ sơ người chơi mới `ctao.rpg`, `RPG_VERSION = 1` (`src/rpg/schema.js`), lưu ở `localStorage['ctao.rpg.profile']`. Có migration từ hồ sơ nháp v0 và tự sửa dữ liệu hỏng.
- Dữ liệu cấu hình mới trong `src/rpg/data/`: `avatar`, `ppe`, `roles`, `safety`, `permits`, `trainings`, `workflows`, `missions`, `dialogues`, `sites`.
- Tiến độ người chơi đóng góp lưu theo id nút (`sites[key].delta`). Dự án Studio (`ctao.project`) và dữ liệu Công trường mẫu không đổi định dạng.

## [0.2.0] - 2026-11-07
### Thêm
- **SITE 3D Studio**: nền tảng mô phỏng xây dựng 3D tự do (Vertical Slice). Công trình được tạo từ cấu kiện và tham số, không dùng bố cục hay mô hình cố định. Ứng dụng mặc định khi mở; Công trường mẫu v0.1 vẫn mở được từ màn hình bắt đầu (`src/Root.jsx`).
- **Engine thuần JS** (`src/engine/`), dùng chung cho mọi loại dự án: ObjectRegistry, ParametricGeometryEngine, TerrainEngine, PlacementSystem, ProjectManager (lệnh + Undo/Redo), ConstructionSimulationEngine, ResourceManager, EconomyManager, MissionManager, SaveManager, schema có version.
- **TẠO DỰ ÁN MỚI**: 11 nhóm loại hình (chỉ để gợi ý); tên dự án, công ty; bản đồ 50–4.000 m mỗi chiều; 7 kiểu địa hình (bằng, đồi núi, ven biển, sông nước, công nghiệp, đô thị, tuỳ chỉnh); 4 hình dạng ranh giới; số khu vực tạo sẵn; ngân sách; thời gian mục tiêu; chế độ Đơn giản / Nâng cao. Luôn bắt đầu từ bản đồ trống.
- **34 loại đối tượng** trong Thư viện (25 công trình/cấu kiện + 9 máy thi công):
  - Công trình tham số: toà nhà nhiều tầng (số tầng, chiều cao tầng, mặt bằng, bước cột, tiết diện, bao che, loại móng), nhà xưởng khung thép nhiều nhịp (dài, khẩu độ, chiều cao, bước cột, độ dốc, xà gồ, vách), cầu dầm nhiều nhịp.
  - Móng: đơn, băng, bè, cọc + đài.
  - Kết cấu: cột/dầm bê tông, cột/dầm thép, sàn, cầu thang, giá đỡ/pipe rack.
  - Bao che & mái: tường gạch/bê tông/vách kính, mái công nghiệp.
  - Hạ tầng: đường, mặt bằng thi công, hố ga, mương.
  - Công nghệ: bồn chứa, tuyến ống, máng cáp, bệ máy, thiết bị điện–cơ.
  - 9 máy thi công: cẩu tháp, cẩu bánh xích, máy xúc, máy ủi, xe ben, xe trộn, xe bơm, xe nâng, máy đóng cọc.
- **Trình chỉnh sửa công trường 3D**:
  - Chọn bằng chuột, chọn nhiều; gizmo di chuyển/xoay; sửa kích thước bằng tham số với mô hình cập nhật tức thì; nhân bản, xoá, Undo/Redo.
  - Lưới vẽ trên địa hình; bắt dính lưới, đối tượng, mặt đất.
  - Nhóm/bỏ nhóm, phân cấp linh hoạt (khu vực → hạng mục → công trình → hệ thống → gói công việc) kéo thả trong cây; khoá, ẩn/hiện.
  - Lớp hiển thị theo loại; xem mặt bằng, phối cảnh, cắt theo cao độ; tìm kiếm và lọc đối tượng.
- **Địa hình**: bút đắp, đào, san phẳng, làm mịn; mỗi nét là một bước Undo; tính khối lượng đào/đắp; địa hình chia chunk.
- **Mô phỏng thi công chung**:
  - Mỗi đối tượng có trình tự hoạt động sinh từ cấu kiện; khối lượng, vật tư và công tính tự động.
  - Tổ đội theo 5 kỹ năng. Máy tác động theo phạm vi; thiếu cẩu thì cấu kiện cao hơn 12 m làm chậm.
  - Chi phí theo ngày, thanh toán theo đợt, thưởng bàn giao, XP và cấp mở khoá, 8 nhiệm vụ.
  - Mô hình hiện dần từng cấu kiện theo tiến độ; công nhân và máy chuyển động khi đang làm việc.
- **Lưu & mở**: lưu trong trình duyệt (kèm tự lưu mỗi 60 giây), xuất/nhập tệp `.ctao.json`.
- **Giao diện**: thanh trên (tiền, XP, ngày, Chỉnh sửa/Vận hành, tốc độ ×1–×10), panel trái/phải/dưới thu gọn được, phóng to vùng 3D, lưu bố cục, 3 mức chất lượng đồ hoạ, ngày/đêm, bầu trời và vật liệu PBR.
- **Dự án kiểm thử**: toà nhà 25 tầng và nhà xưởng thép 10 nhịp trên cùng công trường, dựng hoàn toàn bằng lệnh công khai của engine.
- **Kiểm thử**: `npm run test:engine` (39 ca, chạy bằng Node, không cần trình duyệt); lệnh gộp `npm run check`.
- `README.md`.
### Thay đổi
- `src/main.jsx` gắn `Root` thay cho `App`. `App.jsx` (Công trường mẫu) giữ nguyên.
- Quy tắc: thêm Phần C vào `docs/01 RULE AGENTS.md` (kiến trúc engine, tính nhất quán, cách thêm loại đối tượng); thêm mục 9 vào `docs/02 RULE UXUI.md` (Studio); bổ sung `docs/03 RULE CHANGELOG.md`. Bản v0.1.0 của các quy tắc lưu tại `docs/bản cũ/`.
### Dữ liệu
- Định dạng dự án mới `ctao.project`, `SCHEMA_VERSION = 1` (`src/engine/schema.js`):
  - Tách **thiết kế** (`doc`, có Undo/Redo) và **vận hành** (`sim`).
  - Id `OBJ-/EQ-/GRP-nnnn` cấp bởi `doc.seq`, không tái sử dụng.
  - Có khung migration (`MIGRATIONS`) cho các phiên bản sau.
- Kiểm tra tính nhất quán chạy trước mọi lệnh sửa, khi lưu và khi mở. Khi mở/nhập, dữ liệu sai được tự sửa: tham số ngoài khoảng, loại không hỗ trợ, nút cha mất, vòng lặp phân cấp, trạng thái mô phỏng của đối tượng đã xoá.
- Khoá localStorage mới: `ctao.studio.index`, `ctao.studio.p.<id>`, `ctao.studio.layout`, `ctao.app`. Dữ liệu Công trường mẫu (`ctao.patches.v1`) không đổi.

## [0.1.0] - 2026-11-07
### Thêm
- Công trường ảo 3D cho siêu dự án *Trung tâm Điện khí LNG Hải Đăng (demo)* (React 18 + three.js qua @react-three/fiber). Mặt bằng khoảng 130 × 95 m gồm bờ biển, hàng rào, đường nội bộ, cổng chính, cây xanh.
- 8 hạng mục thi công có **mô hình mọc theo tiến độ** (`src/scene/Structures.jsx`): 2 bồn LNG (tường bê tông lên theo đợt, mái vòm), nhà tua-bin (cột → giàn mái → mái → bao che), HRSG và ống khói, TBA 500kV (cột cổng → MBA → máy cắt → dây), cầu cảng (cọc → bản mặt → bến → tay xuất nhập), pipe rack, nhà điều hành 9 tầng. Thêm 5 công trình phụ trợ: Ban chỉ huy, nhà ăn, bãi vật tư, cổng & trạm HSE, trạm trộn bê tông.
- 26 nhân lực ảo có mũ bảo hộ theo màu nhà thầu và áo phản quang. Nhân lực đi thi công, đi kiểm tra, họp tại Ban chỉ huy, nghỉ ở nhà ăn; đi theo mạng đường nội bộ (Dijkstra trong `src/scene/layout.js`); nói chuyện bằng bong bóng thoại.
- 10 thiết bị có chuyển động: cẩu tháp (quay cần, chạy xe con, nâng hạ móc), cẩu bánh xích, máy đào, sà lan cẩu nổi trên sóng, xe tải và xe bồn chạy theo tuyến. Thiết bị ở trạng thái bảo dưỡng bật đèn đỏ.
- Thanh trên: lọc gói thầu; KPI tiến độ dự án (thực tế/kế hoạch), nhân lực, số ngày an toàn từ LTI gần nhất, NCR mở, PTW chờ duyệt.
- Dock 4 tab Hạng mục · Gói thầu · Nhân lực · Thiết bị. Panel chi tiết theo id có view riêng cho Hạng mục, Nhân lực, Gói thầu, Nhà thầu, Thiết bị, cùng view chung cho các bảng còn lại.
- Cập nhật % công việc (±10%) và **nghiệm thu** ngay trong panel; khối 3D thay đổi theo.
- Màn hình Tiến độ (Gantt) theo hạng mục, có mốc tiến độ, vạch hôm nay, SPI.
- Màn hình An toàn & Chất lượng: duyệt/từ chối/đóng PTW, chuyển trạng thái và đóng NCR, đóng quan sát HSE.
- Màn hình Cơ sở dữ liệu: tra cứu theo id, xem từng bảng, khôi phục dữ liệu gốc.
- Chế độ Tham quan tự bay qua từng hạng mục; ca ngày/đêm với đèn pha công trường; bật/tắt tên nhân lực; giao diện sáng/tối; tạm dừng mô phỏng.
- Nhật ký công trường thời gian thực.
- Quy tắc dự án: `docs/01 RULE AGENTS.md`, `docs/02 RULE UXUI.md`, `docs/03 RULE CHANGELOG.md`.
### Dữ liệu
- 13 bảng JSON tách riêng trong `src/data/`, tham chiếu nhau bằng id: `PRJ`, `PKG`, `CTR`, `ROLE`, `ZONE`, `RT`, `WK`, `EQ`, `TSK`, `MS`, `HSE`, `NCR`, `PTW`. Lời thoại và mẫu sinh HSE/PTW nằm trong `dialogues.json`.
- Cấu trúc bảng khai báo **một nơi duy nhất** là `src/data/schema.json`, dùng chung cho ứng dụng và `scripts/check-data.mjs`.
- % hạng mục, gói thầu và dự án **được tính** từ `tasks.json` (`src/store/metrics.js`), không lưu trùng.
- Thay đổi khi chạy được lưu thành bản vá theo id trong localStorage (`ctao.patches.v1`). File JSON gốc không bị sửa.
- Script `npm run check:data` kiểm tra id, tham chiếu, `kind` có bộ dựng, hạng mục có công việc, ngày bắt đầu/kết thúc, xe có tuyến.
