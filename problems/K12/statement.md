Cho mảng $a$ gồm $n$ số nguyên (chỉ số từ $0$) và số nguyên $x$. Thực hiện lần lượt:
1. Tính tổng các phần tử **lẻ**.
2. Đếm số phần tử là **số chính phương** ($0$ cũng là số chính phương; số âm thì không).
3. Tìm giá trị nhỏ nhất và **mọi** vị trí của nó.
4. Kiểm tra mảng có **không giảm** hay không ($a_i \le a_{i+1}$ với mọi $i$).
5. Sắp xếp mảng **giảm dần** (tự cài đặt thuật toán).
6. Chèn $x$ vào mảng đã sắp xếp sao cho mảng vẫn giảm dần (không sắp xếp lại).
7. Đếm số giá trị **khác nhau** trong mảng ban đầu.

### Input
- Dòng 1: $n$ ($1 \le n \le 100$). Dòng 2: $n$ số nguyên $|a_i| \le 1000$. Dòng 3: số nguyên $x$ ($|x| \le 1000$).

### Output
7 dòng, dòng thứ $i$ là kết quả ý $i$. Dòng 3 gồm giá trị nhỏ nhất rồi các vị trí tăng dần; dòng 4 là `YES` hoặc `NO`; dòng 5, 6 là mảng.
