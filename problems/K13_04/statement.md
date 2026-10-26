Hội đồng thẩm định mở gói thầu mua sắm trang thiết bị cho phòng máy tính thực hành với $n$ báo giá từ các nhà cung cấp.

Để phòng tránh rủi ro nhà thầu chào giá thấp bất thường do tính thiếu linh kiện, hội đồng quyết định xem xét mức **giá chào thấp thứ hai** (tức là mức giá nhỏ nhất trong số các báo giá lớn hơn hẳn mức giá thấp nhất). Nếu tất cả các đơn vị tham gia đều chào một mức giá giống hệt nhau, gói thầu không chọn được mức giá thứ hai và cần hủy thầu để đấu giá lại (in `NONE`).

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### Dữ liệu ra (Output)
In ra giá trị nhỏ thứ hai hoặc in `NONE` nếu không tồn tại.

### Ví dụ 1
**Input:**
```text
10
4 -2 9 16 -5 1 3 7 -2 25
```
**Output:**
```text
-2
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
