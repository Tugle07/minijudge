# Brief thiết kế giao diện — MiniJudge

## 1. Bối cảnh sản phẩm

**MiniJudge** là web chấm bài lập trình C tự động cho lớp K67 (môn Kỹ thuật Lập trình C) và nhóm luyện thi ICPC/OLP, kiểu Codeforces/VNOJ nhưng gọn và thân thiện hơn.

- **Người dùng:** sinh viên năm 1, mới học C. Phần lớn dùng laptop, khoảng 30% xem đề trên điện thoại. Hay luyện bài vào buổi tối.
- **Cảm giác mong muốn:** tập trung, gọn gàng, "dân code" nhưng không khô khan. Tham khảo cảm giác của **LeetCode**, **Codeforces** (mật độ thông tin) và **Linear/Vercel** (độ tinh tế).
- **Ngôn ngữ giao diện:** tiếng Việt có dấu. Thuật ngữ chấm bài giữ tiếng Anh: Accepted, Wrong Answer…
- **Bắt buộc có cả Light mode và Dark mode.** Dark mode là mặc định, vì người dùng hay code ban đêm.

## 2. Phạm vi: 3 trang cho sinh viên + khu Admin

### Trang 1 — Đăng nhập / Đăng ký
- Hai tab hoặc nút chuyển giữa **Đăng nhập** và **Tạo tài khoản**, trên cùng một màn.
- Trường *Đăng nhập*: Tên đăng nhập, Mật khẩu (có nút ẩn/hiện).
- Trường *Đăng ký*: Tên đăng nhập (3–24 ký tự, chữ/số/_), Mật khẩu (≥ 6 ký tự), Nhập lại mật khẩu, **Mã lớp** (giáo viên/lớp trưởng phát).
- Trạng thái cần vẽ: mặc định, đang gửi (nút loading), lỗi từng trường (VD "Tên đăng nhập đã tồn tại", "Mã lớp không đúng"), lỗi chung (VD "Thử quá nhiều lần, đợi 15 phút").
- Bên cạnh form (desktop): khu minh họa/giới thiệu ngắn, ví dụ một đoạn code C và huy hiệu "Accepted".

### Trang 2 — Trang chủ: các Khối bài tập
"Khối" là một nhóm bài cùng chủ đề hoặc cùng tuần, ví dụ:

| Khối | Mô tả | Số bài |
|---|---|---|
| Tuần 1 — Làm quen | Nhập xuất, if/else, vòng lặp | 8 |
| Tuần 2 — Hai con trỏ & Cửa sổ trượt | Two pointers, sliding window, prefix sum | 10 |
| Tuần 3 — Sắp xếp & Tìm kiếm | qsort, tìm kiếm nhị phân | 10 |
| Ôn thi giữa kỳ KTLT | Con trỏ, mảng động, struct, file | 12 |

Mỗi **thẻ khối** hiển thị: tên khối, mô tả 1 dòng, số bài, **tiến độ của tôi** (đã AC x/y bài, thanh progress), độ khó (Dễ / Trung bình / Khó), nhãn chủ đề (tag), trạng thái (Mới, Đang mở, Đã đóng, Có hạn nộp dd/mm).

- **Header** chung: logo MiniJudge, menu (Bài tập, Bài nộp, Bảng xếp hạng), avatar/tên người dùng + menu Đăng xuất, nút chuyển Light/Dark.
- **Phía trên lưới khối:** lời chào + tóm tắt cá nhân ("Bạn đã giải 14 bài · Hạng 5/62 · Chuỗi 3 ngày").
- **Bộ lọc/tìm kiếm:** ô tìm bài theo tên/mã, lọc theo chủ đề, ẩn khối đã hoàn thành.
- **Khi bấm vào một khối:** mở trang (hoặc panel) danh sách bài trong khối. Bảng gồm: trạng thái của tôi (✓ AC / ✗ đã thử / trống), mã bài (P01), tên bài, độ khó, tỉ lệ AC của lớp, số người giải được. → **Cần thiết kế cả màn danh sách bài trong khối.**
- Trạng thái rỗng: chưa có khối nào; người dùng chưa giải bài nào.

### Trang 3 — Đọc đề & nộp bài
- **Bố cục desktop:** chia 2 cột, có thể kéo thay đổi độ rộng.
  - **Trái — Đề bài:** breadcrumb (Khối › Bài), mã + tên bài, thẻ thông tin (Giới hạn thời gian 1000 ms, Bộ nhớ 256 MB, số test, độ khó), nội dung đề (Markdown có **công thức toán** dạng $a_i \le 10^9$, bảng ví dụ Input/Output với nút copy), phần Gợi ý có thể thu gọn.
  - **Phải — Nộp bài:** trình soạn code C (font monospace, đánh số dòng, highlight cú pháp), nút **Tải file .c**, nút **Nộp bài** nổi bật.
- **Kết quả sau khi nộp** (vẽ đủ các trạng thái):
  - Đang chấm: animation nhẹ, "Đang chấm test 2/3…"
  - Kết quả tổng + bảng từng test: Test #, kết quả, thời gian (ms), bộ nhớ (KB)
  - Compilation Error: khung log lỗi của GCC (monospace, cuộn được)
- Tab phụ trong cột phải: **Bài nộp của tôi cho bài này** (lịch sử ngắn).
- **Mobile:** đề bài ở trên, nút "Viết code" mở editor toàn màn hình (không cần editor xịn trên mobile).

### Khu Admin (giáo viên / lớp trưởng / nhóm phát triển)
Chỉ tài khoản có quyền **Admin** thấy mục "Quản trị" trong menu avatar. Bố cục kiểu **sidebar trái + nội dung phải** (tham khảo Vercel Dashboard, Linear Settings), ưu tiên **desktop**. Mobile chỉ cần xem được Dashboard.

Sidebar: Dashboard · Khối bài tập · Bài tập · Bài nộp · Người dùng · Cài đặt.

**A1. Dashboard**
- Hàng thẻ số liệu (KPI): Tổng người dùng · Bài nộp hôm nay · Tỉ lệ AC hôm nay · Người đang hoạt động (15 phút qua) · **Hàng đợi chấm** (số bài đang chờ, trạng thái judge: Hoạt động / Quá tải / Mất kết nối).
- Biểu đồ: số bài nộp theo giờ/ngày (7 ngày, 30 ngày); phân bố kết quả chấm (AC/WA/TLE/…) theo màu trạng thái.
- Bảng "Bài khó nhất": bài có tỉ lệ AC thấp nhất, số người thử, số người giải.
- Bảng "Tiến độ theo khối": mỗi khối có bao nhiêu % sinh viên hoàn thành.
- Luồng bài nộp mới nhất, cập nhật trực tiếp: thời gian, người nộp, bài, kết quả.
- Bộ lọc thời gian dùng chung cho cả trang: Hôm nay / 7 ngày / 30 ngày / Tùy chọn.

**A2. Quản lý Khối bài tập (CRUD)**
- Danh sách khối dạng bảng: tên, số bài, trạng thái (Nháp / Đang mở / Đã đóng), hạn nộp, % hoàn thành của lớp, thao tác (Sửa, Nhân bản, Ẩn, Xóa).
- Form tạo/sửa khối: tên, mô tả, ảnh hoặc màu đại diện, nhãn chủ đề, độ khó, thời gian mở / hạn nộp, hiển thị (Công khai / Ẩn / Nháp). Thêm bài vào khối bằng ô tìm bài; **kéo thả để sắp thứ tự** bài.
- Xóa phải có hộp thoại xác nhận, nói rõ hậu quả: "Khối có 10 bài và 245 bài nộp. Bài tập sẽ không bị xóa, chỉ gỡ khỏi khối."

**A3. Quản lý Bài tập (CRUD)**
- Danh sách bài: mã, tên, thuộc khối nào, độ khó, số test, số bài nộp, tỉ lệ AC, trạng thái (Nháp / Đã xuất bản), có lọc và tìm kiếm.
- Trình soạn bài có các tab:
  1. **Thông tin:** mã bài, tên, độ khó, nhãn, giới hạn thời gian (ms), bộ nhớ (MB).
  2. **Đề bài:** soạn Markdown bên trái, **xem trước trực tiếp** bên phải (có công thức toán, bảng ví dụ).
  3. **Test:** danh sách cặp input/output (xem nhanh vài dòng đầu, kích thước file), tải lên từng cặp hoặc **cả file .zip**, đánh dấu test nào là "ví dụ" (hiện trong đề), sắp xếp/xóa test.
  4. **Lời giải mẫu & Kiểm tra:** dán lời giải chuẩn → bấm "Chạy thử với toàn bộ test" → bảng kết quả từng test, để chắc test đúng trước khi xuất bản.
- Nút **Lưu nháp** / **Xuất bản**, kèm cảnh báo khi rời trang mà chưa lưu.

**A4. Bài nộp**
- Bảng toàn bộ bài nộp, lọc theo người dùng / bài / khối / kết quả / thời gian.
- Xem chi tiết bài nộp (mã nguồn, kết quả từng test). Nút **Chấm lại** cho một bài hoặc cả loạt (khi sửa test).

**A5. Người dùng**
- Bảng người dùng: tên, vai trò (Sinh viên / Admin), số bài giải, lần hoạt động cuối, trạng thái (Hoạt động / Bị khóa).
- Thao tác: đổi vai trò, khóa/mở khóa, đặt lại mật khẩu, xem lịch sử nộp bài.

**A6. Cài đặt**
- Mã lớp đăng ký (xem, đổi, tạo ngẫu nhiên), bật/tắt đăng ký mới, thông báo hiển thị đầu trang chủ (banner).

**Trạng thái cần vẽ cho Admin:** bảng rỗng, đang tải (skeleton), lưu thành công (toast), lỗi validate trong form, hộp thoại xác nhận xóa, judge mất kết nối (banner cảnh báo đỏ trên Dashboard).

## 3. Hệ thống trạng thái chấm (dùng nhất quán mọi nơi)

| Mã | Tên hiển thị | Ý nghĩa màu gợi ý |
|---|---|---|
| AC | Accepted | Xanh lá — đúng |
| WA | Wrong Answer | Đỏ — sai |
| TLE | Time Limit Exceeded | Cam/vàng — quá thời gian |
| MLE | Memory Limit Exceeded | Cam/vàng — quá bộ nhớ |
| RE | Runtime Error | Tím — lỗi khi chạy |
| CE | Compilation Error | Xanh dương — lỗi biên dịch |
| PENDING | Đang chấm… | Xám + animation |

Màu phải đạt tương phản WCAG AA trên cả nền sáng và tối. **Không chỉ dùng màu để phân biệt**: kèm icon hoặc chữ viết tắt cho người mù màu đỏ/xanh.

## 4. Yêu cầu chung

- **Responsive:** desktop 1440, laptop 1280, tablet 768, mobile 375.
- **Font:** chữ giao diện hỗ trợ tốt tiếng Việt có dấu (gợi ý: Be Vietnam Pro, Inter); code dùng JetBrains Mono hoặc Fira Code.
- **Khả năng tiếp cận:** focus ring rõ ràng, dùng được bằng bàn phím, cỡ chữ nội dung tối thiểu 15px.
- **Kỹ thuật:** frontend hiện viết bằng HTML/CSS/JavaScript thuần (không React), nên thiết kế cần dựng được bằng CSS thường. Tránh hiệu ứng nặng, nhiều ảnh lớn.
- **Dữ liệu thật để dùng trong mockup:** bài *P01 — Tổng hai số* (1000 ms, 256 MB, 3 test); *P02 — Đoạn con độ dài K có tổng lớn nhất* (gợi ý: cửa sổ trượt). Tên người dùng dạng `congtuan07`, `ngocyen_k67`.

## 5. Sản phẩm cần bàn giao

1. File Figma có các frame:
   - **Sinh viên:** Đăng nhập, Đăng ký, Trang chủ (lưới khối), Danh sách bài trong khối, Đọc đề + Nộp bài, Kết quả chấm (AC / WA / CE / Đang chấm). Mỗi màn có **Light + Dark**, **Desktop + Mobile**.
   - **Admin:** Dashboard, Danh sách khối + Form khối, Danh sách bài + Trình soạn bài (4 tab), Bài nộp, Người dùng, Cài đặt. **Light + Dark**, Desktop (Dashboard thêm bản Mobile).
2. **Design tokens:** bảng màu (kể cả 7 màu trạng thái chấm), typography scale, spacing, bo góc, shadow, xuất ra dạng CSS variables nếu được.
3. Component: nút, ô nhập, thẻ khối, badge trạng thái chấm, bảng (có sắp xếp, phân trang, chọn nhiều dòng), thanh tiến độ, tag, header, tab, sidebar admin, thẻ KPI, biểu đồ cột/đường/tròn, hộp thoại xác nhận, toast, vùng kéo thả tải file, hàng kéo thả sắp thứ tự, skeleton loading.
4. Logo/biểu tượng MiniJudge đơn giản (dùng làm favicon được).

---

## 6. Prompt ngắn cho công cụ AI thiết kế

> Dán từng prompt vào Stitch / v0 / Figma Make. Có thể thêm câu "Dark mode" hoặc "Mobile 375px" để ra biến thể.

**Prompt chung (dán trước mỗi prompt trang):**
```
Design for "MiniJudge" — an online judge web app where Vietnamese first-year university students submit C programs and get automatic verdicts (like LeetCode / Codeforces, but cleaner and friendlier). All UI text in Vietnamese with diacritics; verdict names stay in English (Accepted, Wrong Answer, Time Limit Exceeded, Memory Limit Exceeded, Runtime Error, Compilation Error). Style: focused, modern developer tool, inspired by Linear and Vercel; dark mode first with a matching light mode. Fonts: Be Vietnam Pro for UI, JetBrains Mono for code. Verdict colors: Accepted green, Wrong Answer red, TLE/MLE amber, Runtime Error purple, Compilation Error blue, Pending gray. Must be implementable with plain HTML/CSS (no heavy effects). WCAG AA contrast.
```

**Trang 1 — Đăng nhập/Đăng ký:**
```
Create the sign-in / sign-up page. Centered card with two tabs: "Đăng nhập" (username, password with show/hide toggle, primary button) and "Tạo tài khoản" (username 3–24 chars, password ≥ 6 chars, confirm password, "Mã lớp" class code field with helper text "Lấy mã từ lớp trưởng"). Show inline field errors such as "Tên đăng nhập đã tồn tại" and "Mã lớp không đúng". On desktop, a left panel shows the MiniJudge logo, tagline "Luyện C mỗi ngày, chấm bài trong 1 giây", and a small code snippet card with a green "Accepted" badge.
```

**Trang 2 — Trang chủ (khối bài tập):**
```
Create the home dashboard. Top header: MiniJudge logo, nav (Bài tập, Bài nộp, Bảng xếp hạng), theme toggle, user avatar menu. Greeting row: "Chào congtuan07 👋" with stats chips "Đã giải 14 bài · Hạng 5/62 · Chuỗi 3 ngày". Search box + topic filter chips. Then a responsive grid of problem-set cards ("Khối bài tập"): each card has title (e.g. "Tuần 2 — Hai con trỏ & Cửa sổ trượt"), one-line description, topic tags, difficulty label, problem count, a progress bar "Đã AC 6/10", and a status pill (Mới / Đang mở / Hạn nộp 20/10 / Đã đóng). Include 4 sample cards: "Tuần 1 — Làm quen" (8 bài), "Tuần 2 — Hai con trỏ & Cửa sổ trượt" (10 bài), "Tuần 3 — Sắp xếp & Tìm kiếm" (10 bài), "Ôn thi giữa kỳ KTLT" (12 bài).
```

**Trang 2b — Danh sách bài trong khối:**
```
Create the problem-set detail page for "Tuần 2 — Hai con trỏ & Cửa sổ trượt". Breadcrumb, set title, description, progress bar. A table of problems with columns: my status icon (solved check / attempted cross / empty), code (P01), title, difficulty, class acceptance rate, solved count. Rows hover-highlight and link to the problem page.
```

**Trang 3 — Đọc đề & nộp bài:**
```
Create the problem page as a resizable two-column layout. Left: breadcrumb "Tuần 2 › P02", title "P02 — Đoạn con độ dài K có tổng lớn nhất", info chips (1000 ms, 256 MB, 3 test, Trung bình), problem statement with math formulas (e.g. 1 ≤ k ≤ n ≤ 2·10^5), sections Input / Output, a sample Input/Output table with copy buttons, and a collapsible "Gợi ý" box. Right: a C code editor with line numbers and syntax highlighting, buttons "Tải file .c" and a prominent "Nộp bài", and below it a result panel showing per-test rows (Test #1 Accepted 15 ms 1212 KB, Test #2 Accepted, Test #3 Time Limit Exceeded 1000 ms) with an overall verdict banner. Also show variants: judging in progress ("Đang chấm test 2/3…" with subtle animation) and Compilation Error with a scrollable monospace GCC error log. A secondary tab lists "Bài nộp của tôi" for this problem.
```

**Admin — Khung chung (dán thêm trước mỗi prompt Admin):**
```
This is the admin area of MiniJudge, used by the teacher and class leaders on desktop. Layout: fixed left sidebar (MiniJudge logo, items: Dashboard, Khối bài tập, Bài tập, Bài nộp, Người dùng, Cài đặt; user menu at the bottom) and a content area with page title, breadcrumb and primary action button on the top right. Data-dense but calm, like Vercel Dashboard and Linear settings. Tables support sorting, filtering, pagination, row selection. Use toasts for success, confirmation dialogs for destructive actions, skeletons for loading.
```

**Admin A1 — Dashboard:**
```
Create the admin dashboard. Top: date range segmented control (Hôm nay / 7 ngày / 30 ngày / Tùy chọn). KPI cards: "Người dùng 62", "Bài nộp hôm nay 418", "Tỉ lệ AC 37%", "Đang hoạt động 11", and a judge status card "Hàng đợi chấm: 2 bài · Hoạt động" with a green dot. Charts: submissions per day line chart (7 days), verdict distribution donut using verdict colors. Tables: "Bài khó nhất" (problem, attempts, solved, AC rate) and "Tiến độ theo khối" (set name with completion progress bars). Right column: live feed "Bài nộp mới nhất" (time, user, problem, verdict badge). Also show an alert banner variant: "Judge mất kết nối — bài nộp đang xếp hàng".
```

**Admin A2 — Quản lý khối bài tập:**
```
Create the problem-set management page. Table columns: name, problems count, status pill (Nháp / Đang mở / Đã đóng), deadline, class completion %, actions menu (Sửa, Nhân bản, Ẩn, Xóa). Primary button "Tạo khối mới". Then the create/edit form as a side drawer or full page: name, description, cover color picker, topic tags input, difficulty select, open date and deadline pickers, visibility radio (Công khai / Ẩn / Nháp), and a "Bài trong khối" section with a problem search-to-add field and a drag-and-drop ordered list (drag handle, code, title, remove button). Include a delete confirmation dialog: "Xóa khối 'Tuần 2'? Khối có 10 bài và 245 bài nộp. Bài tập không bị xóa, chỉ gỡ khỏi khối."
```

**Admin A3 — Quản lý bài tập:**
```
Create the problem management pages. 1) Problem list table: code, title, set, difficulty, tests count, submissions, AC rate, status (Nháp / Đã xuất bản), search and filters, button "Tạo bài mới". 2) Problem editor with tabs: "Thông tin" (code, title, difficulty, tags, time limit ms, memory limit MB); "Đề bài" (split view: Markdown editor left, live rendered preview right with math formulas and sample table); "Test" (list of input/output pairs with size and first-lines preview, checkbox "Là test ví dụ", reorder and delete, drag-and-drop upload zone accepting .in/.out files or a .zip); "Lời giải & Kiểm tra" (reference C solution editor, button "Chạy thử với toàn bộ test", per-test result table). Sticky footer with "Lưu nháp" and "Xuất bản" buttons and an unsaved-changes indicator.
```

**Admin A4–A6 — Bài nộp, Người dùng, Cài đặt:**
```
Create three admin pages. "Bài nộp": full submissions table filterable by user, problem, set, verdict and date; row click opens a detail drawer with source code and per-test results; bulk action "Chấm lại". "Người dùng": table with username, role badge (Sinh viên / Admin), solved count, last active, status (Hoạt động / Bị khóa), actions (Đổi vai trò, Khóa, Đặt lại mật khẩu, Xem bài nộp). "Cài đặt": cards for "Mã lớp đăng ký" (masked value, reveal, regenerate button), toggle "Cho phép đăng ký mới", and "Thông báo trang chủ" textarea with preview of the banner.
```
