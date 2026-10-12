# MiniJudge — Hệ thống chấm bài tự động (BTL Kỹ thuật Lập trình C)

Hệ thống chấm bài C kiểu Codeforces, gồm **một lõi chấm viết bằng C** dùng chung cho hai giao diện:

| Bản | Dùng để | Công nghệ |
|---|---|---|
| **Console** (`build/minijudge`) | Sản phẩm nộp BTL, demo vấn đáp | C11 thuần |
| **Web** (`web/`) | Cho cả lớp nộp bài qua trình duyệt | Node.js gọi `build/judge-cli` |

```
              ┌────────────── core/ (C) ──────────────┐
              │ problem   judge   compare   scoreboard │
              │ run-windows.c (Job Object)             │
              │ run-posix.c   (fork + setrlimit)       │
              │ submission-store (file nhị phân)       │
              └──────────┬───────────────────┬─────────┘
                         │                   │
             console/ (menu C)        cli/judge-cli (JSON)
                                             │
                                  web/server.js (Node + SQLite)
                                             │
                                        Trình duyệt
```

## Kết quả chấm

`AC` Accepted · `WA` Wrong Answer · `TLE` Time Limit Exceeded · `MLE` Memory Limit Exceeded · `RE` Runtime Error · `CE` Compilation Error

- Output được so theo từng token (bỏ qua khác biệt khoảng trắng), giống checker mặc định của Codeforces.
- Windows: bài chạy trong **Job Object** (giới hạn RAM, chỉ 1 tiến trình để chặn fork bomb, đo CPU time mỗi 20 ms).
- Linux: `fork` + `setrlimit` (CPU, RAM, kích thước file) + `wait4`.
- Bảng xếp hạng theo **luật ICPC**: số bài AC giảm dần, penalty tăng dần (phút AC + 20 phút mỗi lần sai, không tính CE).

## Biên dịch & chạy bản console (Windows)

Yêu cầu: GCC (MinGW-w64), `mingw32-make`.

```bash
mingw32-make
```

```bash
build\minijudge.exe
```

Trên Linux/macOS dùng `make` và `./build/minijudge`. Chương trình biên dịch không cảnh báo với `-Wall -Wextra`.

## Chạy bản web trên máy

Yêu cầu: Node.js ≥ 22.13 (dùng `node:sqlite` có sẵn), đã build lõi C ở bước trên.

```bash
cd web && npm install && npm start
```

Mở http://127.0.0.1:3000. Mặc định server chỉ nghe trên `127.0.0.1`, tức chỉ máy mình truy cập được.

Biến môi trường: `PORT`, `HOST`, `DATA_DIR`, `PROBLEMS_DIR`, `JUDGE_BIN`, `COOKIE_SECURE=1` (khi chạy sau HTTPS).

## Đưa lên mạng cho cả lớp dùng

> ⚠️ Judge chạy **code lạ của người khác**. Không bao giờ mở bản Windows ra Internet. Chỉ triển khai bằng `docker compose` trên Linux.

Hướng dẫn từng bước (WSL + Docker + GitHub Actions + Cloudflare Tunnel): **[docs/trien-khai-server.md](docs/trien-khai-server.md)**.

Tóm tắt: `docker-compose.yml` chạy 3 container: `web` (database), `judge` (chạy bài nộp, không Internet, user `nobody`), `tunnel` (HTTPS công khai). Mỗi lần push lên `main`, GitHub Actions build, chấm 8 bài mẫu và tự deploy.

Kiểm thử trên Linux:

```bash
bash scripts/test-samples.sh
```

## Khu Admin (`/admin.html`)

Tài khoản có tên trong biến môi trường `ADMIN_USERS` luôn là Admin (dùng để tạo Admin đầu tiên); Admin có thể cấp quyền cho người khác trong trang Người dùng.

| Trang | Làm được gì |
|---|---|
| Dashboard | Số liệu thật theo Hôm nay / 7 / 30 ngày: sinh viên, bài nộp, tỉ lệ AC, người đang online, hàng đợi chấm và trạng thái judge, biểu đồ, bài khó nhất, tiến độ khối, bài nộp mới nhất (tự cập nhật 5 giây/lần) |
| Khối bài tập | Tạo / sửa / nhân bản / ẩn / xóa khối; hạn nộp, thời gian mở, màu, nhãn; kéo thả sắp thứ tự bài |
| Bài tập | Tạo bài mới trên web: thông tin, đề Markdown có xem trước, gợi ý, tải test (.in/.out), đánh dấu test ví dụ, kéo thả thứ tự, chạy lời giải mẫu với toàn bộ test, lưu nháp / xuất bản. Bài trong repo chỉ đổi trạng thái, nhãn, lời giải mẫu |
| Bài nộp | Lọc theo người / bài / khối / kết quả / ngày, sắp xếp, phân trang, xem code, chấm lại 1 hoặc nhiều bài |
| Người dùng | Đổi vai trò, khóa / mở khóa (đăng xuất ngay), đặt lại mật khẩu tạm, xem bài nộp của từng người |
| Cài đặt | Mã lớp, bật/tắt đăng ký mới, banner thông báo trên trang chủ |

Khối bài, trạng thái bài và cài đặt lưu trong database; `problems/sets.json` chỉ dùng để khởi tạo lần đầu. Bài tạo trên web lưu ở `CUSTOM_PROBLEMS_DIR` (khi deploy là volume `minijudge-problems`, container judge chỉ được đọc).

## Kiểm thử

```bash
bash scripts/test-samples.sh
```

```bash
cd web && npm test
```

Test tích hợp chạy server thật + judge thật: 8 test luồng sinh viên, 5 test luồng Admin (tạo bài → test → kiểm tra lời giải → xuất bản → sinh viên nộp → chấm lại → khóa tài khoản…). CI chạy cả hai mỗi lần push.

## Thêm đề mới

```
problems/
├── index.txt            # mỗi dòng 1 mã đề
├── sets.json            # các khối bài (tuần) hiện trên trang chủ web
└── P03/
    ├── problem.txt      # title, time_ms, memory_mb, tests=N, difficulty=Dễ|Trung bình|Khó, samples=1,2
    ├── statement.md     # đề bài (Markdown, công thức $...$)
    ├── hint.md          # gợi ý (tùy chọn)
    └── tests/1.in 1.out 2.in 2.out ...   # test trong samples= hiện làm ví dụ trong đề
```

Cả bản console và bản web đọc chung thư mục này. Các bài P03–P17 được sinh bằng `python scripts/generate-problems.py` (đề, gợi ý, test ví dụ + test ngẫu nhiên có seed cố định, kèm lời giải mẫu) — thêm bài mới bằng cách thêm một mục vào danh sách `PROBLEMS` trong script.

Trên web, khi bài bị WA **ở test ví dụ**, người nộp thấy input / đáp án / output của mình (tô dòng sai đầu tiên); test ẩn thì không lộ. Nút **Chạy thử** (Ctrl + ') chạy code với input tự nhập, không tính vào bài nộp.

## Thử nhanh

Thư mục `samples/` có sẵn bài nộp mẫu cho đủ 6 loại kết quả. Ví dụ:

```bash
build\judge-cli.exe problems P01 samples/p01-tle.c
```

## Cấu trúc mã nguồn

| Thư mục | Nội dung |
|---|---|
| `core/include`, `core/src` | Lõi chấm: đọc đề, biên dịch, chạy có giới hạn, so output, lưu bài nộp, bảng xếp hạng |
| `console/` | Giao diện menu console (bảng con trỏ hàm, nhập liệu an toàn, màu ANSI) |
| `cli/` | `judge-cli`: chấm 1 bài, in JSON — cầu nối cho web |
| `web/` | Server Express + SQLite + giao diện HTML/JS |
| `problems/` | Đề bài và test |
| `samples/` | Bài nộp mẫu để kiểm thử |
| `docs/` | Phân công công việc, dàn ý báo cáo |
