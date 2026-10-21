# Menu Cuộc sống SolDream

- Đưa nhóm Thông tin trường vào dropdown Du học Hàn Quốc, gồm liên kết danh mục, trường đối tác, hồ sơ trường và học phí. Các URL và trường nội dung CMS đang dùng được giữ lại.
- Thay vị trí menu Thông tin trường trước đây bằng Cuộc sống SolDream, liên kết tới `/tin-tuc?muc=hoat-dong-soldream`. Dùng cùng các bài đã phân vào Hoạt động SolDream; không tạo danh mục hoặc bản sao bài viết.
- Tạo điểm nhấn bằng nền tím hồng, chữ trắng và biểu tượng trái tim trên máy tính và menu điện thoại. Nhóm trường được ngăn bằng đường phân cách và tiêu đề rõ ràng.
- Tên và đích liên kết mới nằm trong CMS → Giao diện & nội dung trang → Menu và thương hiệu, với khóa `navigation.soldream-life.label` và `navigation.soldream-life.url`. Migration hiện có chỉ thêm các khóa mới nếu chưa tồn tại.
- Không sửa nội dung bài, học phí, thời lượng, chính sách, FAQ hoặc cấu hình gửi email.

## File sửa

- `views/partials/header.ejs`
- `public/css/style.css`
- `data/site-copy.json`

## Kiểm tra cú pháp

Đọc JSON, biên dịch cú pháp EJS và `git diff --check`. Không thêm hoặc chạy bộ kiểm thử.
