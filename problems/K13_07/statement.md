Hệ thống camera AI giám sát giao thông tại nút giao trọng điểm ghi nhận mức độ lưu thông qua $n$ khung giờ liên tiếp trong ngày (mỗi mức độ được mã hóa bằng một số nguyên $a_i$).

Để tối ưu hóa chu kỳ chuyển đèn tín hiệu giao thông, trung tâm điều hành cần phát hiện **chuỗi thời gian liên tiếp dài nhất mà tình trạng giao thông giữ nguyên không đổi** (các phần tử liên tiếp bằng nhau). Hãy xác định **vị trí bắt đầu** (chỉ số từ $0$) và **độ dài** của chuỗi thời gian ổn định dài nhất đó trên chuỗi dữ liệu ban đầu. Nếu có nhiều khoảng thời gian cùng đạt độ dài kỷ lục như nhau, hãy ưu tiên chọn chuỗi xuất hiện sớm nhất.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### Dữ liệu ra (Output)
Hai số nguyên cách nhau bởi dấu cách: vị trí bắt đầu và độ dài đoạn.

### Ví dụ 1
**Input:**
```text
10
4 -2 9 16 -5 1 3 7 -2 25
```
**Output:**
```text
0 1
```

### Ví dụ 2
**Input:**
```text
3
5 5 5
```
**Output:**
```text
0 3
```
