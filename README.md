# SITE 3D · Công trường ảo

Trò chơi và nền tảng mô phỏng xây dựng 3D chạy trên trình duyệt (React 18 + three.js / @react-three/fiber + Vite). Gồm ba ứng dụng trong cùng project:

| Ứng dụng | Thư mục | Mô tả |
|---|---|---|
| **Công trường ảo · Nhập vai** (v0.4, mặc định) | `src/rpg/`, `src/rpgui/` | Màn hình tạo nhân vật điện ảnh (ngoại hình, trang phục, PPE, phụ kiện, studio 3D), chọn nghề (25 nghề), chọn công trường (8 dự án cấu hình + dự án tự tạo trong Studio), đi lại tự do, AI hướng dẫn, nhiệm vụ nhập môn, quy trình thi công theo nghề, vùng an toàn, PPE, PTW mô phỏng. |
| SITE 3D Studio (v0.2) | `src/engine/`, `src/studio/` | Tạo dự án bất kỳ từ bản đồ trống. Công trình sinh từ **cấu kiện + tham số**. Tổ chức thi công, tổ đội, máy móc, chi phí. Lưu/mở dự án. |
| Công trường mẫu (v0.1) | `src/data/`, `src/scene/`, `src/ui/`… | Công trường LNG dựng sẵn (demo), dữ liệu JSON theo id. Giữ nguyên để tham khảo. |

> **Phạm vi mô phỏng.**
> - Quy trình thi công, PPE, giấy phép làm việc (PTW), huấn luyện và vùng an toàn trong game là **mô phỏng học tập, đã đơn giản hoá cho gameplay**. Đây không phải biện pháp thi công được phê duyệt, không phải hệ thống cấp phép, và không thay thế kiểm soát an toàn thực tế.
> - Thông số hình học, đơn giá và định mức là số liệu gameplay.
> - Mọi NPC đều có nhãn "NPC". Game **chưa** có chế độ nhiều người chơi.

## Chạy

```bash
npm install
npm run dev          # http://127.0.0.1:5200
npm run check        # dữ liệu mẫu + kiểm thử engine + kiểm thử nhập vai + build
npm run test:engine  # 39 ca kiểm thử engine Studio (Node)
npm run test:rpg     # 149 ca kiểm thử nhập vai, gồm 10 bot tự chơi (Node, ~1–2 phút)
npm run build        # đóng gói vào dist/  →  npm run preview
```

## Công trường ảo · Nhập vai (v0.4)

### Chơi thử (khoảng 5 phút)
1. Lần đầu mở game sẽ vào thẳng màn hình **TẠO NHÂN VẬT** (bố cục điện ảnh 3 cột, xem mục dưới). Đặt tên ở tab Thông tin, tuỳ chỉnh ngoại hình, trang phục, PPE, phụ kiện; xoay/zoom studio 3D và thử animation. Bấm **Tiếp tục: Chọn nghề** (nút vàng).
2. **BẠN MUỐN LÀM CÔNG VIỆC GÌ?** Chọn trong 25 nghề thuộc 5 nhóm (Quản lý · Kỹ thuật · Quản trị dự án · Kiểm soát · Thi công). Mỗi nghề có mô tả, kỹ năng, nhiệm vụ đặc trưng, trang bị, quyền truy cập và XP nghề.
3. **CHỌN CÔNG TRƯỜNG.** Mỗi thẻ hiện quy mô, vốn giả lập, tiến độ, hạng mục, nhân sự, chỗ trống, trạng thái an toàn và điều kiện ra vào. Vị trí đã đủ người sẽ được gợi ý vị trí khác hoặc chế độ thực tập.
4. Bạn xuất hiện **ngoài cổng**. Làm theo thẻ mục tiêu, bấm **🧭 Dẫn tôi đến nơi làm việc** (nhân vật tự đi), hoặc **bấm chuột phải vào mặt đất** để tự đi tới bất kỳ đâu trong tầm với:
   - Gặp **AI hướng dẫn** (E).
   - Kiểm tra PPE ở ki-ốt.
   - Làm bài huấn luyện an toàn.
   - Mở bản đồ (M).
   - Qua cổng tới Văn phòng chỉ huy và nhận nhiệm vụ.
   - Thực hiện quy trình theo nghề (bản vẽ, vật tư, PPE, PTW nếu cần, thi công/kiểm tra, nghiệm thu, báo cáo).
5. Xong "Ngày đầu tiên" thì có thể nhận nhiệm vụ mới ở văn phòng bất cứ lúc nào, hoặc tự do tham quan các khu vực được phép.

**Giao diện trong công trường (HUD tối giản):** góc trái trên là thẻ mục tiêu hiện tại; góc phải trên là minimap và **dải "Giai đoạn thi công / nhiệm vụ"** (tên bước + trạng thái ✔/●/○/✗, bấm vào xem chi tiết) — không phải kiểu đánh số vô nghĩa. Cảnh báo vùng hiện giữa màn hình khi tới gần. Menu (Esc) → Cài đặt có tuỳ chọn **chất lượng đồ hoạ Thấp / Trung bình / Cao**.

### Màn hình tạo nhân vật (v0.4)
| Vùng | Nội dung |
|---|---|
| Trái | Hành trình 4 bước: Tạo nhân vật · Chọn nghề · Chọn công trường · Bắt đầu hành trình. Có thanh tiến độ, thu gọn được; quay lại bước trước không mất dữ liệu |
| Giữa | Studio 3D: bệ tròn, bối cảnh công trường (khung thép, cẩu tháp, nhà xưởng, container, máy đào ở chất lượng Cao), ánh sáng Key/Fill/Rim, bóng tiếp xúc, tone mapping ACES. Góc xem **Toàn thân / Khuôn mặt / Chi tiết PPE**, ⟲ đặt lại, ? hướng dẫn camera. Animation **Đứng / Đi bộ / Chạy / Tương tác** |
| Phải | 5 tab: **Thông tin** (tên, mã `NV-xxxx` tự sinh, dáng người Nam/Nữ, vị trí hiện tại, mẫu nhanh, 🎲 ngẫu nhiên, bộ dựng nhân vật, ánh sáng Ngày / Studio công nghiệp / Công trường, chất lượng Thấp / Trung bình / Cao) · **Ngoại hình** (chiều cao, vai, tỷ lệ thân, thể hình, khuôn mặt, mắt, mũi, miệng, râu, da, tóc, màu tóc) · **Trang phục** (8 bộ: kỹ sư, công nhân, giám sát, HSE, QA/QC, quản lý, khách tham quan, áo liền quần; màu áo/quần, logo) · **Bảo hộ PPE** (15 món theo 6 nhóm, màu/kiểu mũ, màu áo phản quang, màu giày) · **Phụ kiện** (7 món, chỉ ngoại hình) |

- **Tự lưu**: chưa có hồ sơ thì lưu **bản nháp** (`ctao.rpg.characterDraft`), tải lại trang vẫn còn; đã có hồ sơ thì lưu thẳng vào hồ sơ. **↺ Khôi phục mặc định** có xác nhận, giữ tên và mã.
- **PPE được công nhận = đã được cấp + đang mặc.** Món chưa cấp chỉ **xem thử** (viền vàng nét đứt, ghi "không được công nhận"); không mở được vùng, không qua được kiểm tra cổng. Mặc món xung đột (cùng vị trí hoặc khai báo `conflicts`) sẽ tự tháo món cũ và báo trước. Màu mũ theo vị trí chỉ áp dụng khi dự án quy định (`sites.json → ppePolicy`, ví dụ công trường dầu khí S-OG-01).
- Mở lại: màn hình chính → **☺ Tùy chỉnh nhân vật**; trong game: **Esc → Trang phục & PPE** (cùng bộ tuỳ chỉnh, PPE bắt buộc bị khoá 🔒).
- Phím trong studio: kéo chuột xoay · cuộn zoom (giới hạn 1,6–6 m, khuôn mặt tối thiểu 0,55 m) · ← → ↑ ↓ · + − · 1/2/3 góc xem · R đặt lại.
- **Nhân vật là mô hình dựng thủ tục bán thực tế** (thân tròn, mặt có mắt/mũi/miệng, ngón tay, khớp gối, giày có đế, mũ có vành & quai cằm), **không phải photorealistic**. Kiến trúc cho phép thay bằng model GLB/GLTF có rig: xem `public/assets/characters/README.md` và `src/rpg/data/characterAssets.json`. Mở `?dev=1` để thử ma-nơ-canh GLTF kiểm thử (CC0, tự tạo bằng `node scripts/make-test-gltf.mjs`), nạp qua `useGLTF` + `AnimationMixer` (crossfade 0,25 s); các nhóm tuỳ chọn mà model đó không hỗ trợ tự **khoá 🔒** kèm lý do.

### Điều khiển
| Phím | Tác dụng | Phím | Tác dụng |
|---|---|---|---|
| W A S D · ↑ ← ↓ → | Đi (đọc phím vật lý, dùng được khi bật bộ gõ tiếng Việt) | E | Tương tác (giữ E với việc cần thời gian) |
| Shift | Chạy | M | Bản đồ công trường (bấm lên bản đồ để tìm tuyến) |
| Bấm trái vào cảnh rồi di chuột (Esc thả chuột) · hoặc giữ & kéo · cuộn | Xoay camera · zoom | J | Danh sách nhiệm vụ |
| **Chuột phải vào mặt đất** | **Tự đi tới đó** (click-to-move, tránh vật cản & vùng chưa được phép) | H | Xem lại hướng dẫn |
| C | Camera thứ ba ↔ tự do | | |
| Esc | Menu: tủ đồ & PPE, đổi nghề, đổi công trường, sơ đồ tổ chức, cài đặt (tốc độ camera, độ nhạy chuột, chế độ người mới / khám phá), chỉnh sửa công trình (nghề có quyền) | | |

### Kiến trúc
- `src/rpg/`: logic **thuần JS**, kiểm thử bằng Node.
  - Hệ thống: AvatarCustomization · Appearance · Outfit · CharacterAssetRegistry · AvatarSaveAdapter · RoleManagement · ProjectSelection · ProjectWorkforce · WorldBuilder · CharacterController (+ CollisionWorld) · SafetyZone · PPEManagement (PPE Equipment) · PTWSimulator · Navigation · DynamicWorkflowEngine · Mission · Tutorial (+ NPC) · Minimap · Save.
  - Điều phối chung là **GameSession** (kèm InteractionSystem).
- `src/rpg/data/*.json`: nghề, công trường, luật vùng an toàn, mẫu quy trình, nhiệm vụ, PPE, PTW, huấn luyện, ngoại hình (`appearance`), trang phục (`outfits`), phụ kiện, mẫu nhân vật, bộ dựng nhân vật (`characterAssets`), hội thoại. **Không hardcode** trong code.
- `src/rpgui/`: React + three. Dùng lại renderer của Studio (địa hình, cấu kiện, máy móc).
- `src/rpgui/character/`: màn hình tạo nhân vật, studio 3D, camera, các tab, `AvatarRenderer` (điểm thay model: procedural ↔ GLB), `ProceduralAvatar`, `GltfAvatar`, `CharacterAnimationController`. Studio 3D được nạp lười (chunk riêng).
- Thế giới được dựng **bằng engine Studio**:
  - Mặt bằng mỗi công trường sinh từ cấu hình.
  - Cổng, ki-ốt PPE, văn phòng, kho, bảng HSE, bảng bản vẽ được **tự đặt** theo ranh giới và địa hình, né vật cản, nước và vùng rủi ro.
  - Va chạm, vùng an toàn, dẫn đường suy ra từ hộp bao đối tượng.
  - Hoàn thành công việc làm **tăng tiến độ thật** của hạng mục (thấy ngay trên mô hình 3D).
- Hồ sơ `ctao.rpg` **version 2** có migration (v0 → v1 → v2, giữ tên, nghề, XP, nhiệm vụ, PPE) + tự sửa, lưu cùng quy ước với Studio.

Chi tiết quy tắc: `docs/01 RULE AGENTS.md` **Phần D**, `docs/02 RULE UXUI.md` **mục 10**.

### Đã triển khai và chạy thật
- Màn hình tạo nhân vật điện ảnh (v0.4) như mô tả ở trên; tủ đồ trong game dùng chung bộ tuỳ chỉnh. Nhân vật procedural bán thực tế; animation đứng / đi / chạy / tương tác nội suy mượt theo delta-time; PPE, trang phục, phụ kiện hiện trên người cả trong studio lẫn trong công trường; NPC cũng dùng bộ dựng mới với ngoại hình từ `characterPresets.json`.
- 25 nghề lấy từ dữ liệu. Đổi nghề giữ nhân vật và XP, cập nhật nhiệm vụ/quyền. Có kiểm tra năng lực (chưa đủ cấp → thực tập).
- 8 công trường cấu hình thuộc 8 nhóm (dân dụng, công nghiệp, hạ tầng, giao thông, năng lượng, dầu khí, ngầm, hỗn hợp) và công trường từ dự án Studio. Mỗi công trường có mặt bằng, địa hình, nhân sự riêng.
- Hệ thống nhân sự: ProjectRole, chỗ trống, đăng ký, không vượt số chỗ, gợi ý vị trí khác, thực tập, sơ đồ tổ chức.
- Điều khiển nhân vật thứ ba WASD/Shift, bước thời gian cố định:
  - Va chạm hộp xoay, bậc thang.
  - Hàng rào chỉ qua được ở lối cổng.
  - Không ra khỏi bản đồ, không xuống nước.
  - Camera chống xuyên công trình; camera tự do.
- Vùng an toàn động 5 mức (an toàn, hạn chế, cần giấy phép, nguy hiểm, cấm):
  - Sinh từ cẩu, hố đào, khu vật rơi, thiết bị điện, bồn kín, xe máy…
  - Cảnh báo 3 mức **trước** khi chạm ranh giới.
  - Chặn cứng vùng chưa đủ điều kiện; vùng cấm không bao giờ vào được.
- PPE (15 món, 6 nhóm): cấp phát, mặc/tháo, xung đột, món thay thế (`satisfies`), chỉ công nhận món đã cấp + đang mặc, khoá PPE bắt buộc khi ở công trường, màu mũ theo quy định dự án; hộp thoại kiểm tra PPE cho nhận thêm PPE tuỳ chọn.
- PTW mô phỏng (6 loại): chấm điều kiện, thời hạn, người xác nhận theo thẩm quyền nghề.
- Huấn luyện dạng câu hỏi.
- Chuỗi **NGÀY ĐẦU TIÊN TẠI CÔNG TRƯỜNG** 15 bước: đúng trình tự, xem lại hướng dẫn được, không nhận thưởng trùng.
- Dynamic Workflow Engine:
  - 16 mẫu quy trình, gồm 6 theo loại việc (đổ bê tông, lắp thép, làm đường, lắp điện, đào đất, bao che) và 10 theo vai trò.
  - Hỗ trợ bước song song, chờ điều kiện, rẽ nhánh, nghiệm thu không đạt thì làm lại.
  - Câu hỏi sinh từ số liệu engine.
- AI hướng dẫn theo kịch bản có interface `GuideProvider` để thay bằng AI hội thoại sau này. Có mũi tên mục tiêu màu xanh lá, vạch dẫn đường, khoảng cách, highlight đối tượng.
- **Click-to-move**: chuột phải vào mặt đất, hoặc nút "🧭 Dẫn tôi đến nơi làm việc" → nhân vật **tự đi** theo tuyến A* (né vật cản & vùng chưa được phép), bấm WASD bất cứ lúc nào để giành lại quyền điều khiển ngay.
- Minimap và bản đồ công trường: bấm nhiệm vụ hoặc điểm trên bản đồ để có tuyến A* tránh vật cản và vùng chưa được phép.
- Lưu tự động và lưu tay; tiếp tục đúng vị trí và tiến trình.
- Mở **chế độ chỉnh sửa công trình** (Studio) với nghề có quyền.

### Kết quả kiểm thử (v0.4.0)
| Bộ kiểm thử | Kết quả |
|---|---|
| `npm run test:rpg` (Node) | **149/149**. Gồm 10 bot tự chơi hết chuỗi nhập môn bằng bộ điều khiển nhân vật thật, với 10 nghề trên 8 công trường; migration hồ sơ v1 → v2; PPE được công nhận / xem thử / xung đột / món thay thế; quy định màu mũ theo dự án; click-to-move: tự đi tới đích, nút dẫn đường tự đi, WASD giành quyền điều khiển ngay; đủ 6 NPC để gặp |
| `npm run test:engine` (Node) | **39/39** (Studio không bị ảnh hưởng) |
| `npm run check:data` | Công trường mẫu v0.1 hợp lệ |
| `npm run build` | **Thành công.** Dùng `rollup` bản WASM chính thức (`@rollup/wasm-node`, xem `package.json → overrides`) để tránh file nhị phân gốc `.node` bị một số chính sách Application Control của Windows chặn — không đổi phiên bản Vite, không tắt chính sách bảo mật nào |
| E2E Chrome, bản build | Màn hình tạo nhân vật **54/54** · luồng chơi nhập vai **17/17** · click-to-move chuột phải (đo trực tiếp quãng đường di chuyển, không bấm phím) · dải giai đoạn thi công hiển thị đúng tên/trạng thái · đổi chất lượng đồ hoạ Cao không gây lỗi · console sạch |

### Chưa triển khai (giới hạn hiện tại)
- **Chưa có** multiplayer. NPC đứng tại chỗ theo vị trí cố định (AI hướng dẫn, kỹ sư, thủ kho, HSE, tổ trưởng, QA/QC) — chỉ AI hướng dẫn đi dẫn đường; chưa có lịch làm việc hay tự di chuyển trong ngày.
- **Chưa có** AI hội thoại động: hội thoại theo kịch bản, đã có interface để tích hợp.
- PTW, PPE, huấn luyện, vùng an toàn là **mô phỏng cơ bản**, không phải hệ thống an toàn thực.
- Nhân vật mặc định vẫn là mô hình **procedural bán thực tế**, không phải photorealistic; thiết bị vẫn là mô hình procedural. Tay/chân/cổ dựng bằng `LatheGeometry` thon liền mạch có phồng cơ tự nhiên (không còn capsule + khớp hình cầu rời rạc kiểu đồ chơi lắp ghép). Đường nạp GLB/GLTF có rig + AnimationMixer đã có và đã kiểm thử, có 2 model GLB nhân vật thật (sở hữu dự án, chọn thủ công ở tab Thông tin, không phải mặc định):
  - **"Công nhân bảo hộ"** (`cong_nhan_bao_ho_lien_mach.glb`): **không có rig/skin, không có animation clip** — đứng yên, không có idle/walk/run riêng.
  - **"Công nhân công trường (có animation)"** (`cong_nhan_cong_truong_animated.glb`): có rig xương cứng + clip **Idle/Walk/Run** thật, chuyển animation đúng theo trạng thái di chuyển (đã kiểm thử bằng Chrome thật).
  - Cả hai: PPE (nón, vest, giày) tạc liền khối nên không tách rời theo hệ thống PPE tuỳ biến. `GltfAvatar.jsx` tự tính bbox thật để đặt chân xuống đất, không cần asset khai báo gốc rig ở đâu.
- Model GLTF hiện chỉ đổi được màu da và chiều cao (riêng `gltf-test-dummy` còn gắn được mũ bảo hộ qua node `attach.head`); các PPE khác, trang phục, khuôn mặt chỉ có ở bộ dựng procedural (UI khoá kèm lý do).
- Môi trường PBR dựng bằng Lightformer tại chỗ, không dùng ảnh HDR (dự án chưa có tệp HDR hợp lệ).
- **Đồ hoạ công trường vẫn là hình khối procedural** (địa hình, công trình, hàng rào, công trình phụ trợ dựng bằng geometry + vật liệu PBR cơ bản — xem Studio engine), **chưa phải mô hình chi tiết "Realistic 3D Construction Simulator"** (chưa có texture vật liệu chi tiết bê tông/thép gỉ/đất gồ ghề, chưa có model thật cho vật tư/thiết bị). Lần nâng cấp này chỉ bổ sung: tuỳ chọn chất lượng đồ hoạ Thấp/Trung bình/Cao, phản chiếu môi trường PBR nhẹ ở mức Cao, bóng tiếp xúc, tăng phơi sáng. Thay toàn bộ vật liệu/texture bằng bộ chi tiết hơn là việc lớn hơn nhiều, chưa làm trong lần này.
- Máy móc (cẩu, máy xúc, xe tải…) đã có chuyển động hoạt động thật khi đang được dùng (xoay cần, đào, đổ hàng…) từ trước; NPC công nhân đi lại và có animation đi/đứng; chưa có animation "đang thao tác" riêng cho từng công việc.
- Chưa có góc nhìn thứ nhất, thời tiết, ngày/đêm trong chế độ nhập vai.
- Không vào được bên trong công trình nhiều tầng (công trình là vật cản). Cầu thang đi được khi là cấu kiện rời.
- Minigame thi công ở mức "giữ E" và chọn đáp án/điều kiện.
- Chỉnh sửa công trình từ chế độ nhập vai mở **bản sao** trong Studio; chưa đồng bộ ngược vào công trường cấu hình.
- Vùng an toàn trên địa hình dốc vẽ phẳng theo cao độ tâm vùng.

### Bước nâng cấp tiếp theo (đề xuất)
1. NPC có lịch làm việc và di chuyển; tổ đội NPC thi công cùng người chơi.
2. Thêm minigame theo nghề (căn chỉnh, đo đạc, đọc bản vẽ); thêm nhiều quy trình và nhiệm vụ chuỗi theo giai đoạn dự án.
3. Vào được sàn công trình nhiều tầng (sàn đi được theo tầng đã thi công, mép sàn = vùng nguy hiểm).
4. Tích hợp `GuideProvider` với AI hội thoại (có giới hạn nội dung an toàn).
5. Thêm model GLB người thật có rig + clip (có giấy phép) vào `characterAssets.json`; ngày/đêm, thời tiết; sau đó là multiplayer.

---

## SITE 3D Studio (v0.2)

### Thử nhanh Vertical Slice (khoảng 3 phút)

1. Màn hình bắt đầu → **＋ TẠO DỰ ÁN MỚI**. Chọn kích thước bản đồ (ví dụ 800 × 500 m), địa hình *Đồi núi*, ranh giới *Chữ L* → **Tạo dự án**. Dự án mở ra với bản đồ trống.
2. Tab **Thư viện** → **Toà nhà nhiều tầng** → bấm lên mặt đất. Panel phải hiện form thông số: kéo *Số tầng* lên 25 để thấy mô hình sinh lại ngay.
3. **Nhà xưởng khung thép** → đặt bên cạnh. Đổi *Chiều dài* từ 100 lên 150 m: số khung tự tăng từ 11 lên 16.
4. Kéo gizmo để di chuyển (W), xoay (E). **Ctrl+Z / Ctrl+Y** để hoàn tác/làm lại. **Ctrl+D** để nhân bản, **Delete** để xoá.
5. Thư viện → **Cẩu tháp** → đặt cạnh toà nhà. Vòng vàng là phạm vi cẩu; cấu kiện cao hơn 12 m mà không có cẩu thì làm rất chậm.
6. **▶ Vận hành** (chế độ Đơn giản tự khởi công và tự tuyển tổ), chọn **×10**. Công trình hiện dần từng cấu kiện; tiền, XP, ngày và nhật ký thay đổi theo.
7. **💾 Lưu** → tải lại trang → **📂 Mở dự án**: mọi thứ được khôi phục, kể cả tiến độ và địa hình đã chỉnh.

Hoặc bấm **🧪 Dự án kiểm thử** để mở sẵn toà 25 tầng và nhà thép 10 nhịp trên cùng công trường.

### Phím tắt

| Phím | Tác dụng | Phím | Tác dụng |
|---|---|---|---|
| Q / W | Chọn & di chuyển | Ctrl+Z / Ctrl+Y | Hoàn tác / làm lại |
| E | Xoay | Ctrl+D | Nhân bản |
| T | Bút địa hình | Ctrl+G / Ctrl+Shift+G | Nhóm / bỏ nhóm |
| G | Bật/tắt lưới | Delete | Xoá |
| F | Camera tới đối tượng | Ctrl+S | Lưu |
| P | Mặt bằng ↔ phối cảnh | Esc | Huỷ công cụ / bỏ chọn |
| Mũi tên | Bay camera | Space | (Vận hành) tạm dừng / tiếp tục |

### Kiến trúc

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

#### Dữ liệu dự án (`ctao.project`, version 1)
- `doc` (thiết kế, có Undo/Redo): `meta`, `site` (kích thước, ranh giới, địa hình), `nodes` (id → `{ type, name, parentId, t:{p,ry}, params, locked, hidden }`).
- `sim` (vận hành, không Undo): ngày, tiền, XP, tổ đội, tiến độ từng nút, nhiệm vụ, nhật ký.
- Lưu trình duyệt: `localStorage` (`ctao.studio.*`). Xuất/nhập: tệp `.ctao.json`. Mở tệp cũ: migrate → tự sửa → kiểm tra.

### Quy tắc dự án
- `docs/01 RULE AGENTS.md`: quy tắc cho AI lập trình, nhân lực ảo (v0.1) và kiến trúc Studio (Phần C)
- `docs/02 RULE UXUI.md`: token, thành phần, cảnh 3D; mục 9 dành cho Studio
- `docs/03 RULE CHANGELOG.md`: cách ghi `CHANGELOG.md`

### Giới hạn hiện tại (v0.2.0)
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

### Bước nâng cấp tiếp theo (đề xuất)
1. **Giai đoạn 2, hoàn thiện tham số:** công cụ thông minh của chế độ Đơn giản (vẽ khung chữ nhật để tạo nhà; đường đa điểm), lõi thang và ô mở sàn cho toà nhà, cầu trục và giằng cho nhà thép, bắt dính theo nút cấu kiện, chọn nhiều + gizmo nhóm.
2. **Giai đoạn 3, mô phỏng sâu:** kho vật tư (mua, tồn, giao nhận bằng xe ben/xe trộn chạy trên đường); máy và công nhân di chuyển giữa công trình; ràng buộc trình tự giữa các đối tượng (móng trước cột); Gantt và đường găng; đào đắp có chi phí và thời gian.
3. **Giai đoạn 4, mega project:** tải chunk theo vùng nhìn và LOD, Web Worker cho mô phỏng, thay mô hình bằng GLB, thời tiết, góc nhìn thứ nhất, lưu trên máy chủ để nhiều người cùng xem.
