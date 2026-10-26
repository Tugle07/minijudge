Cho mảng $a$ gồm $n$ số nguyên ban đầu (đánh số chỉ số từ $0$ đến $n-1$).

Hãy tìm đoạn con gồm các phần tử liên tiếp có giá trị bằng nhau có độ dài lớn nhất trong mảng ban đầu.

In ra hai số nguyên cách nhau bởi dấu cách: **vị trí bắt đầu** (chỉ số từ $0$) và **độ dài** của đoạn liên tiếp đó. Nếu có nhiều đoạn cùng đạt độ dài lớn nhất, hãy lấy đoạn xuất hiện đầu tiên (chỉ số bắt đầu nhỏ nhất).

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
