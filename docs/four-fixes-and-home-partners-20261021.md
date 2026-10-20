# Bốn mục sửa và khối trường đối tác trên trang chủ

## Trạng thái bàn giao

**Đã triển khai thành công và nghiệm thu trên website công khai ngày 21/10/2026.** Deployment `fd0dd466-0b5f-46e0-b363-ceb0663bc9da` chứa đầy đủ mã nguồn ở commit `765b64c`.

Trước đó Railway tạm dừng build. Sau khi mở lại, thao tác redeploy ngày 21/10 đã chạy lại commit cũ `0cf4505` (deployment `4bd13aa8-bd22-429d-8d56-b00056e4166a`), nên trang chủ vẫn giữ danh sách cũ. Đã tạo deployment mới từ toàn bộ mã nguồn hiện hành, kiểm tra checksum của cả 22 file sửa/thêm: không có file sai khác hoặc thiếu.

Thao tác thử nghiệm tạo/import, lưu và xuất bản chỉ thực hiện với SQLite riêng trong thư mục tạm. Không tạo bài thử trên website thật, không gửi email hay IndexNow từ môi trường thử.

## Nội dung đã sửa

### 1. Ngày xuất bản và ngày biên tập

Đọc lần lượt ngày xuất bản hợp lệ từ `first_published_at`, `published_at`, `publication_date`; chỉ dùng ngày lịch từ bản ghi cũ khi thiếu những trường đó. `dateModified` ưu tiên thời điểm biên tập thực đã ghi nhận. Không cập nhật hàng loạt ngày trong cơ sở dữ liệu.

Khi kiểm tra phản hồi mới của website hiện hành, cả tám bài đã có ngày đúng. Giữ nguyên những ngày này; bổ sung kiểm thử hồi quy cho các đường lưu và render:

| ID | `datePublished` gốc |
| --- | --- |
| 1 | 2025-07-31 |
| 3 | 2022-10-31 |
| 183 | 2026-09-20 |
| 210 | 2026-09-28 |
| 211 | 2026-09-28 |
| 269 | 2026-10-19 |
| 270 | 2026-10-19 |
| 271 | 2026-10-19 |

### 2. Nội dung dùng chung và cache

Hai trang visa và học phí khi lấy phản hồi mới đã có đủ hotline `03 6464 8282`, `Chi nhánh Đồng Nai`, `VPĐD miền Bắc`, `Trợ lý tư vấn du học`. Lời mở đầu trong phần thân bài khớp CMS; khối tóm tắt đang được biên tập viên tắt nên được giữ tắt. Không tự thêm câu “SOL DREAM EDUCATION tổng hợp…”.

Sửa cơ chế xác thực cache trang chi tiết: không dùng ngày sửa bài làm `Last-Modified` cho toàn bộ HTML, vì footer và nội dung chung có thể đổi độc lập. ETag dựa trên toàn bộ kết quả render. Đọc lại cache chữ giao diện khi SQLite báo có thay đổi từ kết nối khác. Chỉ áp dụng header này ở các trang chi tiết liên quan, không thay đổi toàn bộ phản hồi hay tài nguyên tĩnh.

Test thực tế trên localhost: ETag không đổi trả 304; sửa footer qua CMS rồi gửi ETag cũ trả 200 với footer mới; ngày biên tập bài không đổi khi chỉ sửa footer.

### 3. URL nguồn trên điện thoại

Bổ sung `overflow-wrap: anywhere`, `min-width: 0`, giới hạn chiều rộng ở khối nguồn và phần tử grid. Bảng giữ cuộn ngang riêng trong `.knowledge-table-wrap`.

Đo DOM trang Sogang trên trình duyệt 390 × 844, trước và sau khi áp dụng bản CSS sửa vào bản xem trước:

| Phần tử | Trước: client / scroll | Sau: client / scroll |
| --- | --- | --- |
| `.knowledge-main` | 358 / 501 px | 358 / 358 px |
| `.source-box` | 353 / 497 px | 353 / 353 px |
| Bảng rộng | 356 / 1022 px | 356 / 1022 px |

Cuộn bảng đặt `scrollLeft=100` và vẫn cuộn được trong khung; tài liệu không bị kéo ngang. Hai trang du học cũng hết tràn URL. Desktop kiểm tra ở 1440 px. Sau deployment mới, đã đo lại cùng kết quả trên website thật bằng CSS được phục vụ từ máy chủ; không chèn CSS thử vào trình duyệt.

### 4. Tạo/import và SEO

- Giữ mô tả nhập tay, kể cả khi lần lưu sau thiếu trường `meta_description`.
- Khi để trống mô tả, tạo bản sạch và lưu vào CMS, tránh chỉ tạo tạm ở lúc render.
- Bỏ breadcrumb, container điều khiển kể cả thuộc tính HTML không có dấu nháy, lượt thích và dòng tăng/giảm cỡ chữ.
- Ngắt mô tả tự tạo tại ranh giới từ; không sửa lại mô tả biên tập viên đã nhập.
- Kiểm tra DB, mở lại form CMS, HTML, OpenGraph và mô tả Article cùng khớp.
- Import sử dụng bộ dữ liệu nguồn có chữ giao diện để thử thật các bước trích xuất, làm sạch, kiểm tra chất lượng, lưu nháp và duyệt bằng CMS. Phản hồi nhà cung cấp AI được mô phỏng xác định; không gọi mô hình bên ngoài. Không coi đây là kiểm thử dịch vụ AI trực tiếp.

### 5. Trường trên trang chủ

Đối chiếu danh mục ở trang 7 của profile 2026–2027. Theo lựa chọn đã xác nhận, giữ sáu thẻ: **Woosong, Hannam, Daeduk, Hanyang cơ sở Seoul, Yonsei, Sogang**. Nút **Xem tất cả trường đối tác** dẫn tới danh mục đủ 22 mục trường/cơ sở.

Thẻ lấy từ dataset `partners` trong CMS; trường ngoài profile không lọt vào khối này. Map tới hồ sơ CMS đang xuất bản hoặc hồ sơ trường cũ tương ứng, phân biệt đại học và cao đẳng Woosong. Logo Woosong, Hannam, Hanyang, Sogang trích trực tiếp từ PDF; Yonsei dùng ảnh hiện có của trường; Daeduk dùng tên trường trên nền sáng khi chưa có ảnh.

Trong **Giao diện & nội dung trang → Danh mục trường hợp tác**, có thể sửa `Hiển thị trên trang chủ`, ảnh/logo, mô tả thẻ và thông tin trường. Việc thêm trường CMS này không ghi đè nội dung biên tập, học phí hoặc dữ liệu tuyển sinh. Những lần khởi động sau giữ nguyên lựa chọn đã lưu.

## Kết quả kiểm thử

- **28/28** kiểm thử cho bốn mục sửa, workflow CMS/import và trường đối tác.
- **55/55** kiểm thử hồi quy hiện có: research parser, biên tập, publication pipeline, responsive.
- Trình duyệt thật: lưu–mở lại mô tả SEO trong CMS test; đối chiếu HTML và OpenGraph; CMS ở desktop và 390 px.
- Trang chủ test: sáu thẻ đúng tên, liên kết và ảnh/logo tải được; desktop và 390 px không tràn; nút xem đầy đủ đúng danh mục.
- Đối chiếu DB thật với bản chụp trước thay đổi: **17 khóa học, 871 FAQ, tám bản ghi bài và hai bản ghi chương trình giữ nguyên từng trường dữ liệu**. Không viết lại FAQ.
- Website công khai sau triển khai: **23/23** kiểm tra dữ liệu, JSON-LD, mô tả HTML/OG, nội dung chung và cache đạt. Tám Article giữ ngày gốc; hai trang du học có footer/lời mở đầu hiện hành; header không còn dùng ngày sửa bài làm `Last-Modified` của toàn bộ HTML.
- Trang chủ thật ở 1440 px và 390 × 844: đúng sáu trường đã chọn, ảnh/logo tải được, sáu liên kết trả HTTP 200. Nút xem đầy đủ dẫn tới phần chứa đúng 22 mục trường/cơ sở.
- CMS thật: mở được danh mục đối tác, có 22 trường `Hiển thị trên trang chủ`, đúng sáu trường đang bật; không sửa nội dung khi kiểm tra.
- Bản chụp mới trước deployment: `/data/deploy-retry-before-20261021.json`. Đối chiếu sau deployment: **17 khóa học, 871 FAQ, toàn bộ 193 bài và 20 chương trình giữ nguyên từng trường dữ liệu**. Dataset đối tác chỉ được bổ sung trường cấu hình trang chủ; không thay học phí, thời lượng, chính sách hay ngày bài.

Lệnh kiểm thử:

```powershell
node --test test/editorialRegression.test.js test/editorialWorkflow.test.js test/partnerSchools.test.js test/sevenContentFixes.test.js
# DATABASE_PATH và UPLOADS_DIR được đặt riêng cho các kiểm thử hồi quy còn lại:
node --test --test-concurrency=1 test/researchBot.test.js test/editorialAi.test.js test/publicationPipeline.test.js test/mobileLayout.test.js
```

## Danh sách file mã nguồn đã sửa hoặc thêm

| Nhóm | File |
| --- | --- |
| Ngày bài viết | `lib/articleMetadata.js` |
| Cache / template data | `routes/public.js`, `lib/siteContent.js` |
| Mô tả SEO / import | `lib/seoDescription.js`, `lib/researchBot.js`, `lib/util.js`, `routes/admin.js` |
| Giữ FAQ khi khởi động | `lib/publicationPipeline.js` |
| Responsive và thẻ trường | `public/css/style.css` |
| Map trường và CMS | `lib/partnerSchools.js`, `lib/siteContentMigration.js`, `lib/siteContentAdmin.js` |
| Khối trường trang chủ | `views/home-sections/journey.ejs` |
| Logo trích từ profile | `public/img/partners/woosong.jpg`, `hannam.jpg`, `hanyang.jpg`, `sogang.jpg` |
| Kiểm thử | `test/editorialRegression.test.js`, `test/editorialWorkflow.test.js`, `test/partnerSchools.test.js`, `test/helpers/editorialTestApp.cjs` |
| Báo cáo | `docs/four-fixes-and-home-partners-20261021.md` |

Ảnh và dữ liệu nghiệm thu lưu trong `db/backups/four-fixes-*` và `db/backups/profile-partner-home-test-*` (không đưa các bản sao DB và ảnh kiểm thử vào deployment).

## Bằng chứng nghiệm thu deployment mới

- Railway: deployment `fd0dd466-0b5f-46e0-b363-ceb0663bc9da`, trạng thái `SUCCESS`.
- Kết quả dữ liệu/JSON-LD/cached HTML: `db/backups/deploy-retry-live-audit.json` và `/data/four-fixes-live-audit-20261021.json`.
- Kết quả checksum và mở CMS: `/data/deploy-retry-source-and-cms-20261021.json`.
- Kiểm tra trang chủ: `db/backups/four-fixes-browser-home-live.json`.
- Kiểm tra Sogang/hai trang du học: `db/backups/four-fixes-browser-live.json`.
- Ảnh trang chủ thật: `db/backups/profile-partner-home-live-1440.png`, `db/backups/profile-partner-home-live-390.png`.
- Ảnh nguồn Sogang thật: `db/backups/four-fixes-live-sogang-390.png`.
