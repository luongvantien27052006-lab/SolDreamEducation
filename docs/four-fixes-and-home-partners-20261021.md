# Bốn mục sửa và khối trường đối tác trên trang chủ

## Trạng thái bàn giao

Mã nguồn đã hoàn thiện và kiểm thử. **Chưa triển khai được lên website công khai**: Railway trả `Deploys have been paused temporarily` khi tạo bản triển khai. Website đang phục vụ deployment `f9f7817a-01d8-4cf7-8050-4aa2dbf6fe70`, commit `0cf4505`.

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

Cuộn bảng đặt `scrollLeft=100` và vẫn cuộn được trong khung; tài liệu không bị kéo ngang. Hai trang du học cũng hết tràn URL trong bản CSS xem trước. Desktop kiểm tra ở 1440 px. Đây chưa phải kết quả nghiệm thu CSS đã triển khai lên website thật.

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
- Website công khai hiện hành: tám Article có ngày gốc đúng và mô tả HTML/OG khớp CMS; hai trang du học có footer và lời mở đầu hiện hành. Header cache cũ, CSS và khối trường trang chủ mới còn chờ triển khai.

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

## Việc cần hoàn tất khi Railway cho phép triển khai

Triển khai commit hiện hành, kiểm tra lại tám Article và hai trang du học trên phản hồi công khai; đo Sogang ở 390 × 844; kiểm tra sáu thẻ trang chủ và nút danh mục; đối chiếu lại dữ liệu với `/data/four-fixes-before-20261021.json`. Không sửa ngày gốc hoặc FAQ để vượt qua nghiệm thu.
