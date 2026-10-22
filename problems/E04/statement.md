Cho bảng số nguyên $n$ hàng, $m$ cột (hàng đánh số $1..n$ từ trên xuống, cột $1..m$ từ trái sang). Trả lời $q$ câu hỏi: mỗi câu cho $r_1, c_1, r_2, c_2$, hãy tính **tổng các ô** thuộc hình chữ nhật có góc trên trái $(r_1, c_1)$ và góc dưới phải $(r_2, c_2)$.

### Input
- Dòng 1: $n, m, q$ ($1 \le n, m \le 500$, $1 \le q \le 2 \cdot 10^5$).
- $n$ dòng tiếp theo, mỗi dòng $m$ số nguyên $a_{ij}$ ($|a_{ij}| \le 10^9$).
- $q$ dòng cuối, mỗi dòng bốn số $r_1, c_1, r_2, c_2$ ($1 \le r_1 \le r_2 \le n$, $1 \le c_1 \le c_2 \le m$).

### Output
In $q$ dòng, mỗi dòng là tổng của một câu hỏi.
