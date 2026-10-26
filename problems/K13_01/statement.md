Cho mảng $a$ gồm $n$ số nguyên. Tính trung bình cộng của các phần tử âm trong mảng (làm tròn 2 chữ số thập phân). Nếu không có số âm nào, in `NONE`.

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
