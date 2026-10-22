# Thanh điều hướng admin cố định

## Nguyên nhân

Thanh bên dùng `position:sticky` trong `.adm` có `overflow-x:hidden`. Khối cha trở thành vùng cuộn mà sticky bám vào, khiến thanh bên đi theo trang thay vì bám màn hình khi cuộn nội dung dài.

## Sửa

- `public/css/admin.css`: dùng `position:fixed` cho thanh bên trên máy tính, giữ độ rộng 250 px và chiều cao theo viewport.
- Đặt nội dung chính ở cột thứ hai để không bị thanh bên che.
- Giới hạn vùng danh sách menu bằng flex và `min-height:0`, cho cuộn riêng; thương hiệu và nút đăng xuất vẫn nằm trong thanh bên.
- Tại 860 px trở xuống, khôi phục bố cục menu phía trên và nội dung một cột.
- Không thay đổi dữ liệu hoặc các thao tác CMS, học phí, thời lượng, chính sách và cấu hình email.

## Kiểm tra

Rà soát cấu trúc CSS, các breakpoint và `git diff --check`. Không thêm hoặc chạy bộ kiểm thử.
