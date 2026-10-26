Trạm quan trắc không khí tự động đặt tại ngã tư giao thông thu nhận $n$ mẫu chỉ số bụi mịn $PM2.5$. Do cảm biến quang học thỉnh thoảng bị kẹt bụi hoặc xung điện, nó phát ra mã đo lỗi có giá trị đúng bằng số nguyên $x$.

Trước khi gửi dữ liệu lên biểu đồ phân tích môi trường của thành phố, hệ thống cần:
1. **Sắp xếp** toàn bộ dãy dữ liệu theo thứ tự tăng dần (yêu cầu tự cài đặt thuật toán sắp xếp).
2. **Loại bỏ triệt để** mọi mẫu đo bị lỗi có giá trị bằng $x$.

In ra chuỗi dữ liệu sạch sau khi xử lý. Nếu tất cả các mẫu đo trong đợt quan trắc đều bị lỗi (sau khi xóa mảng không còn phần tử nào), hãy in ra `EMPTY` để kích hoạt còi bảo trì cảm biến.

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
