# Dàn ý báo cáo (YC03: 30–45 trang)

**Trang bìa · Lời nói đầu · Mục lục**

## Chương 1. Phân tích bài toán & thiết kế menu (≈6 trang)
1.1. Bài toán chấm bài tự động trong luyện thi ICPC/OLP; khảo sát Codeforces, VNOJ, Themis
1.2. Yêu cầu chức năng: quản lý đề, nộp bài, chấm, lịch sử, bảng xếp hạng
1.3. Yêu cầu phi chức năng: an toàn khi chạy code lạ, đo thời gian/bộ nhớ chính xác
1.4. Sơ đồ menu console; bảng con trỏ hàm `menu_item_t`

## Chương 2. Thiết kế struct & luồng dữ liệu (≈8 trang)
2.1. Các struct: `problem_t`, `run_result_t`, `judge_report_t`, `submission_t`, `score_row_t`
2.2. Mảng động tự giãn (`realloc` ×2), phân tích độ phức tạp khấu hao O(1)
2.3. Định dạng file: `problem.txt` (văn bản), `submissions.dat` (nhị phân, magic `MJS1`)
2.4. Luồng dữ liệu một lần nộp bài (sơ đồ: nhập → biên dịch → chạy từng test → so khớp → lưu)

## Chương 3. Cài đặt chi tiết (≈12 trang)
3.1. Biên dịch bằng `system()` + chuyển hướng stderr
3.2. Windows: `CreateProcess`, Job Object, completion port phát hiện MLE, đo CPU time
3.3. Linux: `fork`, `dup2`, `setrlimit`, `wait4`, tín hiệu `SIGXCPU`/`SIGKILL`
3.4. So khớp output theo từng ký tự; bảng xếp hạng ICPC với `qsort`
3.5. Nhập liệu an toàn: `fgets`, xử lý trôi lệnh, `strtol` có kiểm tra lỗi
3.6. Quản lý bộ nhớ: ai cấp phát thì ai giải phóng (`judge_report_free`, `scoreboard_free`…)

## Chương 4. Kết quả thử nghiệm & xử lý ngoại lệ (≈8 trang)
4.1. Bảng test case: 8 bài mẫu trong `samples/` → kết quả mong đợi/thực tế
4.2. Đo hiệu năng: P02 (n = 2·10⁵) với O(n) và O(n·k)
4.3. Kiểm tra rò rỉ bộ nhớ (Dr. Memory trên Windows / Valgrind trên Linux)
4.4. Ngoại lệ: file đề hỏng, file dữ liệu sai magic, đường dẫn có dấu ngoặc, input quá dài
4.5. Phần mở rộng: bản web dùng chung lõi chấm qua `judge-cli`

**Kết luận & hướng phát triển · Tài liệu tham khảo · Phụ lục: phân công & tỷ lệ đóng góp**
