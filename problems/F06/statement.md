Bác Ba vừa cắm 3 cọc mốc để chuẩn bị khảo sát miếng đất mới mua. Mỗi cọc có toạ độ nguyên trên bản đồ: $A(x_A, y_A)$, $B(x_B, y_B)$, $C(x_C, y_C)$.

- Nếu 3 cọc **không tạo thành tam giác** (do 3 điểm thẳng hàng, hoặc có 2 cọc trùng nhau): in `INVALID`.
- Nếu tạo thành tam giác hợp lệ:
  - Dòng 1: **chu vi** tam giác.
  - Dòng 2: **diện tích** tam giác (dùng công thức Heron).
  Cả hai làm tròn **đúng 2 chữ số thập phân**.

### Input
Một dòng gồm 6 số nguyên $x_A, y_A, x_B, y_B, x_C, y_C$, trị tuyệt đối không quá $10^4$.

### Output
Một dòng `INVALID`, hoặc hai dòng chu vi và diện tích đã làm tròn.
