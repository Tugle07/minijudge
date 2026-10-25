Để tìm số ở giữa trong 3 số a, b, c:
- Bạn có thể so sánh trực tiếp bằng if/else: a ở giữa nếu (a >= b && a <= c) hoặc (a >= c && a <= b). Tương tự cho b và c.
- Hoặc tính: `mid = a + b + c - max(a, b, c) - min(a, b, c)` (chú ý dùng long long để tránh tràn số khi cộng).
