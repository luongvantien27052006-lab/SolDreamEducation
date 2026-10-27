# Hoàn thiện trường trong profile SolDream — 28/10/2026

## Phạm vi

Danh mục profile có 22 mục trường/cơ sở. Trước đợt này có 8 URL hồ sơ trường trong nước; 13 trường còn dẫn ra website chính thức. Hanyang Seoul và ERICA dùng chung một hồ sơ, vì vậy sau bổ sung có 21 URL nội bộ cho đủ 22 mục.

- Hoàn thiện Hannam, Woosong University, Hanyang, Daeduk, Dongyang, Gimhae, Sogang và Yonsei.
- Bổ sung Woosong College, Sookmyung, Kunjang, Kunsan National University, Gachon, Daejeon Health, Jeonju, Shinhan, Hanbat, Pai Chai, Kookmin, Dong-A và Kyung Hee.
- Giữ nguyên mọi URL cũ. Không tạo URL thứ hai cho Hanyang hoặc Woosong University.
- Nội dung tập trung nhận diện cơ sở, nhóm chương trình, đầu mối tuyển sinh và cách đối chiếu hồ sơ/ngân sách. Các nguồn học thuật, tuyển sinh và quốc tế do chính trường hoặc Study in Korea công bố được lưu cùng nội dung.

## Bảo toàn

Giữ nguyên toàn bộ bảng tiền, thời lượng, chính sách, yêu cầu, FAQ và ngày xuất bản gốc của các hồ sơ đã có. Giữ tác giả, tiêu đề và metadata thủ công. Phần Woosong bổ sung từ chương trình cũ vẫn nguyên vẹn; chỉ chèn mục mới vào dữ liệu hồ sơ chính.

Các hồ sơ mới có ngày tạo và xuất bản thực tế, không mượn ngày cũ của profile. Không tự điền mức học phí, học bổng, tỷ giá, điều kiện visa hoặc bảo đảm việc làm. Khi một nguồn cũ được nhắc tới, bài hướng dẫn người đọc xác nhận đúng kỳ và chương trình.

`lib/partnerEditorialMigration.js` kiểm tra dấu vân tay của dữ liệu CMS trước khi cập nhật. Nếu có thay đổi đồng thời hoặc trùng slug, toàn bộ cập nhật được dừng trước khi ghi, giữ nguyên chỉnh sửa của người biên tập. Migration chỉ chạy một lần và nội dung sau đó được quản lý trong CMS như các bài khác.

## Nội dung và liên kết

`data/partner-editorial-20261028/new-schools.json` chứa 13 hồ sơ mới và nguồn tương ứng. `existing-schools.json` chứa mục bổ sung cho 7 hồ sơ dữ liệu; `yonsei.html` bổ sung bài hiện có. Danh mục đối tác chỉ đổi trường `profilePath` của những mục trước đây chưa có bài.

Mẫu hồ sơ đại học hỗ trợ các liên kết hướng dẫn trong từng mục. Các liên kết được kiểm tra và chuẩn hóa trước khi hiển thị. Những mục cũ, bảng, điều kiện và câu hỏi không bị viết lại.

## Kiểm tra

- Trên bản sao chỉ gồm dữ liệu trường công khai: bảo vệ thay đổi đồng thời, chạy lại, so sánh nguyên trạng mọi trường dữ liệu cũ ngoài phần thêm và mốc cập nhật thực tế.
- Kiểm tra 22 mục đều dẫn tới 21 URL nội bộ, Hanyang được nhận diện theo cơ sở; Woosong College khác Woosong University, Kunjang khác Kunsan, Jeonju khác Kijeon Jeonju.
- Render 21 trang: một H1, canonical và metadata nhất quán, JSON-LD có ngày xuất bản đúng nguồn.
- Lưu–mở lại qua xử lý CMS trên bản sao: 14 bài dạng chương trình và 7 hồ sơ dữ liệu. Ngắt thông báo/email/gửi lập chỉ mục trong kiểm tra.
- Sau triển khai: đối chiếu dữ liệu máy chủ, trang công khai, sitemap và màn hình 390 px/máy tính. Không lấy phép đo trình duyệt cục bộ làm điểm Core Web Vitals hay kết luận tăng thứ hạng.

Bản sao các trường trước sửa và mã băm đối chiếu trên Railway: `/data/partner-editorial-20261028/before-schools.json`, `before-hashes.json`. Dữ liệu khách hàng, thông tin đăng nhập và bản nháp không được xuất ra để làm nội dung trường. Bằng chứng cục bộ nằm trong `db/backups/partner-editorial-20261028/` và không đưa vào Git.
