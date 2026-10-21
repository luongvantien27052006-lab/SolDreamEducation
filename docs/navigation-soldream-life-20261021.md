# Menu Cuộc sống SolDream

- Đưa nhóm Thông tin trường vào dropdown Du học Hàn Quốc, gồm liên kết danh mục, trường đối tác, hồ sơ trường và học phí. Các URL và trường nội dung CMS đang dùng được giữ lại.
- Thay vị trí menu Thông tin trường trước đây bằng Cuộc sống SolDream, liên kết tới `/tin-tuc?muc=hoat-dong-soldream`. Dùng cùng các bài đã phân vào Hoạt động SolDream; không tạo danh mục hoặc bản sao bài viết.
- Tạo điểm nhấn nhẹ bằng nền hồng tím nhạt `#f7edf5`, chữ tím đậm `#77316f`, viền mảnh, không bóng đổ và biểu tượng trái tim hai bên trên máy tính và menu điện thoại. Nhóm trường được ngăn bằng đường phân cách và tiêu đề rõ ràng.
- Tên và đích liên kết mới nằm trong CMS → Giao diện & nội dung trang → Menu và thương hiệu, với khóa `navigation.soldream-life.label` và `navigation.soldream-life.url`. Migration hiện có chỉ thêm các khóa mới nếu chưa tồn tại.
- Không sửa nội dung bài, học phí, thời lượng, chính sách, FAQ hoặc cấu hình gửi email.

## File sửa

- `views/partials/header.ejs`
- `public/css/style.css`
- `data/site-copy.json`

## Kiểm tra cú pháp

Đọc JSON, biên dịch cú pháp EJS và `git diff --check`. Không thêm hoặc chạy bộ kiểm thử.

## Đồng bộ tên tab theo yêu cầu tiếp theo

- Đổi nhãn Hoạt động SolDream thành Cuộc sống SolDream trong dữ liệu mặc định và CMS hiện có, gồm liên kết khối bài viết trang chủ.
- Trang cẩm nang, menu, breadcrumb, thẻ bài, tab quản trị bài viết, biểu mẫu chỉnh bài và màn dữ liệu quét đều dùng chung nhãn CMS qua `getTopics()` / `displayTopicLabel()`.
- Migration có dấu mốc chạy một lần, giữ nguyên lời dẫn đã biên tập và không ghi đè các lần sửa tên qua CMS sau này.
- Giữ ID chủ đề `hoat-dong-soldream`, URL, toàn bộ bài viết và phân loại hiện có. Bộ nhận diện chủ đề chấp nhận cả tên cũ và tên mới.
- File bổ sung: `lib/contentTopics.js`, `lib/siteContentMigration.js`.

## Kiểm tra menu điện thoại theo yêu cầu

- Kiểm tra trình duyệt tại 360 × 844, 390 × 844, 430 × 844 và máy tính 1440 × 1000.
- Menu không tràn ngang; Cuộc sống SolDream vừa khung điện thoại, giữ nền nhạt và chữ rõ; Thông tin trường nằm trong nhóm Du học Hàn Quốc.
- Bấm Cuộc sống SolDream mở đúng danh sách bài; nút mở và đóng menu hoạt động.
- Ảnh và số đo kiểm tra lưu trong `db/backups/mobile-menu-preview-*` và `db/backups/mobile-menu-live-*` (không đưa vào Git).
