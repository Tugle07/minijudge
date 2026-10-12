Bit thứ k: `(a >> k) & 1`. Bật: `a | (1 << k)`. Tắt: `a & ~(1 << k)`. Đếm bit 1: lặp `a &= a - 1` cho tới khi bằng 0, hoặc xét từng bit. (Đề cương mục 2.4)
