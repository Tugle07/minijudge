Cho mảng gồm $n$ phần tử. Thực hiện lần lượt $q$ thao tác:
- `1 k x`: chèn $x$ vào vị trí $k$ (các phần tử từ vị trí $k$ dịch sang phải; $k$ có thể bằng độ dài mảng $+1$ — tức chèn vào cuối).
- `2 k`: xóa phần tử ở vị trí $k$.

Vị trí đánh số từ $1$. Dữ liệu đảm bảo mọi thao tác hợp lệ.

### Input
- Dòng 1: $n$ ($0 \le n \le 1000$). Dòng 2: $n$ số nguyên (dòng trống nếu $n = 0$).
- Dòng 3: $q$ ($1 \le q \le 1000$). $q$ dòng sau là các thao tác, $|x| \le 1000$.

### Output
In mảng sau cùng trên một dòng, hoặc `EMPTY` nếu mảng rỗng.
