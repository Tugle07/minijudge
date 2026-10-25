- Khai báo ma trận 2 chiều `int a[55][55]`.
- Biến đếm `val = 1`.
- Vòng lặp `i` từ 0 đến `n - 1`:
  + Nếu `i % 2 == 0`: duyệt cột `j` từ 0 đến `m - 1`, gán `a[i][j] = val++`.
  + Nếu `i % 2 != 0`: duyệt cột `j` từ `m - 1` giảm dần về 0, gán `a[i][j] = val++`.
- Cuối cùng in ma trận ra màn hình.
