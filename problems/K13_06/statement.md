Cho mảng $a$ gồm $n$ số nguyên và số nguyên $x$. Hãy sắp xếp mảng theo thứ tự tăng dần (tự cài đặt thuật toán sắp xếp), sau đó xóa mọi phần tử có giá trị bằng $x$. In mảng kết quả, nếu mảng rỗng in `EMPTY`.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).
- Dòng 3: Số nguyên $x$ ($|x| \le 1000$).

### Dữ liệu ra (Output)
In ra các phần tử còn lại sau khi sắp xếp và xóa, cách nhau bởi dấu cách. Nếu không còn phần tử nào, in `EMPTY`.

### Ví dụ 1
**Input:**
```text
10
4 -2 9 16 -5 1 3 7 -2 25
-2
```
**Output:**
```text
-5 1 3 4 7 9 16 25
```

### Ví dụ 2
**Input:**
```text
3
5 5 5
5
```
**Output:**
```text
EMPTY
```
