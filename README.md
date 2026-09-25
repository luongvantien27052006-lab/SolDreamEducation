# SOL DREAM EDUCATION — Website + Trang quản trị

Website Trung tâm Hàn ngữ & Du học Hàn Quốc **SOL DREAM EDUCATION**, dựng lại mới hoàn toàn:
giao diện hiện đại (concept "Bình minh Hàn Quốc"), **chuẩn SEO Google**, kèm **trang quản trị**
để thêm/sửa/xoá **Tin tức & sự kiện** và xem **thống kê lượt truy cập**.

- **Công nghệ:** Node.js + Express + EJS (server-side render) + SQLite (better-sqlite3)
- **Render phía server (SSR)** → Google index tốt, tốc độ nhanh
- Không cần build phức tạp, chạy được ngay

---

## 1. Cài đặt & chạy (máy local)

Yêu cầu: **Node.js >= 18**.

```bash
# 1) Cài thư viện
npm install

# 2) Tạo file cấu hình
cp .env.example .env
#   -> mở .env và sửa ADMIN_PASSWORD, SESSION_SECRET, SITE_URL

# 3) Chạy (chế độ dev, tự reload)
npm run dev
#   hoặc chạy thường:
npm start
```

Mở trình duyệt:
- Website: **http://localhost:3000**
- Trang quản trị: **http://localhost:3000/admin**  (mật khẩu lấy từ `ADMIN_PASSWORD` trong `.env`)

Lần chạy đầu, hệ thống tự tạo database `db/data.sqlite` và thêm sẵn vài bài tin tức mẫu.

---

## 2. Trang quản trị (/admin)

Đăng nhập bằng `ADMIN_PASSWORD`. Bên trong có:

**📊 Bảng điều khiển** — thống kê truy cập website:
- Tổng khách truy cập (unique visitors) và tổng lượt xem trang
- Khách / lượt xem **hôm nay**
- Biểu đồ **14 ngày gần nhất**
- Danh sách trang được xem nhiều nhất

**📰 Tin tức & sự kiện** — quản lý bài viết:
- **Thêm** bài mới (tiêu đề, danh mục, mô tả ngắn, nội dung, ảnh bìa, ẩn/hiện)
- **Sửa** / **Xoá** bài viết
- Trình soạn thảo trực quan giữ bảng, tiêu đề, danh sách, liên kết và ảnh khi dán từ Word, Google Docs, Excel hoặc trang web; có thể chuyển sang chế độ HTML khi cần.
- Bài viết tự động hiển thị ở trang chủ (3 bài mới nhất) và trang **/tin-tuc**
- URL thân thiện tự tạo từ tiêu đề: `/tin-tuc/ten-bai-viet`
- Tìm kiếm, lọc danh mục/trạng thái, phân trang và ẩn/xuất bản nhanh ngay tại danh sách.
- Mỗi trang có tiêu đề SEO, mô tả SEO, chủ đề trọng tâm, URL hồ sơ tác giả và tùy chọn `noindex`.
- Điểm chất lượng SEO/GEO 0–100 kiểm tra BLUF, độ dài, H2, bảng/danh sách, nguồn, tác giả, ảnh và độ bao phủ chủ đề ngay khi soạn.
- Xem trước kết quả tìm kiếm, đếm ký tự/từ/H2/bảng, cảnh báo rời trang khi chưa lưu và phím tắt `Ctrl/Cmd + S`.

**🎓 Chương trình du học** — quản lý nội dung tư vấn:
- Thêm/sửa chương trình, thông tin trường, điều kiện, bảng chi phí và nội dung hỗ trợ hồ sơ.
- Dùng chung trình soạn thảo trực quan; ảnh dán hoặc kéo thả được tải vào `public/uploads/`.
- Bảng điều khiển hiển thị nội dung cần tối ưu, bản nháp, nội dung đang xuất bản và cập nhật gần đây.

> Lượt truy cập được ghi nhận tự động phía server mỗi khi có người mở một trang
> (không tính admin, file tĩnh, bot cùng phiên). Mỗi khách được nhận diện bằng cookie.

---

## 3. Chuẩn SEO đã tích hợp sẵn

Những điều kiện để Google index & xếp hạng tốt đã được làm sẵn:

- ✅ Thẻ `<title>` và `meta description` **riêng cho từng trang**
- ✅ Thẻ **canonical** (chống trùng nội dung)
- ✅ **Open Graph + Twitter Card** (đẹp khi chia sẻ Facebook/Zalo)
- ✅ **Dữ liệu có cấu trúc (JSON-LD):** `EducationalOrganization`, `WebSite`, và `Article` cho từng tin tức
- ✅ **/sitemap.xml** tự động (gồm cả các bài tin tức) — cập nhật ngay khi bạn đăng bài
- ✅ **/robots.txt** (cho phép index, chặn /admin, khai báo sitemap)
- ✅ **/llms.txt** tạo động — bản đồ nội dung ngắn gọn cho các tác tử AI có hỗ trợ quy ước này
- ✅ HTML ngữ nghĩa, **mỗi trang 1 thẻ H1**, ảnh có `alt`
- ✅ Responsive điện thoại, tốc độ tải nhanh, `lang="vi"`

### GEO / khả năng xuất hiện trong câu trả lời AI

Website có các trung tâm kiến thức công khai tại `/gioi-thieu`, `/khoa-hoc`, `/du-hoc`, `/truong-dai-hoc` và `/tin-tuc`; mỗi hồ sơ trường, chương trình và bài viết có URL riêng. Hệ thống gồm:

- Phần trả lời trực tiếp, luôn gắn rõ tên **SOL DREAM EDUCATION** với nội dung tư vấn.
- Nội dung HTML ngữ nghĩa, bảng dữ liệu, mục lục và liên kết nội bộ — crawler đọc được không cần JavaScript.
- Đơn vị tư vấn, ngày cập nhật, phạm vi thông tin và liên kết website chính thức của trường.
- JSON-LD `Article`, `CollegeOrUniversity`, `BreadcrumbList` và định danh tổ chức thống nhất.
- Canonical, quyền hiển thị snippet đầy đủ và URL trong sitemap động.
- Cảnh báo trong trang quản trị khi bài viết hoặc chương trình dưới 120 từ để chuyên viên bổ sung trải nghiệm, dữ liệu và nguồn trước khi kỳ vọng hiệu quả GEO.
- Nội dung gắn `noindex` tự động bị loại khỏi sitemap/RSS và nhận cả meta robots lẫn `X-Robots-Tag`.
- Trang chi tiết phát `Last-Modified`, URL tác giả xác minh được đưa vào phần hiển thị và Article schema.

Google xem GEO/AEO là một cách gọi trong ngành; nền tảng vẫn là SEO, nội dung nguyên bản, hữu ích và đáng tin cậy. Không có markup hoặc `llms.txt` nào bảo đảm được AI trích dẫn. Sau khi deploy, cần gửi lại sitemap trong Search Console, yêu cầu lập chỉ mục các URL mới và theo dõi báo cáo Generative AI nếu tài khoản được Google cấp quyền truy cập.

### Việc cần làm SAU khi deploy (bắt buộc để lên Google):
1. Đặt đúng **`BASE_URL`** trong `.env` = domain thật (vd `https://soldream.edu.vn`). `SITE_URL` vẫn là biến tương thích cũ.
2. Chạy site trên **HTTPS** (xem phần deploy).
3. Vào **Google Search Console** → thêm website → xác minh sở hữu.
4. Trong Search Console, **gửi sitemap**: `https<span></span>://soldream.edu.vn/sitemap.xml`
5. (Nên có) Up ảnh chia sẻ **1200×630** vào `public/img/og-cover.jpg` và đặt `OG_IMAGE` trong `.env`.

---

## 4. Cấu hình (.env)

| Biến | Ý nghĩa |
|------|---------|
| `BASE_URL` | Domain thật ưu tiên cho canonical/sitemap/OG. Không có `/` cuối. |
| `SITE_URL` | Tên biến tương thích cũ; chỉ dùng khi chưa đặt `BASE_URL`. |
| `ADMIN_PASSWORD` | Mật khẩu đăng nhập /admin; bắt buộc khi `NODE_ENV=production` |
| `SESSION_SECRET` | Chuỗi bí mật ngẫu nhiên cho phiên đăng nhập |
| `OG_IMAGE` | (tuỳ chọn) URL ảnh chia sẻ mạng xã hội |
| `PORT` | Cổng chạy (mặc định 3000) |
| `DATABASE_PATH` | (tuỳ chọn) đường dẫn file SQLite |
| `INDEXNOW_KEY` | (tuỳ chọn) khóa IndexNow riêng. Nếu để trống, hệ thống tự tạo một khóa ổn định và lưu trong SQLite. |
| `GEMINI_CACHE_DOCUMENT_PATH` | Đường dẫn tới tài liệu hướng dẫn biên soạn cố định dùng cho Gemini Context Caching. Nên là tài liệu lớn hơn 32k token. |
| `GEMINI_CACHE_TTL_SECONDS` | TTL cache theo giây; mặc định `7200` (2 giờ). |
| `GEMINI_FALLBACK_BACKOFF_MS` | Thời gian chờ đầu tiên trước khi chuyển model; mặc định `1000` ms. |
| `GEMINI_FALLBACK_MAX_BACKOFF_MS` | Giới hạn exponential backoff; mặc định `2000` ms. |

### Context Caching và fallback Gemini

Đặt tài liệu hướng dẫn cố định vào một file UTF-8 rồi cấu hình, ví dụ:

```env
GEMINI_CACHE_DOCUMENT_PATH=D:/sol-dream-education/sol-dream/data/editorial-cache-guide.md
GEMINI_CACHE_TTL_SECONDS=7200
```

`lib/geminiGateway.js` kiểm tra cache từ xa theo dấu vân tay tài liệu, tạo cache riêng cho từng model và tự tạo lại khi cache hết hạn. Khi gặp `429`, `RESOURCE_EXHAUSTED`, lỗi quá tải hoặc timeout, thứ tự fallback là `gemini-3.5-flash-lite` → `gemini-3.5-flash` → `gemini-3.6-flash`, với backoff 1–2 giây. Nội dung thay đổi theo từng bài vẫn được gửi trong `contents`; chỉ tài liệu hướng dẫn cố định được cache.

---

## 5. Deploy

### Cách A — Railway (khuyên dùng, giống stack bạn đang xài)
1. Đẩy code lên GitHub.
2. Railway → New Project → Deploy from GitHub repo.
3. Trong **Variables**, thêm: `SITE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`.
4. Railway tự chạy `npm install` và `npm start`.
5. **Lưu ý dữ liệu:** SQLite lưu trong file. Trên Railway hãy gắn **Volume** vào thư mục `db/`
   (đặt `DATABASE_PATH=/data/data.sqlite` và mount volume ở `/data`) để dữ liệu không mất khi redeploy.

### Cách B — VPS (Ubuntu + Nginx)
```bash
npm install --omit=dev
NODE_ENV=production SITE_URL=https://soldream.edu.vn node server.js
# nên dùng pm2 để chạy nền:  pm2 start server.js --name soldream
```
Cấu hình Nginx reverse proxy về `http://localhost:3000` và cài SSL (Let's Encrypt) để có HTTPS.


> **Ảnh bài viết:** ảnh tải lên được lưu trong `public/uploads/`. Trên Railway/serverless, hãy
> gắn **Volume** cho cả `db/` và `public/uploads/` (hoặc dùng dịch vụ lưu ảnh như Cloudinary/S3)
> để ảnh không mất khi redeploy — giống lưu ý với SQLite ở trên.

### Đổi sang PostgreSQL (khi cần quy mô lớn)
Dự án dùng SQLite cho gọn nhẹ. Nếu muốn PostgreSQL: thay `db/index.js` bằng driver `pg`,
chuyển các câu SQL (cú pháp gần như tương đương, đổi `datetime('now','localtime')` sang `now()` và
`AUTOINCREMENT` sang `SERIAL`). Phần route/view giữ nguyên.

---

## 6. Cấu trúc thư mục

```
sol-dream/
├── server.js              # App Express: middleware, tracking truy cập, mount route
├── db/index.js            # Khởi tạo SQLite + schema + seed tin tức mẫu
├── lib/
│   ├── seo.js             # Cấu hình SEO (SITE_URL, meta mặc định, canonical)
│   ├── util.js            # slug tiếng Việt, format ngày, xử lý nội dung
│   └── auth.js            # Bảo vệ trang admin
├── routes/
│   ├── public.js          # Trang chủ, /tin-tuc, /tin-tuc/:slug, sitemap, robots
│   └── admin.js           # Đăng nhập, dashboard, CRUD tin tức
├── views/
│   ├── layout.ejs         # Khung HTML (head + header + footer)
│   ├── partials/          # head (SEO), header, footer
│   ├── _home_main.ejs     # Nội dung trang chủ (đúng giao diện đã duyệt)
│   ├── home / news-list / news-detail / 404
│   └── admin/             # layout, login, dashboard, news-list, news-form
└── public/                # CSS (style.css, admin.css), JS (site.js), ảnh
```

---

## 7. Bảo mật — nên làm cho production
- Đổi `ADMIN_PASSWORD` và `SESSION_SECRET` thành giá trị mạnh, khó đoán.
- Luôn chạy qua HTTPS (cookie phiên đã bật `secure` khi `NODE_ENV=production`).
- Nếu cần nhiều tài khoản admin / phân quyền, có thể nâng cấp thêm bảng `users` sau.

---

## 8. GEO và khả năng được AI trích dẫn

- Nội dung công khai được render phía máy chủ bằng Express + EJS; crawler nhận được nội dung cốt lõi ngay trong HTML, không cần chạy JavaScript.
- `/robots.txt` cho phép GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended, Bingbot và Applebot-Extended; mọi nhóm vẫn chặn `/admin`.
- JSON-LD gồm `EducationalOrganization`, `WebSite`, `Article`, `FAQPage`, `Dataset`, `CollegeOrUniversity`, `Course`, `PostalAddress`, breadcrumb và tác giả. `Person` chỉ được tạo khi có tên, vai trò và hồ sơ thật.
- Dữ liệu trường có BLUF 40–50 từ, học phí KRW/VND, khoảng phí ký túc xá, trạng thái visa/GPA/TOPIK/sổ đóng băng và case study. Giá trị chưa có nguồn được để `null` và ghi rõ “chưa xác minh”, không tự suy đoán.
- Các trang kiến thức dùng đoạn trả lời ngắn 30–60 từ ngay sau tiêu đề nội dung, bảng, danh sách và hộp lưu ý để tạo các khối có thể trích xuất độc lập.
- Trang `/cau-hoi-thuong-gap` chứa FAQ hiển thị khớp với `FAQPage`; `/truong-dai-hoc` công bố phạm vi bộ dữ liệu khớp với `Dataset`.
- Sitemap liệt kê khóa học, giới thiệu, FAQ, tin tức, chương trình và toàn bộ hồ sơ trường.
- `lib/sitemap.js` quét trực tiếp JSON trường/khóa học và SQLite bài viết/chương trình; ảnh bìa được đưa vào image sitemap và mỗi khóa học có URL SSR riêng tại `/khoa-hoc/:id`.
- `/feed.xml` cung cấp RSS cho bài viết và chương trình mới. Hệ thống tự gửi bài, trường/chương trình, khóa học, FAQ và các tệp khám phá tới IndexNow sau khi đăng, sửa, ẩn hoặc xóa; khóa xác minh được tự tạo nếu `.env` chưa khai báo.
- Form admin có trường nguồn đối chiếu chính thức. URL hợp lệ được hiển thị cho người đọc và đưa vào thuộc tính `citation` của Article schema.
- Trang chi tiết tự liên kết nội dung liên quan; URL có dấu gạch chéo cuối được chuyển hướng 301 về canonical và trang 404 dùng `noindex`.
- Trang trường có badge cập nhật, H2 dạng câu hỏi, bảng chi phí/điều kiện, FAQ accordion và hộp đội ngũ tư vấn. Person/credential schema chỉ bật khi cấu hình `ADVISOR_NAME`, `ADVISOR_CREDENTIALS` và `ADVISOR_SAME_AS` bằng dữ liệu thật.
- Ba mẫu Seoul National, Chung-Ang và Daegu nằm trong `pendingUniversityTemplates`; chúng không được xuất bản hoặc đưa vào chatbot cho đến khi có nguồn tuyển sinh 2026 và case study được phép công bố.

Sau khi triển khai production, gửi sitemap trong Google Search Console và Bing Webmaster Tools, kiểm tra robots bằng URL thật, rồi theo dõi server log để xác nhận bot hợp lệ truy cập thành công.

Chúc bạn triển khai thuận lợi! 🌅
