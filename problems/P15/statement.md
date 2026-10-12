Cho dãy $v_1, \ldots, v_n$. Có $m$ truy vấn, mỗi truy vấn gồm $t, l, r$:
- $t = 1$: in tổng $v_l + v_{l+1} + \ldots + v_r$ của dãy **ban đầu**.
- $t = 2$: in tổng các phần tử từ vị trí $l$ đến $r$ của dãy **sau khi sắp xếp tăng dần**.

### Input
- Dòng 1: $n$ ($1 \le n \le 10^5$). Dòng 2: $n$ số $v_i$ ($1 \le v_i \le 10^9$).
- Dòng 3: $m$ ($1 \le m \le 10^5$). $m$ dòng sau, mỗi dòng $t, l, r$ ($1 \le l \le r \le n$).

### Output
In kết quả mỗi truy vấn trên một dòng.
