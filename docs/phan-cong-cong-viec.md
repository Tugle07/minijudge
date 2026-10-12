# Phân công công việc — MiniJudge (Deadline 08/11/2026)

> Bảng này dùng làm khung cho YC02. Chép sang Google Sheets/Trello, điền tên thành viên và cập nhật trạng thái hằng tuần.
> Mỗi người **commit bằng tài khoản GitHub riêng** cho phần mình phụ trách (YC01).

## Chia module (4 người)

| Thành viên | Module chính | File phụ trách | Nội dung báo cáo phụ trách |
|---|---|---|---|
| TV1 (Trưởng nhóm) | Lõi chạy bài & giới hạn tài nguyên | `core/src/judge.c`, `run-windows.c`, `run-posix.c` | Chương 3.2–3.3: Job Object, fork/setrlimit, đo thời gian/bộ nhớ |
| TV2 | Dữ liệu: đề bài & lưu trữ | `core/src/problem.c`, `submission-store.c`, `util.c` | Chương 2: thiết kế struct, mảng động, file nhị phân |
| TV3 | Thuật toán: so khớp & xếp hạng | `core/src/compare.c`, `scoreboard.c` | Chương 3.4: so khớp token, luật ICPC, qsort với hàm so sánh |
| TV4 | Giao diện console & kiểm thử | `console/*`, `samples/`, `problems/` | Chương 1 (menu), Chương 4 (test case, xử lý ngoại lệ) |
| Cả nhóm | Bản web (phần mở rộng) | `web/`, `Dockerfile` | Phụ lục: kiến trúc mở rộng lên web |

## Lộ trình 4 tuần

| Tuần | Thời gian | Mục tiêu | Kết quả cần có |
|---|---|---|---|
| 1 | 12/10 – 18/10 | Đọc hiểu code khung, tạo repo GitHub, mỗi người chạy được bản console | Repo có commit của đủ 4 người; mỗi người giải thích được module mình |
| 2 | 19/10 – 25/10 | Hoàn thiện module + thêm 8–10 đề (lấy từ bài ICPC Tuần 1–2) | 10 đề có test; chạy đủ 6 loại verdict |
| 3 | 26/10 – 01/11 | Kiểm thử bộ nhớ (Dr. Memory/Valgrind), viết báo cáo, triển khai web thử | Không rò rỉ bộ nhớ; bản nháp báo cáo 30+ trang; web chạy thử với lớp |
| 4 | 02/11 – 08/11 | Sửa lỗi, slide, kịch bản demo, tập vấn đáp | Nộp báo cáo + slide + repo; mọi thành viên trả lời được câu hỏi về con trỏ/bộ nhớ |

## Bảng theo dõi (mẫu)

| Mã | Công việc | Người phụ trách | Deadline | Trạng thái | % đóng góp |
|---|---|---|---|---|---|
| T01 | Tạo repo, README, quy ước commit | TV1 | 13/10 | To do | |
| T02 | Viết thêm 8 đề + test | TV4 | 22/10 | To do | |
| T03 | Kiểm tra rò rỉ bộ nhớ toàn bộ core | TV2 | 29/10 | To do | |
| T04 | Viết Chương 2 báo cáo | TV2 | 30/10 | To do | |
| T05 | Triển khai Docker + Cloudflare Tunnel | TV1 | 01/11 | To do | |
| T06 | Slide + kịch bản demo | TV3 | 05/11 | To do | |
