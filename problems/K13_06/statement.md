Hệ thống cần bạn xử lý tệp tin gồm $n$ giá trị số nguyên trước khi đưa vào phân tích. Vì bụi kẹt ở đầu đọc cảm biến nên làm cho đầu ghi thêm các tín hiệu bị sai có giá trị bằng $x$ vào trong chuỗi dữ liệu.

Việc của bạn là:
1. **Sắp xếp lại** chuỗi dữ liệu theo thứ tự tăng dần (yêu cầu tự cài đặt thuật toán sắp xếp).
2. **Lọc ra** và loại bỏ toàn bộ các tín hiệu làm sai có giá trị bằng $x$ ra khỏi chuỗi dữ liệu.

In ra chuỗi dữ liệu còn lại sau khi xử lý (cách nhau bởi dấu cách). Nếu sau khi lọc mảng không còn phần tử nào, in ra `EMPTY`.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).
- Dòng 3: Số nguyên $x$ ($|x| \le 1000$).

### Dữ liệu ra (Output)
In ra các phần tử còn lại sau khi sắp xếp và xóa, cách nhau bởi dấu cách. Nếu không còn phần tử nào, in `EMPTY`.
