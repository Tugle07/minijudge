Một chuỗi cửa hàng tiện lợi thống kê tình hình tài chính trong $n$ ngày liên tiếp. Trong danh sách kết quả kinh doanh, số nguyên dương thể hiện ngày có lợi nhuận, còn số nguyên âm thể hiện ngày bị thua lỗ.

Để chuẩn bị báo cáo tài chính cho ban giám đốc, bạn hãy giúp cửa hàng tính **mức lỗ trung bình** trong các ngày kinh doanh bị thua lỗ (làm tròn đúng 2 chữ số thập phân). Nếu trong toàn bộ đợt khảo sát cửa hàng kinh doanh thuận lợi và không có bất kỳ ngày nào bị lỗ, hãy in ra `NONE`.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### Dữ liệu ra (Output)
In ra giá trị trung bình cộng các số âm (định dạng `%.2lf`) hoặc in `NONE` nếu mảng không có số âm.

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
