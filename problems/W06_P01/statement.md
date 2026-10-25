Một cảm biến công nghiệp thu nhận mảng gồm $N$ giá trị số nguyên. Trong đó, các giá trị bằng $X$ là tín hiệu nhiễu cần bị loại bỏ.
Hãy xóa tất cả các phần tử có giá trị bằng $X$ **ngay trên mảng ban đầu (in-place)**.
In ra số lượng phần tử còn lại $K$, và dòng tiếp theo in $K$ phần tử đó theo thứ tự ban đầu. Nếu xóa hết, in `0` và dòng dưới in `EMPTY`.
### Input
- Dòng 1: Hai số nguyên $N, X$ ($1 \le N \le 1000, |X| \le 10^4$).
- Dòng 2: $N$ số nguyên $a_1, a_2, \dots, a_N$ ($|a_i| \le 10^4$).
### Output
- Dòng 1: Số phần tử còn lại $K$.
- Dòng 2: $K$ phần tử còn lại cách nhau dấu cách (hoặc `EMPTY` nếu $K = 0$).
