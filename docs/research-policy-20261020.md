# Phạm vi và lịch bot từ 20/10/2026

Theo yêu cầu: chỉ tìm thông tin trường có trong profile 2026–2027; thông tin chung về Hàn Quốc và cẩm nang chỉ tự tìm mỗi tháng một lần từ nguồn thông báo chính thức.

## Nguồn

- Danh sách gốc: `data/partner-schools.json`, gồm 22 mục trường/cơ sở, 21 đơn vị (Hanyang có Seoul và ERICA).
- Giữ 6 nguồn trường hiện có; thêm 16 điểm đọc chính thức trong `data/partner-research-sources.json`, gồm thông báo tuyển sinh, văn phòng quốc tế hoặc chương trình tiếng Hàn của trường. Các URL được đối chiếu với website chính thức trước triển khai.
- 15 nguồn cơ quan, cổng dịch vụ và thông báo chính thức chuyển sang lịch tháng: đại sứ quán, MOE, Study in Korea, HiKorea, KVAC, CIED, Seoul Foreign Portal, Immigration Service, NHIS, Incheon, MOEL và Danuri.
- Tắt nguồn danh mục trường toàn quốc Study in Korea và 4 nguồn báo/tin tổng hợp (Korea.net, Yonhap, Báo Chính phủ, VietnamPlus). Không xóa bài hoặc mục quét cũ.
- Kiểm tra nguồn ở lúc lấy lịch, thu thập, chèn mục mới, chuẩn bị bản thảo và xuất bản kết quả Batch. Nguồn ngoài danh sách không thể được bật lại bằng nút quản trị.
- Kết quả tìm kiếm mở rộng cho nguồn trường chỉ được dùng từ tên miền chính thức của đúng trường; nguồn tháng chỉ nhận tên miền cơ quan đã chọn. OpenAI Search có bộ lọc tên miền; kết quả từ Gemini được lọc lại từng URL và dữ kiện tương ứng.

## Lịch

- Trường: giữ cấu hình production `RESEARCH_BOT_INTERVAL_MS=43200000` (12 giờ/lần).
- Thông tin chung: cùng ngày/giờ của tháng kế tiếp theo giờ Việt Nam; nếu ngày không tồn tại thì dùng ngày cuối tháng.
- Mỗi nguồn có `next_crawl_at_ms`, được chốt trước khi truy cập mạng và giữ nguyên qua khởi động lại. Lỗi đọc nguồn không gây vòng lặp tự quét liên tục.
- Khởi tạo hạn tháng từ lần đọc gần nhất, không quét lại ngay chỉ vì triển khai cấu hình. Dữ liệu hiện tại có lần đọc gần nhất sáng 20/10; hạn tiếp theo là sáng 20/11/2026 (giờ Việt Nam).
- Nút kiểm tra thủ công là thao tác chạy ngay theo yêu cầu quản trị viên và tính lại hạn tiếp theo của nguồn; vẫn bị giới hạn phạm vi nguồn.
- Bộ hẹn giờ kiểm tra mốc trong SQLite mỗi phút; kiểm tra mốc không gọi web/AI. Hàng đợi nền không mở rộng tìm kiếm hoặc đọc thêm nguồn tháng ngoài lượt quét tháng; chỉ tiếp nhận nguồn tháng vừa được quét trong chính lượt đó. Kết quả Batch đã gửi vẫn được kiểm tra và hoàn thiện sau đó.
- Cửa sổ nội dung cho nguồn tháng là 35 ngày, tránh bỏ sót toàn bộ thông báo từ đầu tháng vì giới hạn 7 ngày cũ. Nguồn trường giữ cửa sổ 7 ngày.
- Không chạy tác vụ sửa ảnh cho tất cả trường mỗi lượt quét; chỉ bổ sung ảnh bài thuộc các nguồn vừa thực sự được quét.

## Lưu vết

- Migration: `partner_school_monthly_research_20261020_v1` trong `system_meta`.
- Bản cấu hình nguồn trước sửa được lưu cục bộ tại `db/backups/research-policy-20261020-before.json` (không đưa vào Git).
- Admin hiển thị nhóm lịch và hạn tự quét tiếp theo theo giờ Việt Nam cho từng nguồn.
