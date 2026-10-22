Cầu thang có $n$ bậc, đánh số $1..n$ từ dưới lên; bạn đứng ở mặt đất (bậc $0$). Mỗi bước bạn leo lên từ $1$ đến $k$ bậc. Có $m$ bậc bị **hỏng**, không được đặt chân lên. Hỏi có bao nhiêu cách leo lên đúng bậc $n$? In kết quả **chia lấy dư cho $10^9 + 7$**.

### Input
- Dòng 1: $n, k, m$ ($1 \le k \le n \le 10^6$, $0 \le m < n$).
- Dòng 2: $m$ số nguyên phân biệt là các bậc hỏng, mỗi số trong khoảng $[1, n - 1]$ (dòng trống nếu $m = 0$).

### Output
In ra số cách leo chia dư cho $10^9 + 7$.
