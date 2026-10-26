Bạn cần phải báo cáo tình hình tài chính cho sếp sau chuỗi $n$ ngày kinh doanh liên tiếp. Trong danh sách doanh thu hàng ngày, số nguyên dương thể hiện ngày có lãi, còn số nguyên âm thể hiện ngày bị thua lỗ.

Sếp yêu cầu bạn tính **mức thua lỗ trung bình** của các ngày làm ăn thua lỗ (trung bình cộng các phần tử âm) và in ra làm tròn đúng 2 chữ số thập phân. Nếu trong đợt này công ty không có ngày nào bị lỗ, hãy in ra `NONE`.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### Dữ liệu ra (Output)
In ra mức thua lỗ trung bình làm tròn 2 chữ số thập phân hoặc in `NONE` nếu mảng không có ngày nào bị lỗ.

### Ví dụ 1
**Input:**
```text
10
4 -2 9 16 -5 1 3 7 -2 25
```
**Output:**
```text
-3.00
```

### Ví dụ 2
**Input:**
```text
3
5 5 5
```
**Output:**
```text
NONE
```
