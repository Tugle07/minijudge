Mỗi sản phẩm gồm mã, tên, đơn giá và số lượng tồn. Giá trị tồn kho của một sản phẩm = đơn giá × số lượng.

### Input
- Dòng 1: số sản phẩm $n$ ($1 \le n \le 1000$).
- Mỗi sản phẩm gồm 3 dòng: mã (không có dấu cách), tên (có thể có dấu cách, tối đa $50$ ký tự), đơn giá và số lượng ($1000 \le \text{giá} \le 10^9$, $0 \le \text{số lượng} \le 10^4$).

### Output
- Dòng 1: tổng giá trị tồn kho.
- Dòng 2: mã và tên của sản phẩm có giá trị tồn kho lớn nhất (nếu bằng nhau lấy sản phẩm nhập trước).
- Dòng 3: mã các sản phẩm đã hết hàng (số lượng $0$) theo thứ tự nhập, hoặc `NONE`.
