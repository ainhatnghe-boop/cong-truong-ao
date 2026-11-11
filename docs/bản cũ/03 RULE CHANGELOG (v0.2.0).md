# 03 · RULE CHANGELOG

File nhật ký thay đổi: `CHANGELOG.md` ở thư mục gốc. Định dạng theo *Keep a Changelog*, đánh số phiên bản theo *SemVer*.

## 1. Khi nào phải ghi
Ghi mọi thay đổi người dùng **nhìn thấy được** hoặc **ảnh hưởng tới người sửa tiếp**:
- Tính năng, màn hình, hành vi nhân lực/thiết bị mới
- Loại công trình (`kind`) hoặc loại thiết bị mới
- Thay đổi cấu trúc dữ liệu: thêm/đổi/bỏ bảng, trường, tiền tố id trong `schema.json`
- Thay đổi quyền ghi dữ liệu của mô phỏng (`docs/01 RULE AGENTS.md` mục B4)
- Sửa lỗi
- Nâng hoặc hạ phiên bản thư viện
- Thay đổi quy tắc trong `docs/`
- (Studio) Thêm loại đối tượng, vật liệu, kỹ năng, máy móc, nhiệm vụ; đổi quy tắc mô phỏng/kinh tế
- (Studio) Đổi định dạng tệp dự án: **bắt buộc** ghi nhóm **Dữ liệu** kèm `SCHEMA_VERSION` mới và migration

Không cần ghi: chỉ sửa định dạng mã, đổi tên biến nội bộ, hoặc chỉ sửa nội dung dữ liệu demo (số %, câu thoại, toạ độ nhỏ).

## 2. Cấu trúc một phiên bản
```markdown
## [0.2.0] - 2026-11-20
### Thêm
- Mô tả ngắn, bắt đầu bằng động từ. Nhắc id/bảng liên quan nếu có (`equipment.json`, `EQ-*`).
### Thay đổi
### Sửa lỗi
### Dữ liệu
- Thay đổi schema: ghi rõ trường cũ → mới và cách chuyển đổi.
### Gỡ bỏ
```
- Chỉ dùng các nhóm trên, theo đúng thứ tự trên. Nhóm nào trống thì bỏ đi.
- Mục `## [Chưa phát hành]` luôn nằm trên cùng để gom các thay đổi đang làm.
- Ngày theo định dạng `YYYY-MM-DD`. Phiên bản mới nhất ở trên.

## 3. Đánh số phiên bản
| Thay đổi | Tăng |
|---|---|
| Đổi schema làm hỏng dữ liệu cũ (đổi tiền tố id, đổi tên trường tham chiếu, đổi ý nghĩa `progress`) | MAJOR `x.0.0` |
| (Studio) Tăng `SCHEMA_VERSION` **có** migration đọc được tệp cũ | MINOR `0.x.0` |
| (Studio) Đổi định dạng mà tệp cũ **không** mở được | MAJOR `x.0.0` |
| Thêm tính năng, bảng, trường, `kind` mới mà vẫn tương thích | MINOR `0.x.0` |
| Sửa lỗi, tinh chỉnh giao diện, chỉnh mô hình 3D | PATCH `0.0.x` |

- Khi phát hành: chuyển nội dung `[Chưa phát hành]` thành phiên bản mới **và** cập nhật `version` trong `package.json` cho khớp.
- Khi tăng MAJOR vì đổi schema: đổi `STORAGE_KEY` trong `src/store/db.js` (ví dụ `ctao.patches.v2`) để bản vá cũ trong localStorage không áp nhầm.

## 4. Văn phong
- Tiếng Việt có dấu, câu ngắn, mỗi gạch đầu dòng là một thay đổi.
- Viết cho người dùng và người bảo trì đọc, không viết kiểu nhật ký commit ("fix", "wip").
- Ghi đường dẫn file khi cần tra cứu: `src/scene/Structures.jsx`.
