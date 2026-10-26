Để tránh làm mất điện khi các xe đang sạc, ban quản lý trạm sạc điện cần giám sát công suất tiêu thụ điện tại $n$ mốc thời gian trong ngày.

Ban quản lý cần biết **công suất tiêu thụ lớn nhất là bao nhiêu** để tránh làm quá tải đường dây điện khiến mất điện, đồng thời cần biết **vị trí cuối cùng** đạt mức công suất đỉnh đó để lên phương án điều tiết tải. Hãy in ra công suất lớn nhất và vị trí cuối cùng đạt công suất đó.

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
