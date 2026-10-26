Trung tâm quản lý năng lượng giám sát công suất tiêu thụ điện tại một trạm sạc xe điện thông minh qua $n$ mốc thời gian trong ngày (chỉ số mốc từ $0$ đến $n-1$). 

Để tính toán phương án nâng cấp máy biến áp dự phòng, kỹ sư vận hành cần xác định **công suất đỉnh lớn nhất** từng đạt được trong ngày và **thời điểm (vị trí mốc đo) cuối cùng** xuất hiện công suất đỉnh đó.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### Dữ liệu ra (Output)
Gồm hai số nguyên cách nhau bởi dấu cách: giá trị lớn nhất và vị trí cuối cùng.

### Ví dụ 1
**Input:**
```text
10
4 -2 9 16 -5 1 3 7 -2 25
```
**Output:**
```text
25 9
```

### Ví dụ 2
**Input:**
```text
3
5 5 5
```
**Output:**
```text
5 2
```
