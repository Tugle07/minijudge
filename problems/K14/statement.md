Cài đặt sắp xếp nổi bọt tăng dần **có cờ hiệu**:
```
for (i = 0; i < n - 1; i++) {
    doiCho = 0;
    for (j = 0; j < n - 1 - i; j++)
        if (a[j] > a[j + 1]) { hoán đổi a[j], a[j+1]; doiCho = 1; }
    if (!doiCho) break;
}
```
Hãy cho biết số **lượt** của vòng lặp ngoài đã chạy, tổng số lần **hoán đổi**, và mảng sau khi sắp xếp.

### Input
- Dòng 1: $n$ ($1 \le n \le 1000$). Dòng 2: $n$ số nguyên $|a_i| \le 10^4$.

### Output
- Dòng 1: số lượt và số lần hoán đổi.
- Dòng 2: mảng đã sắp xếp.
