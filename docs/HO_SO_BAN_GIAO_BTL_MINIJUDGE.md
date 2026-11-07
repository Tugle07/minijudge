# HỒ SƠ BÀN GIAO TOÀN DIỆN: BÁO CÁO BÀI TẬP LỚN MINIJUDGE
> **Dành cho Agent / Trợ lý AI thực hiện biên soạn Báo cáo BTL môn Kỹ thuật Lập trình C**

---

## 📌 1. THÔNG TIN CHUNG VỀ HỌC PHẦN & ĐỀ TÀI

* **Tên trường:** Trường Đại học Giao thông Vận tải — Phân hiệu tại TP. Hồ Chí Minh (UTC2)
* **Khoa / Bộ môn:** Khoa Công nghệ Thông tin — Bộ môn Kỹ thuật Lập trình
* **Môn học:** Kỹ thuật Lập trình (C11) — Mã học phần: IT2026
* **Lớp:** CQ.67.CNTT (Khóa 67)
* **Giảng viên phụ trách / hướng dẫn:** Cô Trần Thị Dung & Bộ môn CNTT
* **Tên đề tài BTL:** **ĐỀ TÀI SỐ 21 — XÂY DỰNG HỆ THỐNG CHẤM BÀI TẬP LẬP TRÌNH TỰ ĐỘNG (MINIJUDGE) TRÊN NỀN TẢNG C11 VÀ MỞ RỘNG WEB PLATFORM**
  *(Bối cảnh: Lớp có danh sách 20 đề tài ứng dụng quản lý/game console cơ bản. Nhóm sinh viên đã xin phép Cô đăng ký Đề tài số 21 làm đề tài nghiên cứu nâng cao, áp dụng kiến trúc hệ thống cấp thấp và đã đưa vào chạy thi thực tế cho 90 sinh viên của trường).*

---

## 👥 2. DANH SÁCH THÀNH VIÊN VÀ PHÂN CÔNG MODULE

| STT | Họ và tên | Mã sinh viên | GitHub | Vai trò | Module phụ trách chính trong code | Nội dung báo cáo phụ trách | Tỷ lệ đóng góp |
|:---:|---|:---:|:---:|:---:|---|---|:---:|
| 1 | **Trần Công Tuấn** | `6751071084` | `Tugle07` | **Nhóm trưởng** | Lõi chấm `judge.c`, Win32 Sandbox `run-windows.c`, POSIX Sandbox `run-posix.c`, Docker & Cloudflare Tunnel, CLI `judge-cli.c`. | **Chương 3.1–3.3** *(Biên dịch, Sandbox Windows Job Object & Linux fork/setrlimit)* và **Chương 4.5–4.6** *(Thực nghiệm ca thi 26/10 & Mở rộng Web)*. | **100%** *(25%)* |
| 2 | **Nguyễn Ngọc Bảo Trân** | `6751071079` | `Bemote47` | Thành viên | Cấu trúc dữ liệu Struct, Mảng động tự co giãn, Cơ sở dữ liệu nhị phân `submissions.dat` (Magic `MJS1`), Module `problem.c`, `submission-store.c`, `util.c`. | **Chương 2** *(Thiết kế Struct, Chứng minh toán học O(1), Định dạng file văn bản & nhị phân, Sơ đồ DFD)*. | **100%** *(25%)* |
| 3 | **Võ Thị Bích Trâm** | `6751071078` | — | Thành viên | Thuật toán so khớp theo dòng `compare.c` (chuẩn hóa CRLF/LF, EOF), Bảng xếp hạng chuẩn ICPC `scoreboard.c` với `qsort`, Quản lý vòng đời bộ nhớ. | **Chương 3.4–3.6** *(So khớp output, Luật ICPC, Kỹ thuật nhập liệu an toàn & Dọn dẹp bộ nhớ 0 leak)*, Slide thuyết trình. | **100%** *(25%)* |
| 4 | **Lê Thái Tuấn** | `6751071083` | — | Thành viên | Giao diện Menu Console `console/main.c`, `menu-actions.c`, Thư viện nhập liệu `console/ui.c`, Ngân hàng test case và 8 bài mẫu `samples/`. | **Chương 1** *(Khảo sát OJ, Yêu cầu hệ thống, Bảng con trỏ hàm OCP)* và **Chương 4.1–4.4** *(Ma trận 8 test case, Hiệu năng P02 O(n), Valgrind/Dr. Memory, Ngoại lệ)*. | **100%** *(25%)* |

---

## 📐 3. QUY CHUẨN ĐỊNH DẠNG BÁO CÁO (THEO MẪU BỘ MÔN CNTT UTC2)

* **Độ dài bắt buộc:** **30 – 45 trang A4** (khoảng 12.000 – 16.000 từ).
* **Font chữ & Cỡ chữ:**
  - Văn bản chính: **Times New Roman**, cỡ **13pt**, giãn dòng **1.5 line**, căn đều hai bên (Justified), thụt đầu dòng đoạn văn 1cm.
  - Tiêu đề: Chương (18pt Bold Center), Mục 1 (15pt Bold), Mục 2 (13.5pt Bold), Mục 3 (13pt Bold/Italic).
  - Khối mã nguồn: Font đơn cách **Consolas** hoặc **Courier New**, cỡ 9.5 – 10pt, có khung nền xám nhạt và đường kẻ biên.
* **Căn lề trang:** Trái (Left) 2.5 cm; Phải (Right) 2.0 cm; Trên (Top) 2.0 cm; Dưới (Bottom) 2.5 cm.
* **Đánh số Bảng biểu, Hình vẽ, Sơ đồ:** Đánh số 2 cấp dạng `Số chương.Số thứ tự` (Ví dụ: *Bảng 1.1, Hình 2.1, Sơ đồ 3.1*). Cuối mỗi hình/bảng phải có chú thích nguồn gốc thực nghiệm.
* **Cấu trúc khung bìa & trang trước:**
  1. Trang bìa chính (có khung viền trang trọng theo mẫu `[IT] Mẫu báo cáo.docx`).
  2. Trang phụ bìa.
  3. Trang Nhiệm vụ bài tập lớn & Nhận xét của Giảng viên hướng dẫn (có thang điểm và chữ ký).
  4. Lời cảm ơn / Lời nói đầu.
  5. Mục lục tự động.
  6. Danh mục chữ viết tắt (AC, WA, TLE, MLE, RE, CE, ICPC, OLP, DFD,...).
  7. Danh mục Bảng biểu & Danh mục Sơ đồ, Hình vẽ.

---

## 🏗️ 4. NỘI DUNG KỸ THUẬT CỐT LÕI BẮT BUỘC TRONG 4 CHƯƠNG

### CHƯƠNG 1. PHÂN TÍCH BÀI TOÁN & THIẾT KẾ MENU CONSOLE (6–8 trang)
1. **Khảo sát hệ thống Online Judge:** Phân tích đối sánh 4 hệ sinh thái: Codeforces (máy chấm đóng, cloud), VNOJ/DMOJ (Django cồng kềnh), Themis (GUI 32-bit cũ, chỉ chạy Windows, dễ treo), DOMjudge (chuẩn ICPC nhưng cấu hình Linux phức tạp). Định vị MiniJudge: C11 thuần khiết, zero-dependency, chạy standalone cho phòng lab.
2. **Yêu cầu chức năng:** Quản lý đề (`problem.c`), nộp bài, biên dịch ngầm, chấm test dừng sớm (Stop-on-fail), lưu trữ nhị phân (`submissions.dat`), bảng xếp hạng thời gian thực (`scoreboard.c`).
3. **Yêu cầu phi chức năng:** Cách ly tiến trình (Process Sandboxing: chặn Fork Bomb, OOM, Disk Flooding), đo chính xác thời gian CPU thực tế (User CPU + Kernel CPU Time, không dùng Wall-clock Time vì bị nhiễu do điều phối OS).
4. **Kiến trúc Menu Console:** Thay thế khối `switch-case` cồng kềnh bằng mẫu thiết kế **Bảng con trỏ hàm (Function Pointer Dispatch Table)**:
   - Kiểu con trỏ hàm: `typedef void (*menu_action_fn)(app_t *app);`
   - Cấu trúc: `typedef struct { const char *label; menu_action_fn action; } menu_item_t;`
   - Đăng ký mảng tĩnh: `static const menu_item_t MENU[] = {...};`
   - Vòng lặp điều phối trong `main.c` đạt độ phức tạp $O(1)$, tuân thủ nguyên lý *Open/Closed Principle (OCP)*.

### CHƯƠNG 2. THIẾT KẾ STRUCT & LUỒNG DỮ LIỆU (≈ 8 trang)
1. **Thiết kế chi tiết các struct:**
   - `verdict_t` (enum: AC, WA, TLE, MLE, RE, CE, IE, PENDING).
   - `judge_limits_t` (`time_ms`, `memory_mb`).
   - `run_result_t` (kết quả 1 test: verdict, time_ms, memory_kb, exit_code).
   - `judge_report_t` (báo cáo tổng hợp: verdict, tests_passed, mảng động kết quả test, chuỗi lỗi gcc `compile_log`, preview `fail_output`).
   - `problem_t` và mảng động `problem_list_t`.
   - `submission_t` (fixed-size struct 64 bytes không chứa con trỏ) và `submission_list_t`.
   - `score_cell_t`, `score_row_t`, `scoreboard_t` (cấu trúc 2 tầng cho bảng xếp hạng ICPC).
2. **Cơ chế Mảng động tự co giãn & Chứng minh toán học chi phí khấu hao $O(1)$:**
   - Chiến lược nhân đôi kích thước: `cap = cap ? cap * 2 : 16; realloc(...)`.
   - Chứng minh toán học bằng **Phương pháp Kế toán (Accounting Method)**: Mỗi thao tác push thu phí khấu hao $\hat{c}_i = 3$ credits (1 phí chèn trực tiếp + 2 phí dự trữ sao chép). Số dư quỹ tiết kiệm sau $M$ phần tử luôn đạt $2M$ credits, vừa đủ để trả toàn bộ chi phí sao chép khi mảng đầy phải nhân đôi. Chi phí thực tế bị chặn bởi $3N = O(N)$, chi phí trung bình trên mỗi phần tử đạt $\frac{O(N)}{N} = O(1)$.
3. **Định dạng lưu trữ file:**
   - File văn bản `problem.txt` (cú pháp key-value: `title`, `time_ms`, `memory_mb`, `tests`).
   - File nhị phân `submissions.dat`: Mở đầu bằng **4-byte Magic Number** (`0x4D, 0x4A, 0x53, 0x31` tương ứng `"MJS1"`). Ghi trực tiếp khối nhị phân bằng `fwrite`/`fread`, tốc độ I/O nhanh gấp 10-20 lần so với JSON/Text, dung lượng cố định, chống sửa điểm thủ công.
4. **Sơ đồ luồng dữ liệu (Data Flow Diagram - DFD):** Vẽ sơ đồ Sequence Diagram thể hiện vòng đời từ Sinh viên nộp bài $\rightarrow$ `judge_submission` $\rightarrow$ `gcc` $\rightarrow$ Sandbox $\rightarrow$ `compare.c` $\rightarrow$ `submissions.dat` $\rightarrow$ `scoreboard_build`.

### CHƯƠNG 3. CÀI ĐẶT KỸ THUẬT CHI TIẾT (≈ 12 trang)
1. **Pipeline biên dịch mã nguồn (`core/src/judge.c`):**
   - Gọi biên dịch qua `system()` với cờ `-std=c11 -O2 -Wall -lm`.
   - Chuyển hướng luồng lỗi chuẩn: `2> log_path` bắt trọn vẹn thông báo lỗi cú pháp từ `stderr` vào chuỗi heap `rep->compile_log`.
   - Mở rộng Call Stack trên Windows lên 256MB: `-Wl,--stack,268435456` (phục vụ đệ quy sâu DFS). Hỗ trợ cả C++ (`g++`) và Python (`py_compile`).
2. **Sandbox trên Windows (`core/src/run-windows.c`):**
   - Tạo tiến trình ở trạng thái treo: `CreateProcessA` với cờ `CREATE_SUSPENDED | CREATE_NO_WINDOW`.
   - Cách ly bằng **Windows Job Object**: `JOBOBJECT_EXTENDED_LIMIT_INFORMATION`.
   - Chặn đứng Fork Bomb: `ActiveProcessLimit = 1`.
   - Giới hạn cứng bộ nhớ: `ProcessMemoryLimit = (SIZE_T)lim->memory_mb * 1024 * 1024`.
   - Bắt lỗi **MLE** bằng **I/O Completion Port**: Lắng nghe mã thông điệp `JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT` qua hàm `GetQueuedCompletionStatus`.
   - Đo thời gian CPU chuẩn xác: Hàm `GetProcessTimes` tính `(UserTime + KernelTime) / 10000` (mili-giây).
   - Vòng lặp thăm dò mỗi 20ms bằng `WaitForSingleObject` kết hợp ngắt Wall-clock timeout cho các bài nộp bị treo chờ input.
   - Vô hiệu hóa hộp thoại Crash của Windows: `SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX)`.
3. **Sandbox trên Linux/POSIX (`core/src/run-posix.c`):**
   - Phân nhánh tiến trình `fork()`, gán nhóm tiến trình độc lập `setpgid(0, 0)`.
   - Chuyển hướng luồng bằng cuộc gọi hệ thống cấp thấp `dup2`: stdin (0), stdout (1), stderr vào `/dev/null` (2).
   - Giới hạn tài nguyên ở cấp độ nhân bằng `setrlimit`: `RLIMIT_CPU`, `RLIMIT_AS` (bộ nhớ ảo), `RLIMIT_STACK`, `RLIMIT_FSIZE` (tối đa file 64MB), `RLIMIT_CORE` (= 0).
   - **Hạ đặc quyền người dùng (Privilege Dropping):** Khi judge chạy quyền root trong container, ép tiến trình bài nộp chạy dưới quyền user vô danh `nobody` (UID 65534) kết hợp `RLIMIT_NPROC = 1` để ngăn chặn bài nộp can thiệp tệp hệ thống hoặc tạo tiến trình ngầm.
   - Giám sát tiến trình bằng `wait4(pid, &status, WNOHANG, &ru)` và dọn sạch cây tiến trình con bằng `kill(-pid, SIGKILL)`.
4. **So khớp Output & Bảng xếp hạng chuẩn ICPC:**
   - Thuật toán so khớp nghiêm ngặt trong `compare.c`: Hàm `get_next_char` tự động bỏ qua ký tự `\r` (chuẩn hóa Windows CRLF sang Linux LF), cho phép ký tự `\n` dư thừa ở cuối file (EOF trailing newlines).
   - Bảng xếp hạng ICPC trong `scoreboard.c`: Xếp hạng 3 khóa: (1) Số bài giải được (`solved`) giảm dần $\rightarrow$ (2) Tổng điểm phạt (`penalty`) tăng dần $\rightarrow$ (3) Tên người dùng A-Z. Công thức tính điểm phạt: $Penalty = T_{AC} + 20 \times W$ (với $W$ là số lần nộp sai trước khi AC, không tính CE/IE). Sắp xếp mảng cấu trúc bằng `qsort` với hàm so sánh `compare_rows`.
5. **Kỹ thuật nhập liệu an toàn & Chống trôi lệnh:** Xây dựng thư viện `console/ui.c` thay thế hoàn toàn `scanf`/`gets`:
   - `ui_read_line`: Dùng `fgets`, cắt bỏ ký tự `\n` cuối chuỗi và tự động xả sạch bộ đệm stdin nếu nhập thừa ký tự.
   - `ui_read_int`: Nhập chuỗi và chuyển sang số nguyên bằng `strtol` có kiểm tra con trỏ lỗi `endptr`, ép người dùng nhập đúng khoảng $[min, max]$.
6. **Chiến lược quản lý bộ nhớ không rò rỉ:** Nguyên tắc "Module nào cấp phát động thì module đó giải phóng". Cài đặt các hàm dọn dẹp đối xứng: `judge_report_free`, `scoreboard_free`, `problem_list_free`, `store_free`.

### CHƯƠNG 4. KẾT QUẢ THỬ NGHIỆM & ĐÁNH GIÁ THỰC TẾ (≈ 8 trang)
1. **Ma trận kiểm thử 8 bài mẫu (`samples/`):**
   - `p01-ac.c` $\rightarrow$ **AC** (12ms, 1.8MB).
   - `p01-wa-overflow.c` $\rightarrow$ **WA** (tràn số kiểu `int` khi $a, b \ge 2 \cdot 10^9$).
   - `p01-tle.c` $\rightarrow$ **TLE** (ngắt tại 1000ms CPU do `for(;;) x++;`).
   - `p01-mle.c` $\rightarrow$ **MLE** (ngắt khi malloc $64 \times 16\text{MB} = 1024\text{MB} > 256\text{MB}$).
   - `p01-re.c` $\rightarrow$ **RE** (truy cập con trỏ NULL `*p = 42`, bắt mã 0xC0000005 / SIGSEGV).
   - `p01-ce.c` $\rightarrow$ **CE** (lỗi cú pháp thiếu `;`, trích xuất 4 dòng log `gcc`).
   - `p02-ac-sliding-window.c` $\rightarrow$ **AC** (thuật toán Cửa sổ trượt $O(N)$ chạy 42ms trên mảng $2 \cdot 10^5$).
   - `p02-tle-brute-force.c` $\rightarrow$ **TLE** (thuật toán vét cạn $O(N \cdot K)$ bị ngắt sau 1000ms).
2. **Kiểm tra rò rỉ bộ nhớ:**
   - **Valgrind Memcheck (Linux):** `All heap blocks were freed -- no leaks are possible`, `0 errors from 0 contexts`.
   - **Dr. Memory (Windows):** `NO ERRORS FOUND`, `0 unique, 0 total leak(s)`, đóng đầy đủ mọi Handle.
3. **Xử lý các tình huống ngoại lệ biên:** Tệp cấu hình đề hỏng/thiếu file, tệp dữ liệu nhị phân sai Magic Byte, mã sinh output vô tận làm tràn đĩa (bị ngắt bởi `RLIMIT_FSIZE = 64MB` và `JUDGE_OUTPUT_PREVIEW = 4096 bytes`), đường dẫn chứa khoảng trắng (`\"%s\"`).
4. **Thực nghiệm triển khai thực tế trên diện rộng (Ca thi ngày 26/10/2026):**
   - Tổ chức cho **90 sinh viên K13** với bộ đề 7 câu `K13_01` – `K13_07`.
   - Tiếp nhận và xử lý tự động thành công **1.484 bài nộp**.
   - Tỷ lệ phán quyết: **41.2% AC** (612 bài), **33.6% WA** (498 bài), **14.5% CE** (215 bài), **6.6% TLE** (98 bài), **4.1% RE** (61 bài). Máy chấm vận hành 100% ổn định.
   - **5 lỗi nhận thức thuật toán phổ biến nhất ở sinh viên năm nhất:**
     1. In chuỗi nhắc nhở: `printf("Nhap n = "); scanf("%d", &n);` $\rightarrow$ bị WA lập tức do checker so từng ký tự.
     2. Quên khởi tạo biến tích lũy / đếm (`int sum;` mang giá trị rác ngăn xếp).
     3. Chia nguyên số thực (`float ans = a / b;` với `int a, b;` bị cắt cụt phần thập phân).
     4. Thói quen nộp bài để dò cú pháp (tỷ lệ CE cao đột biến trong 15 phút đầu).
     5. Cố tình "hack test mẫu" bằng cấu trúc `if-else` cứng.
5. **Mở rộng hệ thống Web Platform:** Cầu nối CLI C `judge-cli` xuất chuỗi JSON, Backend Node.js + SQLite, đóng gói Docker container và mở mạng Internet công khai qua Cloudflare Tunnel ([https://oj.tuxstudy.site](https://oj.tuxstudy.site)).

---

## 📂 5. ĐƯỜNG DẪN TỆP NGUỒN & MINH CHỨNG THỰC TẾ

1. **Thư mục dự án mã nguồn C:**
   - Đường dẫn WSL: `/home/acc5kk/minijudge/`
   - Đường dẫn Windows: `\\wsl.localhost\Ubuntu\home\acc5kk\minijudge\` *(hoặc `C:\Users\Acc5k\Downloads\Workspace\BTL-KTLT-MiniJudge\`)*
2. **Thư mục báo cáo hoàn chỉnh đã biên soạn:**
   - Ngoài Desktop Windows: `C:\Users\Acc5k\Desktop\Bao_Cao_MiniJudge\`
     + `BAO_CAO_BTL_MINIJUDGE.docx` (Bản Word 42 trang chuẩn font Times New Roman, lề A4).
     + `BAO_CAO_BTL_MINIJUDGE.html` (Bản in ấn PDF).
     + `BAO_CAO_BTL_MINIJUDGE.md` (Bản Markdown kỹ thuật 12.143 từ).
3. **Repository GitHub:** `https://github.com/Tugle07/minijudge`
4. **Hệ thống Web & Cloudflare Tunnel:** `https://oj.tuxstudy.site` và trang quản trị `https://oj.tuxstudy.site/admin.html`
5. **Dữ liệu điểm thi & Vi phạm K13 (26/10/2026):** `C:\Users\Acc5k\.gemini\antigravity\brain\42f2bccd-a071-4245-9259-bc3842f9f1ed\bang-diem-kiem-tra-k13-kem-vi-pham.csv`
