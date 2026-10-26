Một trạm cảm biến IoT thông minh thu thập và truyền $n$ gói tin dữ liệu về máy chủ trung tâm. Mỗi gói tin được gắn một mã số nhận diện nguyên $a_i$.

Theo giao thức an ninh mạng của hệ thống, các gói tin có mã số là **số nguyên tố** sẽ được chuyển thẳng vào luồng mã hóa đặc biệt để chống nghe lén. Bạn hãy viết chương trình đếm xem trong đợt truyền này có bao nhiêu gói tin được bảo vệ.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### Dữ liệu ra (Output)
Một số nguyên duy nhất là số lượng phần tử là số nguyên tố.

### Ví dụ 1
**Input:**
```text
10
4 -2 9 16 -5 1 3 7 -2 25
```
**Output:**
```text
2
```

### Ví dụ 2
**Input:**
```text
3
5 5 5
```
**Output:**
```text
3
```
