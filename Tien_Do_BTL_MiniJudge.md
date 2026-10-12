# 📊 THEO DÕI TIẾN ĐỘ THỰC TẾ — BTL MINIJUDGE (KỸ THUẬT LẬP TRÌNH C)
**Cập nhật lúc:** 13/10/2026  
**Google Sheet gốc:** [Bảng phân công nhiệm vụ MiniJudge](https://docs.google.com/spreadsheets/d/1HbTncabYX0LzWBd5zxFLFUaKTiQPpOeGnqZdDp4IQ98/edit?gid=775827891#gid=775827891)  
**Hạn nộp BTL:** 08/11/2026 (Còn 26 ngày)

---

## 👥 1. THÀNH VIÊN VÀ PHÂN CÔNG TRÁCH NHIỆM

| Mã TV | Họ và tên | GitHub | Vai trò | Module phụ trách | Giờ giao | Trạng thái hiện tại |
| :---: | :--- | :---: | :---: | :--- | :---: | :---: |
| **TV1** | **Trần Công Tuấn** | `Tugle07` | **Nhóm trưởng** | **Lõi chấm:** `judge.c`, `run-windows.c`, `run-posix.c`, GitHub & CI, Báo cáo C3.1–3.3 | 41h | 🟢 Đang dẫn đầu tiến độ |
| **TV2** | **Nguyễn Ngọc Bảo Trân** | `Bemote47` | Thành viên | **Dữ liệu:** `problem.c`, `submission-store.c`, `util.c`, Báo cáo C2 | 29h | 🟡 Cần cập nhật T1 |
| **TV3** | **Võ Thị Bích Trâm** | — | Thành viên | **Thuật toán:** `compare.c`, `scoreboard.c`, đề, Báo cáo C3.4–3.6, Slide | 32h | 🟡 Cần cập nhật T1 |
| **TV4** | **Lê Thái Tuấn** | — | Thành viên | **Giao diện console:** `console/*.c`, test case, Báo cáo C1 & C4, Demo | 32h | 🟡 Cần cập nhật T1 |

---

## 📅 2. TIẾN ĐỘ TUẦN 1 (13/10 – 19/10): KHỞI ĐỘNG & LÀM CHỦ CODE

> **Mục tiêu Tuần 1:** Cả 4 thành viên cài đặt môi trường, build chạy được chương trình, nắm vững module của mình để chuẩn bị vấn đáp.

| Mã NV | Hạng mục | Nhiệm vụ | Phụ trách | Giờ | Trên Sheet | **Thực tế hiện tại** | Hành động cần làm ngay |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **NV01** | Quản lý dự án | Tạo repo GitHub cho nhóm | TV1 | 2h | `To do` | **✅ ĐÃ XONG 100%** | Đổi sang `Done`. Dán link repo `https://github.com/Tugle07/minijudge` vào cột Minh chứng. Mời TV2, TV3, TV4 vào repo. |
| **NV02** | Quản lý dự án | Dựng bảng phân công trên Google Sheets | TV1 | 1h | `To do` | **✅ ĐÃ XONG 100%** | Đổi sang `Done`. Dán link Google Sheet vào cột Minh chứng. |
| **NV03** | Môi trường | Cài đặt & build được chương trình | TV2 (Hỗ trợ: Cả nhóm) | 3h | `To do` | **🟡 Đang làm (In Progress)** | Máy nhóm trưởng đã build chạy mượt cả C và Web. TV2 cần hỗ trợ TV3, TV4 build được trên máy của họ và chụp màn hình nộp minh chứng. |
| **NV04** | Lõi chấm | Làm chủ module chấm bài (`judge.c`, `run-windows.c`) | TV1 | 4h | `To do` | **🟡 Đang làm (In Progress)** | Nhóm trưởng đọc kỹ cơ chế Job Object trên Windows và fork/setrlimit trên Linux để viết tóm tắt 1 trang. |
| **NV05** | Dữ liệu | Làm chủ module dữ liệu (`problem.c`, `submission-store.c`) | TV2 | 4h | `To do` | `To do` | TV2 đọc hiểu cấu trúc struct và định dạng nhị phân file `.dat`. |
| **NV06** | Thuật toán | Làm chủ module so khớp & xếp hạng (`compare.c`, `scoreboard.c`) | TV3 | 4h | `To do` | `To do` | TV3 làm ví dụ tính tay bảng xếp hạng 3 người × 2 bài theo luật penalty ICPC. |
| **NV07** | Console | Làm chủ module menu console (`console/*.c`) | TV4 | 4h | `To do` | `To do` | TV4 tìm hiểu hàm `ui_read_line` và bảng con trỏ hàm `menu_item_t`. |
| **NV08** | Kiểm thử | Chạy bộ bài mẫu và lập bảng test case | TV4 | 2h | `To do` | `To do` | Chạy thử 8 bài mẫu trong thư mục `samples/` và ghi lại kết quả AC/WA/TLE/MLE/CE. |

---

## 🚀 3. CÁC HẠNG MỤC LÀM VƯỢT TIẾN ĐỘ (BONUS ĐIỂM CỘNG)
- **NV34 (Mở rộng Web):** Đã kích hoạt bản Web trên port 3000 và kết nối Cloudflare Tunnel công khai (`https://aid-salvation-card-proposals.trycloudflare.com`) để cả nhóm test trực tiếp trên điện thoại/laptop.

---

## 📝 4. VIỆC CẦN SẾP VÀO SHEET CẬP NHẬT NGAY ĐÊM NAY:
1. Mở tab **Nhiệm vụ**:
   - Dòng **NV01**: Sửa `To do` $\to$ **`Done`**, điền `% hoàn thành` = **100%**, cột Minh chứng dán: `https://github.com/Tugle07/minijudge`.
   - Dòng **NV02**: Sửa `To do` $\to$ **`Done`**, điền `% hoàn thành` = **100%**, cột Minh chứng dán link Google Sheet.
2. Mở tab **Thành viên**:
   - Điền thêm username GitHub của TV3 và TV4 nếu có.
3. Khi sếp sửa 2 việc trên thành `Done`, tab **Tiến độ & đóng góp** sẽ **tự động nhảy số** từ `0%` lên để giảng viên theo dõi thấy nhóm bắt đầu hoạt động ngay tuần 1!
