Kỳ thi có $3$ bài, mỗi bài tối đa $100$ điểm. Mỗi thí sinh có mã (tên đăng nhập), điểm từng bài và **thời gian phạt** (phút). Bảng xếp hạng sắp theo:
1. **Tổng điểm** giảm dần;
2. bằng tổng điểm thì **thời gian phạt** tăng dần;
3. vẫn bằng thì **mã** tăng dần theo thứ tự từ điển (chỉ để cố định thứ tự in).

Hai thí sinh bằng cả tổng điểm và thời gian phạt thì **cùng hạng**; hạng của người tiếp theo bỏ qua các hạng đã dùng (ví dụ $1, 2, 2, 4$).

### Input
- Dòng 1: $n$ ($1 \le n \le 2 \cdot 10^5$).
- $n$ dòng tiếp theo: mã thí sinh (chữ thường và chữ số, dài $1$–$20$, các mã khác nhau), ba điểm $s_1, s_2, s_3$ ($0 \le s_i \le 100$) và thời gian phạt $p$ ($0 \le p \le 10^4$).

### Output
In $n$ dòng theo thứ tự bảng xếp hạng, mỗi dòng: hạng, mã, tổng điểm.
