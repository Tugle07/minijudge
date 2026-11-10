# Ý tưởng chống gian lận bằng AI trong cuộc thi (để làm sau)

Ghi lại ngày 2026-10-21. Chưa triển khai. Bối cảnh: thi tập trung trên lớp, lo học viên dùng điện thoại hoặc thiết bị khác để hỏi AI rồi gõ lại lời giải.

## Nguyên tắc
- Web không nhìn thấy điện thoại hay thiết bị phụ. Phần mềm chỉ **khoanh vùng** bài đáng nghi, giám thị bắt tận tay, **vấn đáp** để chốt kết luận.
- Thu mọi thiết bị trước giờ thi (điện thoại, đồng hồ thông minh, tai nghe) vẫn là biện pháp hiệu quả nhất.
- Quan điểm đã thống nhất: ai thật sự hiểu bài (giải thích được, sửa được) thì cho qua. Bài bị nghi thì gọi vấn đáp, không trừ điểm ngay.
- Phải ghi rõ trong luật thi là có dùng AI hay không, và quá trình gõ code có được ghi lại hay không.

## Các ý tưởng (theo thứ tự hiệu quả so với công sức)
1. **Đề biến thể theo chỗ ngồi:** mỗi bài có 2–3 phiên bản khác chi tiết. Chia phiên bản theo sơ đồ ghế để hai bạn ngồi cạnh nhau làm hai phiên bản khác nhau. Cần soạn thêm test cho từng phiên bản.
2. **Thử thách nối tiếp sau khi AC:** mở thêm một yêu cầu sửa nhỏ dựa trên chính bài đó (ví dụ khoảng 20% điểm, làm trong 5 phút). Người hiểu bài sửa nhanh; người chép phải tra lại, để lộ khoảng dừng lâu rồi gõ dồn. Ý tưởng được đánh giá đáng làm nhất.
3. **Bài mẫu AI + hiệu chỉnh ngưỡng theo từng bài:** mỗi bài nhập 3–5 lời giải từ ChatGPT, Gemini, Claude, rồi so bằng hàm `similarity` sẵn có. Ngưỡng nghi ngờ hiệu chỉnh theo độ giống "bình thường" so với các bài nộp luyện tập. Bài dễ thì báo nhầm nhiều.
4. **Xem lại quá trình viết code như tua video:** lưu các thay đổi khi gõ, đánh dấu kiểu gõ "chép" (gõ một mạch, gần như không xóa, nộp lần đầu đã AC).
5. **Bảng "Cần vấn đáp":** gom các tín hiệu (giống AI, kiểu gõ, ngồi cạnh bài giống nhau, làm thử thách nối tiếp chậm), kèm câu hỏi gợi ý theo code của từng bạn. Giám thị bấm đạt / không đạt.
6. **Sơ đồ chỗ ngồi:** học viên tự chọn ghế khi vào thi (không trùng ghế), giám thị đối chiếu và khóa ghế trên trang Giám sát. Hoặc giáo viên xếp chỗ trước. Nếu máy có dán nhãn (PC-12) thì cho học viên nhập số máy thay vì vẽ sơ đồ.

7. **Bắt buộc Safe Exam Browser (SEB):** chặn trường hợp chia sẻ màn hình qua Discord hoặc Zoom từ trước giờ thi để người ngoài đọc code. Web không phát hiện được trường hợp này. MiniJudge kiểm tra mã xác thực mà SEB gửi kèm theo file cấu hình; trong cấu hình SEB có danh sách ứng dụng cấm. Ngày 2026-10-22 sếp quyết định tạm bỏ qua: kiểm tra đột xuất thì học viên không kịp chuẩn bị người ngoài giúp.

## Kế hoạch đề xuất
- Đợt 1: ý tưởng 3, 5 và sơ đồ chỗ ngồi đơn giản.
- Đợt 2: ý tưởng 2 và 4.
- Đợt 3: ý tưởng 1.

## Giới hạn đã biết
- Không phát hiện được người ngoài đọc lời giải qua tai nghe.
- Không phân biệt được người đọc hiểu lời giải AI rồi tự viết lại.
- Thuật toán so code hiện tại là k-gram Jaccard tự viết, đơn giản hơn MOSS và JPlag. Ngưỡng 0.8 chưa được hiệu chỉnh trên dữ liệu thật. Khi cần kết luận chính thức thì chạy lại bằng JPlag hoặc MOSS (có thể thêm nút tải toàn bộ bài nộp dạng .zip).

## Cần hỏi giáo viên trước khi làm
Sơ đồ phòng thi (số dãy, số ghế mỗi dãy, máy có dán nhãn không) và ngày thi dự kiến.
