# Rà soát nội dung ngày 20/10/2026

Nguồn: bản đọc trực tiếp từ cơ sở dữ liệu production; đối chiếu lại trước triển khai, không có thay đổi nội dung xen giữa hai lần đọc.

## Phạm vi và kết quả

| Nội dung | Đã rà | Đổi chủ đề |
|---|---:|---:|
| Bài đăng (gồm cả bản ẩn) | 192 | 73 |
| Thông tin quét | 687 | 113 |

| Chủ đề sau rà soát | Bài đăng | Thông tin quét |
|---|---:|---:|
| Thông tin Hàn Quốc | 98 | 563 |
| Cẩm nang sinh hoạt | 89 | 124 |
| Hoạt động SolDream | 5 | 0 |

16 bài ẩn và 176 bài công khai giữ trạng thái hiện có. Không tự xuất bản toàn bộ mục quét.

## Nguyên tắc biên tập

- Tuyển sinh, học bổng, chương trình, học phí trường/lớp học, chuẩn bị nhập cảnh, hồ sơ trường và thời sự chính thức: Thông tin Hàn Quốc. Việc nhắc ký túc xá hay trợ cấp sinh hoạt trong bài học bổng không đổi chủ đề chính.
- Nhà ở, sức khỏe, bảo hiểm, nghề nghiệp, dịch vụ cư trú và chương trình cộng đồng giúp hòa nhập: Cẩm nang sinh hoạt. Lớp cộng đồng của các trung tâm cư dân thuộc nhóm này; tuyển sinh hệ tiếng của trường đại học thuộc nhóm thông tin giáo dục.
- Hình ảnh lớp học, thể thao, gặp gỡ trường tại trung tâm, tuyển dụng của trung tâm và câu chuyện Cô Ba/SolDream: Hoạt động SolDream. Không xếp thông báo tuyển dụng của đơn vị khác vào hoạt động trung tâm.
- Tin về hoạt động của cơ quan nhà nước, cơ cấu tổ chức, đấu thầu và bản tin sự kiện đã diễn ra thuộc thông tin chung; phân biệt với hướng dẫn dịch vụ thực tế cho cư dân.
- 447 hồ sơ trong danh mục trường chính thức được rà theo cùng nhóm nội dung giáo dục. Các mục còn lại được đối chiếu tiêu đề, tóm tắt, nội dung sẵn có và bài liên kết; không dùng menu hoặc chân trang của nguồn để suy ra chủ đề.

## Các liên kết sai được gỡ

| Mục quét | Bài bị gắn nhầm | Khác biệt |
|---|---:|---|
| 2928 | 215 | Lớp tiếng Hàn / lớp máy tính |
| 2985 | 217 | Tuyển dụng Hyundai / thông tin liên hệ Hanyang |
| 2993 | 205 | Yangcheon TOPIK 1 / SFRC TOPIK 5–6 |
| 3115 | 262 | Lớp tiếng Hàn trẻ em / lớp nghệ thuật trẻ em |

Các mục này về trạng thái chờ, có ghi chú tạm dừng tự đăng để quản trị viên biên tập riêng. Bài công khai liên quan được giữ nguyên nội dung và URL.

## Bài Cô Ba số 274

File `GHI_CHU_DEV_SCHEMA_CO_BA.txt` là ghi chú cho bản nháp cũ. Production đã có bài đầy đủ, công khai tại `/tin-tuc/co-ba-sai-gon-khoi-nghiep-han-quoc-bai-hoc-that-bai`; giữ cùng bài và URL theo yêu cầu xuất bản sau khi hoàn thiện.

- Giữ H1 và tiêu đề SEO khác vai trò; ảnh, chú thích và nội dung theo bản CMS mới nhất, không ghi đè bằng ghi chú cũ.
- Dữ liệu tác giả của SolDream dùng cùng thực thể tổ chức; bổ sung lựa chọn tổ chức/cá nhân trong CMS.
- Mô tả ảnh bìa, Open Graph và kích thước ảnh lấy từ ảnh thực có trong nội dung, không hard-code cho bài khác. Liên kết công khai và trong trình biên tập có gạch chân/focus rõ.
- Đối chiếu các số liệu nghiên cứu với Yale Insights và bài gốc INFORMS đã được dẫn trong bài; giữ riêng các liên kết SolDream và Cô Ba.
- Máy chủ được đo đang ở UTC. Mốc sửa thực của bài `2026-10-19T21:06:12Z` hiển thị là 20/10/2026 tại Việt Nam. Không biết chính xác lần công khai đầu: không tạo giờ xuất bản giả từ trường ngày hiển thị 12:00. Bài mới được ghi thời điểm xuất bản/sửa thực bằng UTC; thay ngày hiển thị không đổi lần xuất bản đầu.

## Đối chiếu và khôi phục

`data/content-topic-review-20261020.json` chứa đủ 879 quyết định, chủ đề trước/sau, lý do và hash nội dung đã rà. Migration chỉ áp dụng khi nội dung và chủ đề vẫn khớp bản đã đọc; thay đổi mới của quản trị viên được bỏ qua và ghi nhận.

`content_topic_audit` lưu kết quả thực tế, chủ đề cũ và trạng thái/liên kết trước sửa. Không thay nội dung, trạng thái xuất bản hoặc ngày bài viết khi đổi chủ đề. Bản chạy lại trên dữ liệu đã trích xuất: 879 mục khớp, 186 đổi chủ đề, 4 liên kết sai được gỡ, 0 mục bị bỏ qua.
