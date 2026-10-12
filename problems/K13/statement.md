Cho mảng $a$ gồm $n$ số nguyên (chỉ số từ $0$) và số nguyên $x$. Thực hiện lần lượt:
1. Trung bình cộng các phần tử **âm** (2 chữ số thập phân); không có thì in `NONE`.
2. Đếm số phần tử là **số nguyên tố**.
3. Giá trị lớn nhất và vị trí xuất hiện **cuối cùng** của nó.
4. Giá trị **nhỏ thứ hai** (lớn hơn hẳn giá trị nhỏ nhất); không có thì in `NONE`.
5. Kiểm tra mảng có **đối xứng** không ($a_i = a_{n-1-i}$).
6. Sắp xếp mảng **tăng dần** (tự cài đặt) rồi **xóa mọi** phần tử bằng $x$; in mảng còn lại, mảng rỗng in `EMPTY`.
7. Trên mảng ban đầu, tìm đoạn liên tiếp dài nhất gồm các phần tử **bằng nhau**: in vị trí bắt đầu và độ dài (nhiều đoạn cùng độ dài thì lấy đoạn đầu tiên).

### Input
- Dòng 1: $n$ ($1 \le n \le 100$). Dòng 2: $n$ số nguyên $|a_i| \le 1000$. Dòng 3: số nguyên $x$.

### Output
7 dòng, dòng thứ $i$ là kết quả ý $i$ (ý 5 in `YES` hoặc `NO`).
