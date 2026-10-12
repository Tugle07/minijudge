Mỗi đơn hàng có mã, trạng thái và số tiền. Trạng thái được mã hóa bằng số nguyên tương ứng với `enum TrangThai { CHO_XAC_NHAN, DANG_GIAO, DA_GIAO, DA_HUY }` (lần lượt là $0, 1, 2, 3$).

### Input
- Dòng 1: số đơn $n$ ($1 \le n \le 10^5$).
- $n$ dòng sau, mỗi dòng: mã đơn (không có dấu cách), trạng thái ($0$ đến $3$), số tiền ($\le 10^9$).

### Output
- 4 dòng: tên từng trạng thái (đúng như tên trong `enum`) và số đơn ở trạng thái đó, theo thứ tự $0 \to 3$.
- Dòng 5: `DOANH_THU` và tổng tiền các đơn `DA_GIAO`.
- Dòng 6: `HUY` và mã các đơn `DA_HUY` theo thứ tự nhập, hoặc `HUY NONE`.
