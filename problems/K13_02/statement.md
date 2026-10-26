Một đợt truyền tin gửi về hệ thống gồm $n$ gói tệp tin, mỗi gói được đại diện bởi một số nguyên $a_i$. 

Theo tình báo an ninh mạng biết được, các tệp tin chứa mã độc là các tệp tin được đại diện bởi một **số nguyên tố**. Bạn hãy lập trình đếm xem trong đợt truyền tin này có bao nhiêu tệp tin chứa mã độc để kịp thời cách ly và cảnh báo.

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
