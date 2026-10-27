# Sửa SEO theo báo cáo 28/10/2026

## Đã thực hiện

- Sửa 25 SEO title và 17 mô tả (41 bản ghi có một bản ghi thuộc cả hai nhóm) bằng cặp giá trị cũ/mới chính xác; bỏ qua nếu biên tập viên đã thay đổi nội dung so với bản audit.
- Giữ nguyên title hiển thị, nội dung bài, học phí, thời lượng, điều kiện/chính sách, URL dữ liệu và các trường ngày xuất bản gốc. Trigger lịch sử đang có ghi lại lần sửa metadata thực tế.
- Mô tả tự tạo dùng câu hoàn chỉnh, không cắt giữa từ/cụm chỉ để ép về 160 ký tự. Mô tả nhập thủ công giữ nguyên khi lưu.
- Hồ sơ 7 trường có lớp trình bày riêng: bỏ các hàng/nhãn hoàn toàn chưa có dữ liệu, giữ số tiền và ghi chú có nội dung, gộp thành một ghi chú chỉnh được qua CMS. Không sửa dataset hoặc tính tổng/đổi tiền mới.
- Woosong dùng URL chính `/truong-dai-hoc/woosong`; URL `/truong-dai-hoc/dai-hoc-woosong` chuyển 301. Toàn bộ nội dung, ảnh, nguồn và FAQ của hồ sơ bổ sung được đưa lên trang chính; bản ghi nguồn còn nguyên trong CMS.
- SEO title/mô tả của hồ sơ Woosong bổ sung vẫn điều khiển metadata trang chính qua CMS. Ngày sửa trang hợp nhất lấy ngày muộn nhất đã ghi nhận trong hai nguồn, không dùng ngày yêu cầu truy cập. Liên kết bài liên quan dẫn thẳng URL chính.
- Ba ảnh gốc 1,24–2,68 MB có bản WebP 480/960/1440 px. HTML dùng srcset/sizes và ảnh chia sẻ dùng bản lớn phù hợp; ảnh gốc không bị xóa hoặc ghi đè.
- Ảnh chia sẻ thương hiệu và 7 trường có kích thước 1200×630. Đồ họa ghi rõ tên trường, không dùng ảnh khuôn viên giả; khai báo ảnh cho Article trường.
- Sitemap dùng ngày sửa thực tế từ dữ liệu CMS, không gán ngày hiện tại hàng loạt. Bỏ image:title đã ngừng hỗ trợ; ưu tiên đúng hồ sơ được route sử dụng.
- www chuyển 301 về host chính cho GET/HEAD công khai, giữ đường dẫn và query; không đổi POST, API, admin, health check hoặc host Railway nội bộ.
- Đồng bộ nhãn footer Cuộc sống SolDream, giữ URL chủ đề.
- Người dùng xác nhận riêng việc ẩn hai bài UAV Triều Tiên và tên lửa Nuri. Migration chỉ đổi published=0 của đúng hai bản ghi, không xóa nội dung hoặc ngày; cờ migration bảo đảm biên tập viên có thể mở lại sau này.

## Bảo toàn dữ liệu

Trước thay đổi đã lưu `/data/seo-fix-20261028/before.sqlite` và `/data/seo-fix-20261028/before.json` trên volume Railway. Bản chụp nội dung để đối chiếu tại local: `db/backups/seo-fix-before-20261028.json` (không vào Git).

Đã đối chiếu migration trên bản dữ liệu riêng trong bộ nhớ: 25 title, 17 description, một nhãn footer; không bị bỏ qua bản ghi nào. Trước khi thêm phần ẩn bài theo phê duyệt riêng, mọi trường ngoài metadata của 17 khóa học, 193 bài, 20 chương trình, 10 dataset và 871 FAQ đều khớp bản chụp.

Sau triển khai phải đối chiếu lại bản production: không thay số lượng bản ghi; chỉ hai cờ published đã được chủ website phê duyệt là ngoại lệ. Các trường học phí/thời lượng/chính sách, content, created_at, first_published_at và ngày công bố ban đầu phải còn nguyên.

## Chưa tự điền thông tin không có căn cứ

- Kỳ thống kê/phương pháp tính chỉ số thành công 98% cần số liệu nội bộ của trung tâm.
- Người duyệt chuyên môn phải là người thật đã thực sự duyệt, không tự gán tên hoặc tạo chứng chỉ.
- Bài ITQ có lịch khác nhau giữa mô tả cũ và thân bài. Chỉ sửa mô tả trung tính, không chọn hoặc đổi ngày/lịch trong thân bài.
- Không thay schema FAQ hiện có chỉ để hứa hẹn rich result. Không gán điểm Google/CrUX khi API chưa đủ dữ liệu.
- Các header bảo mật tùy chọn trong audit thuộc đợt hardening riêng; không thay CSP có nguy cơ chặn font, bản đồ hoặc công cụ quản trị trong bản sửa SEO này.

## Rà soát và triển khai

Kiểm tra cú pháp JavaScript/EJS/JSON và `git diff --check`, đối chiếu dữ liệu trên bản riêng và production. Không thêm hoặc chạy bộ kiểm thử ứng dụng, không tạo đăng ký hoặc gửi email thử.
