Cho hai số nguyên không âm $a, b$ và vị trí bit $k$ (bit $0$ là bit thấp nhất).

### Input
Ba số nguyên $a, b, k$ ($0 \le a, b < 2^{31}$, $0 \le k \le 30$).

### Output
- Dòng 1: `a & b`, `a | b`, `a ^ b`.
- Dòng 2: giá trị bit thứ $k$ của $a$ ($0$ hoặc $1$); $a$ sau khi **bật** bit $k$; $a$ sau khi **tắt** bit $k$.
- Dòng 3: số bit $1$ trong biểu diễn nhị phân của $a$.
