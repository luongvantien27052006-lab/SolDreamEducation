# Lộ trình SEO toàn quốc — SolDream

**Ngày lập: 28/10/2026.** Mục tiêu chủ sở hữu: hướng tới nhóm top 10 và top 5 cho tìm kiếm du học Hàn Quốc tại Việt Nam. Đây là mục tiêu phát triển, chưa có dữ liệu chứng minh vị trí hiện tại hoặc cơ sở cam kết thời hạn đạt top.

## 1. Cách định nghĩa kết quả

- Thống nhất danh sách truy vấn và URL mục tiêu; đo Vietnam, Web, tách điện thoại/máy tính theo cùng kỳ 28 ngày.
- Ghi nhận các truy vấn có average position ≤10 hoặc ≤5 trong hai kỳ đủ dữ liệu, kèm impressions/clicks. Chỉ số này mô tả dữ liệu GSC của nhóm đã lọc, không phải khẳng định mọi người ở mọi tỉnh thấy cùng vị trí.
- Dùng ngưỡng nội bộ đề xuất **20 impressions/truy vấn/28 ngày** để đánh dấu dòng còn ít dữ liệu; đây không phải quy định hay ngưỡng xếp hạng của Google.
- Kết quả kinh doanh là yêu cầu tư vấn hợp lệ và hồ sơ phù hợp. Thứ hạng là một nhóm chỉ số hỗ trợ; chưa có số organic lead nên chưa đặt mục tiêu tăng phần trăm.

Google hướng dẫn đánh giá SEO qua nội dung hữu ích, khả năng khám phá và trải nghiệm; không có thay đổi mã nguồn nào bảo đảm thứ hạng. Kế hoạch dưới đây là giả thuyết công việc cần đo lại. [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## 2. Baseline đã biết và chưa biết

| Hạng mục | Trạng thái ngày lập |
|---|---|
| Khả năng crawl kỹ thuật | Sau đợt sửa kỹ thuật: 227/227 URL sitemap trả 200, canonical đúng, có liên kết nội bộ |
| Trang tổng quan | `/du-hoc` đang được nâng cấp từ danh mục bài thành trang giải thích và điều hướng |
| GSC, clicks, impressions, CTR, position | Chưa có dữ liệu được cấp để xác nhận |
| Số URL Google đã index | Chưa xác nhận; số 227 là URL sitemap, không phải kết quả index |
| Backlinks / referring domains / DA | Chưa đo; không ước lượng |
| Lượng tìm kiếm / độ khó từ khóa | Chưa đo; danh sách phía dưới là giả thuyết ý định |
| CWV thực tế | Chưa có dữ liệu; API PageSpeed trước đó trả quota 429 |

## 3. Bản đồ ý định → URL hiện có

| Nhu cầu ưu tiên | URL đích | Công việc |
|---|---|---|
| Du học Hàn Quốc tổng quan | `/du-hoc` | Trả lời nhanh, so sánh chương trình và dẫn tới các nhánh quan trọng |
| Điều kiện du học | `/du-hoc/dieu-kien-du-hoc-han-quoc` | Hoàn thiện tiêu chí theo chương trình và kỳ tuyển sinh có nguồn |
| Chi phí và lịch thanh toán | `/du-hoc/chi-phi-du-hoc-han-quoc-2026-2027` | Làm rõ khoản đã gồm/chưa gồm bằng dữ liệu đã chốt |
| Học phí trường | `/du-hoc/hoc-phi-truong-doi-tac-han-quoc-2026` | Phân biệt trường/cơ sở, đơn vị tiền và kỳ/năm học |
| Visa và lộ trình | `/du-hoc/phan-biet-visa-du-hoc-han-quoc-d4-1-d2` | Dẫn đúng chương trình và hồ sơ liên quan |
| Chuẩn bị hồ sơ | `/du-hoc/5-buoc-chuan-bi-ho-so-du-hoc-han-quoc` | Checklist người học có thể thực hiện, kết nối trường và kỳ dự kiến |
| Tiếng Hàn trước du học | `/du-hoc/lo-trinh-hoc-tieng-han-truoc-khi-du-hoc` | Liên kết khóa học, giữ nguyên thời lượng và học phí |
| Chọn trường cụ thể | `/truong-dai-hoc` và hồ sơ trường đã có | Ưu tiên đúng trường trong profile, cập nhật nguồn chính thức |

Không tạo nhiều trang cùng cạnh tranh cho cụm tổng quan. Từng bài con dẫn về `/du-hoc` bằng ngữ cảnh phù hợp; trang trụ cột dẫn ngược lại các bài giải thích. Danh mục tham chiếu đối thủ nằm trong `COMPETITOR-ANALYSIS.md`.

## 4. Kế hoạch 90 ngày

Khối lượng dưới đây là đề xuất triển khai, điều chỉnh theo nguồn lực biên tập thật.

| Giai đoạn | Việc thực hiện | Tiêu chí hoàn thành | Phụ thuộc |
|---|---|---|---|
| **Ngày 1–14: nền tảng và số đo** | Triển khai bản SEO đã duyệt; xác minh GSC; gửi sitemap; ghi baseline; kiểm tra URL trụ cột và 4–6 URL ưu tiên | Property do trung tâm sở hữu; sitemap đọc thành công; lưu bảng baseline hoặc ghi rõ chưa đủ dữ liệu | Chủ sở hữu xác minh tài khoản; dev triển khai |
| **Ngày 15–30: hoàn thiện đường đi** | Biên tập trang `/du-hoc` và 6–8 bài hiện có theo bản đồ ý định; kiểm tra liên kết hai chiều; rà CTA điện thoại | Mỗi bài có mục đích rõ, nguồn và người phụ trách; nội dung giá/thời lượng/chính sách không thay đổi ngoài phê duyệt | Dữ liệu CMS đã chốt; người biên tập |
| **Ngày 31–60: tăng bằng chứng riêng** | Làm 3–4 câu chuyện học viên hoặc ghi nhận lớp/phỏng vấn trường có dữ liệu thật được phép công bố; hoàn thiện hồ sơ đội ngũ; cập nhật nhóm trường ưu tiên theo thông báo chính thức | Mỗi bài có tài liệu/ảnh hoặc lời kể xác thực, mốc thời gian và liên kết phù hợp; không tạo kết quả hoặc chứng chỉ giả | Đội ngũ và học viên cung cấp tư liệu |
| **Ngày 61–90: tối ưu theo dữ liệu** | So sánh hai kỳ 28 ngày; ưu tiên query có hiển thị nhưng CTR thấp hoặc vị trí 11–30; sửa tiêu đề, tóm tắt, khoảng trống trả lời; kiểm tra nhu cầu từ form | Có nhật ký thay đổi → query/page/device tương ứng → kết quả; chọn vòng tối ưu tiếp theo từ số đo | GSC đủ dữ liệu; nguồn đo organic lead |

Kinh nghiệm trực tiếp, thông tin rõ nguồn và nội dung đáp ứng câu hỏi người học là hướng tăng giá trị biên tập; không dùng độ dài bài hoặc số bài làm bằng chứng chất lượng. [Google: nội dung hữu ích, đáng tin cậy](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## 5. Dịch vụ toàn quốc và bằng chứng thương hiệu

- Trình bày quy trình tư vấn từ xa bằng công việc trung tâm thực sự thực hiện: nhận nhu cầu, đối chiếu hồ sơ, lịch tư vấn và cập nhật tiến độ.
- Giữ các địa chỉ thật TP.HCM, Đồng Nai, VPĐD miền Bắc. Nếu chưa có cơ sở ở địa phương khác, không tạo thông tin chi nhánh mới.
- Công bố tên pháp lý, giấy phép và hồ sơ chuyên môn khi có tài liệu được trung tâm xác nhận. Thông số thành tích cần có phạm vi, giai đoạn và căn cứ; thiếu bằng chứng thì dùng mô tả hoạt động có thể kiểm chứng.
- Mở rộng độ tin cậy qua thông tin và hoạt động thật với trường đối tác; chưa thực hiện outreach, mua liên kết hoặc gửi email cho bên ngoài.

## 6. Quy tắc ra quyết định sau đo

| Quan sát | Hành động tiếp theo | Dấu hiệu giả thuyết chưa đúng |
|---|---|---|
| URL quan trọng chưa index | Xem lý do GSC, canonical và nội dung trùng; sửa nguyên nhân cụ thể | GSC vẫn báo cùng lý do sau khi đã crawl lại; cần xem lại chẩn đoán |
| Query có hiển thị, CTR thấp | Đối chiếu đúng page/device rồi cải thiện cách giới thiệu giá trị | CTR không tăng trong kỳ so sánh tương đương hoặc vị trí thay đổi mạnh |
| Hai URL cùng nhận một ý định | Phân vai nội dung/liên kết; chỉ hợp nhất khi có bằng chứng trùng | URL phù hợp vẫn không nhận đúng query; ý định ban đầu có thể sai |
| Có click nhưng ít yêu cầu hợp lệ | Rà nội dung đáp ứng nhu cầu, CTA và bước đăng ký | Sửa form nhưng nhu cầu vẫn không phù hợp; cần xem lại nhóm truy vấn |
| Dữ liệu quá ít | Tích lũy thêm kỳ đo, tiếp tục hoàn thiện nội dung cốt lõi | Không đủ căn cứ để tuyên bố tăng/giảm hoặc đạt top |

## 7. Báo cáo tuần

Người phụ trách: trung tâm chỉ định một người biên tập và một người theo dõi GSC. Lưu ngày chỉnh, URL, nội dung chỉnh và nguồn. Báo cáo gồm clicks/impressions/CTR/position theo Vietnam + device, tình trạng các URL ưu tiên và số yêu cầu hợp lệ nếu đo được. Cách thiết lập chi tiết nằm trong `SEARCH-CONSOLE-SETUP.md`.

Trong 90 ngày, ưu tiên đạt quy trình đo ổn định và cải thiện nhóm truy vấn có bằng chứng. Mốc top 5/top 10 được rà lại sau baseline, không gán ngày bảo đảm đạt hạng.
