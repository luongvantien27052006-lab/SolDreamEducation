# Thiết lập và đo lường Google Search Console cho SolDream

Ngày: **28/10/2026**. Chưa có dữ liệu GSC được cấp để xác nhận thứ hạng, lượt tìm kiếm, click hoặc URL đã được Google lập chỉ mục. Không điền số 0 thay cho trạng thái chưa đo.

## 1. Xác minh bằng tệp HTML do chủ website cung cấp

Chủ website đã cung cấp mã công khai: `google-site-verification: google2c0bf3db5550904c.html`. Bản cập nhật thêm tệp `public/google2c0bf3db5550904c.html`, phục vụ tại [đường dẫn xác minh](https://soldream.edu.vn/google2c0bf3db5550904c.html). Khi bản triển khai thành công, kiểm tra URL trả 200 và đúng dòng mã, rồi chủ tài khoản chọn **Xác minh** trong phương thức **Tệp HTML** của Search Console. Không nhập tên tệp vào trường mã thẻ HTML trong CMS. Giữ tệp này sau khi xác minh. Việc phục vụ tệp chưa đồng nghĩa tài khoản đã xác minh; cần kết quả từ Google.

## 2. Phương án thay thế: xác minh bằng thẻ HTML qua CMS

1. Mở [Google Search Console](https://search.google.com/search-console/), dùng tài khoản trung tâm quản lý lâu dài.
2. Thêm loại **URL-prefix**, nhập đúng **`https://soldream.edu.vn/`**, chọn phương thức **HTML tag**.
3. Google cung cấp thẻ dạng `<meta name="google-site-verification" content="MA_GOOGLE_CAP">`.
4. Trong CMS, vào **Giao diện & nội dung trang → SEO mặc định**, tìm trường **Google Search Console: mã xác minh HTML (chỉ nhập giá trị content)**, khóa `seo.google-site-verification`. Dán riêng giá trị `content`, không dán cả thẻ HTML. Trường này có hiệu lực sau khi bản cập nhật chứa chức năng được triển khai.
5. Mở trang chủ công khai và xem mã nguồn, tìm `google-site-verification`; đối chiếu giá trị trong `<head>` rồi quay lại Google bấm Verify.
6. Giữ mã sau xác minh. Google có thể kiểm tra lại. Phương thức HTML tag dùng cho URL-prefix; loại Domain cần xác minh DNS. [Hướng dẫn Google](https://support.google.com/webmasters/answer/9008080?hl=en).

URL-prefix chỉ bao phủ đúng prefix đã nhập. Nếu cần theo dõi mọi biến thể http/https và subdomain, có thể bổ sung Domain property bằng DNS khi chủ tên miền có quyền thực hiện. Đây là lựa chọn phạm vi đo, không phải thủ thuật tăng hạng. [Phạm vi URL-prefix](https://support.google.com/webmasters/answer/10432366).

Nếu Verify thất bại: kiểm tra mã trên trang công khai sau cache/deploy, đúng property, đúng tài khoản và vị trí `<head>`. Không suy diễn rằng website bị Google loại khỏi chỉ mục chỉ vì chưa xác minh được tài khoản.

## 2. Gửi sitemap và kiểm tra URL quan trọng

- Trong property trên, mở **Sitemaps**, gửi `https://soldream.edu.vn/sitemap.xml`, xem trạng thái xử lý và lỗi. Google có thể đọc sitemap nhưng chưa thu thập hoặc lập chỉ mục hết URL; số URL trong sitemap không đồng nghĩa số URL đã index. [Google: Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en).
- Dùng **URL Inspection** với trang chủ, `/du-hoc`, bài điều kiện, bài chi phí và một hồ sơ trường trọng tâm. Ghi lại trạng thái index, Google-selected canonical và ngày crawl. Live test giúp kiểm tra khả năng truy cập; canonical Google đã chọn phải xem ở dữ liệu indexed. [Google: URL Inspection](https://support.google.com/webmasters/answer/9012289?hl=en).

## 3. Bộ báo cáo cho mục tiêu toàn quốc

Vào **Performance → Search results**, chọn Search type **Web**, khoảng **28 ngày đầy đủ gần nhất**, lọc **Country = Vietnam**. Tạo hai lát cắt **Mobile** và **Desktop**, rồi so sánh cùng bộ lọc với 28 ngày trước. Xuất bảng Queries và Pages. [Bộ lọc và so sánh của Google](https://support.google.com/webmasters/answer/17011165?hl=en).

| Góc nhìn | Cách dùng cho SolDream |
|---|---|
| Query | Theo dõi từng truy vấn ưu tiên, tách nhu cầu thương hiệu và ngoài thương hiệu |
| Page | Kiểm tra `/du-hoc` nhận đúng nhóm tổng quan, bài con nhận đúng nhóm chuyên sâu |
| Country | Giữ Vietnam khi kết luận về khách tìm kiếm tại Việt Nam |
| Device | Đối chiếu riêng điện thoại và máy tính |
| Date | Cùng thời lượng, ưu tiên kỳ đủ ngày, ghi ngày triển khai để giải thích thay đổi |

Country là nơi phát sinh tìm kiếm; average position là chỉ số tổng hợp, không phải một vị trí cố định giống nhau ở mọi tỉnh. Google có thể gom phần lớn dữ liệu theo canonical và không hiển thị mọi truy vấn vì giới hạn dữ liệu. [Dimensions và giới hạn](https://support.google.com/webmasters/answer/17011259).

## 4. Mẫu từ khóa theo dõi ban đầu

- Tổng quan: `du học hàn quốc`, `tư vấn du học hàn quốc`.
- Ý định rõ: `điều kiện du học hàn quốc`, `chi phí du học hàn quốc`, `hồ sơ du học hàn quốc`, `visa d4-1 và d2`.
- Chọn trường: tên các trường thật trong profile kèm `học phí`, `điều kiện`, `học tiếng`.
- Thương hiệu: các biến thể `soldream`, `sol dream` để đo riêng. Đây là danh sách khởi tạo, chưa có volume hoặc difficulty.

GSC hỗ trợ lọc regex RE2. Ví dụ lọc chứa `du học hàn quốc|du hoc han quoc`; điều chỉnh theo truy vấn thực tế sau khi có dữ liệu. Không cộng số dòng Queries rồi coi đó là tổng traffic. [Hướng dẫn lọc](https://support.google.com/webmasters/answer/17011165?hl=en).

## 5. Bảng theo dõi hằng tuần

| Kỳ / bộ lọc | Query | URL canonical | Clicks | Impressions | CTR | Average position | Yêu cầu tư vấn hợp lệ từ organic |
|---|---|---|---|---|---|---|---|
| Chưa có dữ liệu | Chưa đo | Chưa đo | Chưa đo | Chưa đo | Chưa đo | Chưa đo | Cần thiết lập nguồn đo |

Clicks, impressions, CTR và average position có nghĩa khác nhau; kết quả tìm kiếm cũng thay đổi theo thời điểm, nơi tìm và thiết bị. Không quy số lượt truy cập toàn website trong admin thành lượt truy cập Google organic. [Google: chỉ số Performance](https://support.google.com/webmasters/answer/7576553?hl=en).

Nếu property mới, chỉ so sánh khi đã tích lũy đủ dữ liệu. Tài khoản GSC và quyền truy cập phải do trung tâm thực hiện; báo cáo này chưa đăng nhập, xác minh hoặc gửi sitemap thay chủ sở hữu.
