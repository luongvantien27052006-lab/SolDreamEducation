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

Khi rà soát có 16 bản tin khách hàng cũ đang chờ trong `subscriber_notifications`. Theo yêu cầu tiếp theo của người dùng, bổ sung `SUBSCRIBER_EMAIL_FROM` với cùng địa chỉ gửi đã có để khôi phục luồng email người đăng ký và cho phép xử lý cả 16 email đang chờ. `LEAD_EMAIL_FROM` và nơi nhận `LEAD_EMAIL_TO=thangdd@ueh.edu.vn` vẫn giữ nguyên.

Hai worker chia sẻ giới hạn nhịp gọi Resend. Luồng bản tin được bổ sung khóa chống gửi trùng, trạng thái đang gửi có thời hạn khóa, mã email Resend và thời gian thử lại. Chỉ đánh dấu bản tin đã gửi khi có phản hồi chấp nhận từ dịch vụ. Không tự tạo thêm đăng ký để thử gửi; 16 email tồn đọng là các email thật đã được người dùng yêu cầu gửi.

## Rà soát

- Đã kiểm tra cú pháp các file JavaScript và `git diff --check`.
- Không tạo bản đăng ký giả hoặc gửi email thử trong production.
- Bản chụp trước thay đổi: `/data/contact-improvements-before-20261021.json`.
- Các bảng học phí/khóa học, bài viết, chương trình, FAQ và nội dung CMS liên hệ được giữ nguyên.

## File

`db/index.js`, `lib/leadEmailNotifier.js`, `lib/subscriberNotifier.js`, `lib/resendRateLimit.js`, `routes/contact.js`, `routes/admin.js`, `server.js`, `views/admin/leads.ejs`, `views/partials/footer.ejs`, `public/css/style.css`, `public/img/icons/contact-phone.svg`, `public/img/icons/contact-email.svg`, `.env.example`.

## Tự cập nhật trạng thái trên admin (22/10/2026)

- Luồng `/api/contact` đã lưu đăng ký và công việc gửi email trong cùng giao dịch, sau đó gọi worker ngay. Worker vẫn tiếp tục mỗi 30 giây và khi khởi động, không phụ thuộc việc mở trang admin hoặc bấm nút gửi.
- Bổ sung cờ đánh thức worker: đăng ký đến trong khi worker đang gửi được xử lý ở lượt tiếp theo ngay sau khi lượt hiện tại kết thúc.
- Trang Yêu cầu liên hệ tự đọc trạng thái mỗi 5 giây qua endpoint `/admin/lien-he/trang-thai-email` có bảo vệ phiên quản trị và `Cache-Control: no-store, private`.
- Cập nhật ngay trong từng ô thông báo: đang chờ, đang gửi, đã gửi, thời điểm gửi, lỗi và nút thử lại. Không tải lại cả trang và không thay đổi vị trí cuộn hoặc dữ liệu người dùng đang chọn.
- Khi mất kết nối, trang tự thử lại với thời gian chờ tăng dần; dừng khi phiên quản trị hết hạn, tạm dừng ở tab ẩn và tiếp tục khi quay lại.
- Nhãn và ngày gửi được tạo chung từ `lib/leadEmailStatus.js` cho lần mở trang đầu và các lần cập nhật tiếp theo. Chỉ báo Đã gửi sau khi Resend chấp nhận và trả mã email.
- Cột Mới / Đã liên hệ / Đã đóng đổi tên thành Xử lý khách hàng. Việc gửi email không tự đánh dấu nhân viên đã liên hệ khách.
- Nút gửi thủ công chỉ còn dành cho đăng ký cũ chưa có công việc gửi hoặc các lần gửi đã thất bại. Bản ghi đã gửi không bị xếp lại; cơ chế chống trùng và nơi nhận `thangdd@ueh.edu.vn` được giữ nguyên.
- Không thay đổi luồng bản tin cho email người đăng ký, học phí, thời lượng hoặc chính sách.
- File bổ sung: `lib/leadEmailStatus.js`, `public/js/admin-leads.js`; cập nhật `lib/leadEmailNotifier.js`, `routes/admin.js`, `views/admin/leads.ejs`, danh sách phiên bản tài nguyên trong `server.js`.
- Kiểm tra cú pháp JavaScript, EJS và `git diff --check`. Không thêm hoặc chạy bộ kiểm thử, không tạo đăng ký giả và không gửi email thử trên production.
- Theo yêu cầu hiện tại, chỉ đẩy lên GitHub; chưa triển khai do Railway đang tạm chặn deploy và phiên CLI đã hết hạn.
