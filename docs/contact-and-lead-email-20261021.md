# Liên hệ và email thông báo đăng ký mới

## Thay đổi

- Footer có wrapper riêng cho nội dung liên hệ. Ba địa điểm được tách bằng khoảng cách, đường phân cách, tiêu đề rõ ràng; từng dòng điện thoại, email, giờ làm việc có khoảng cách riêng.
- Dùng cấu trúc HTML `h5`/`div` sẵn có trong CMS để định dạng, vì bộ làm sạch HTML loại các class trong nội dung biên tập. Giữ nguyên toàn bộ địa chỉ, nhãn chi nhánh, hotline và liên kết Maps.
- Thêm biểu tượng điện thoại và phong bì bằng hai SVG tĩnh cùng CSS mask. Việc lưu lại nội dung CMS không xóa các biểu tượng này.
- Mỗi đăng ký hợp lệ mới qua `/api/contact` được lưu cùng một công việc gửi email trong giao dịch SQLite. Đăng ký trùng theo quy tắc hiện có không tạo thêm email.
- Thông báo về trung tâm dùng Resend với nơi nhận **thangdd@ueh.edu.vn**, địa chỉ gửi hiện có **thongbao@soldream.edu.vn**. Nội dung gồm khách hàng, số điện thoại, email, nhu cầu, nhóm đăng ký, trang liên quan và liên kết mở yêu cầu trong CMS.
- Gửi bất đồng bộ, có mã chống gửi trùng riêng cho mỗi đăng ký, hàng đợi bền vững, tối đa năm lần thử với thời gian chờ tăng dần. Worker tiếp tục xử lý khi máy chủ khởi động lại.
- CMS tách trạng thái email cho trung tâm khỏi việc khách đăng ký nhận bản tin. Hiển thị nơi nhận, thời gian gửi, lỗi và nút gửi lại khi thất bại. Yêu cầu có từ trước có nút gửi thông báo thủ công.

## Cấu hình

Đã tìm thấy cấu hình Resend trong `.env` local. Dịch vụ production trước thay đổi chưa có các biến gửi email. Đồng bộ khóa qua stdin, không ghi khóa vào Git hoặc log:

```text
RESEND_API_KEY=<khóa Resend hiện có>
LEAD_EMAIL_FROM=SOL DREAM EDUCATION <thongbao@soldream.edu.vn>
LEAD_EMAIL_TO=thangdd@ueh.edu.vn
```

`LEAD_EMAIL_FROM` có thể dùng `SUBSCRIBER_EMAIL_FROM` làm dự phòng khi đã cấu hình biến này. Trạng thái trên CMS ghi “Đã có cấu hình” khi có đủ biến; không coi việc nhập biến là bằng chứng email đã tới hộp thư. Chỉ đánh dấu gửi thành công sau khi Resend trả về mã email.

Khi rà soát có 16 bản tin khách hàng cũ đang chờ trong `subscriber_notifications`. Phần bổ sung này chỉ cấu hình `LEAD_EMAIL_FROM`, không bật lại worker gửi 16 bản tin cũ. Hàng đợi cũ và thông tin đăng ký hiện có được giữ nguyên. Không tự gửi lại các đăng ký lịch sử khi khởi động.

## Rà soát

- Đã kiểm tra cú pháp các file JavaScript và `git diff --check`.
- Không tạo bản đăng ký giả hoặc gửi email thử trong production.
- Bản chụp trước thay đổi: `/data/contact-improvements-before-20261021.json`.
- Các bảng học phí/khóa học, bài viết, chương trình, FAQ và nội dung CMS liên hệ được giữ nguyên.

## File

`db/index.js`, `lib/leadEmailNotifier.js`, `routes/contact.js`, `routes/admin.js`, `server.js`, `views/admin/leads.ejs`, `views/partials/footer.ejs`, `public/css/style.css`, `public/img/icons/contact-phone.svg`, `public/img/icons/contact-email.svg`, `.env.example`.
