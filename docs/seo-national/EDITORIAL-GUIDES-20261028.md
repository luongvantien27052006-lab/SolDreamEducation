# Hoàn thiện bốn bài du học — 28/10/2026

## Nội dung bổ sung

| Bài hiện có | Bổ sung |
|---|---|
| [Visa D4/D2](https://soldream.edu.vn/du-hoc/phan-biet-visa-du-hoc-han-quoc-d4-1-d2) | Chọn lộ trình từ mục tiêu học tập; phân biệt xét tuyển và xét thị thực; thông tin cần chuẩn bị trước tư vấn |
| [Năm bước hồ sơ](https://soldream.edu.vn/du-hoc/5-buoc-chuan-bi-ho-so-du-hoc-han-quoc) | Cách thực hiện từng bước, quản lý giấy tờ và phiên bản, lưu xác nhận nộp, xử lý yêu cầu bổ sung |
| [Học phí trường](https://soldream.edu.vn/du-hoc/hoc-phi-truong-doi-tac-han-quoc-2026) | Đọc đúng trường/cơ sở/chương trình/đơn vị tiền/kỳ thu; lập ngân sách và kiểm tra trước chuyển tiền |
| [Chi phí và lịch đóng](https://soldream.edu.vn/du-hoc/chi-phi-du-hoc-han-quoc-2026-2027) | Đối chiếu tổng gói với các đợt đóng, đọc ghi chú BKC, tránh tính trùng khoản đã gồm, theo dõi khoản thu theo nơi nhận |

Các đoạn mới nằm trong nội dung bài ở CMS. Giữ URL và toàn bộ nội dung trước đó, bao gồm từng bảng, số tiền, thời lượng, phạm vi dịch vụ, thuế, lịch đóng và ghi chú chính sách. Không viết lại FAQ, tiêu đề hay mô tả SEO đã biên tập. Không bổ sung mức phí, tỷ giá, thời hạn xử lý visa hoặc cam kết kết quả.

## Nguồn đối chiếu

- [Study in Korea: Student Visa and Stay Status](https://www.studyinkorea.go.kr/en/plan/visaAndStay.do): mã chương trình và phân biệt hồ sơ thị thực.
- [Study in Korea: Flow Chart](https://www.studyinkorea.go.kr/en_US/plan/flowChart.do): trình tự chuẩn bị, chọn trường, nộp hồ sơ và thị thực.
- [Study in Korea: Study Expenses](https://www.studyinkorea.go.kr/en/plan/abroadExpenses.do): tách học phí khỏi chi phí khác và tra thông báo trường.
- Các bảng học phí và chính sách của SolDream đã được lưu trong bản CMS hiện hành; không cập nhật lại mức tiền trong đợt này. Giữ các nguồn trường đã có trong bài.

Danh sách quản lý giấy tờ và ngân sách là hướng dẫn tổ chức công việc cho người đọc, không phải danh mục hồ sơ bắt buộc thay thế thông báo tuyển sinh hay cơ quan tiếp nhận.

## Cách cập nhật an toàn

`lib/editorialGuidesMigration.js` chạy một lần, kiểm tra tiêu đề và SHA-256 nội dung CMS trước khi chèn. Nếu người biên tập đã thay đổi bài sau thời điểm chụp dữ liệu, bài đó được bỏ qua và báo rõ; không ghi đè. Chạy lại không chèn lặp.

Chỉ ghi `content`, bổ sung `source_urls` và thời điểm biên tập thực tế `updated_at`/`content_modified_at`. Không ghi ngày xuất bản, tác giả, metadata, trạng thái công khai, FAQ hoặc dữ liệu khóa học. Kiểm tra loại phần vừa chèn phải khôi phục nguyên từng byte nội dung gốc.

## Kiểm tra trước triển khai

- Trên bản sao dữ liệu: cập nhật đủ bốn bài, giữ mọi bảng gốc và mọi trường ngoài danh sách cho phép; kiểm tra tình huống CMS sửa đồng thời và chạy lại.
- Render bốn trang: một H1, JSON-LD hợp lệ, ngày đăng gốc 17/10/2026, mô tả HTML/OpenGraph khớp metadata đã lưu.
- Lưu và mở lại bốn bài qua xử lý CMS trên bản sao: nội dung hiển thị, bảng phí, metadata thủ công và ngày gốc giữ nguyên. Ngắt thông báo và gửi lập chỉ mục trong bản kiểm tra; không tạo email hay khách hàng thử.
- Sau triển khai: đối chiếu dữ liệu production với bản sao lưu, đọc trang công khai, kiểm tra liên kết, sitemap và màn hình 390 px/máy tính. Lưu kết quả thực tế riêng; không coi dữ liệu trình duyệt cục bộ là Core Web Vitals người dùng thật hoặc bằng chứng tăng hạng.

Bản sao trước thay đổi trên Railway: `/data/editorial-guides-20261028/before.sqlite` và `before.json`. Bằng chứng kiểm tra cục bộ được lưu trong `db/backups/editorial-guides-20261028/` (không đưa vào Git).
