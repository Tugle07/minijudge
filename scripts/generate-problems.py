"""Sinh đề + test cho các bài Tuần 1-2 (dựa trên bộ bài ICPC luyện tập của nhóm).

Chạy:  python scripts/generate-problems.py
Mỗi bài: problems/<ID>/problem.txt, statement.md, hint.md, tests/<i>.in|.out.
Test 1..len(samples) là test ví dụ (hiện trong đề); còn lại sinh ngẫu nhiên với seed cố định.
"""
import os
import random
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "problems")
PI = "314159265358979323846264338327950288419716939937510"
LUCKY = [4, 7, 44, 47, 74, 77, 444, 447, 474, 477, 744, 747, 774, 777]


def sol_sort_sum(inp):
    return "+".join(sorted(inp.split()[0].split("+")))


def sol_sticks(inp):
    n, m = map(int, inp.split())
    return "An" if min(n, m) % 2 == 1 else "Binh"


def sol_coins(inp):
    d = list(map(int, inp.split()))
    a = sorted(d[1 : d[0] + 1], reverse=True)
    total, mine = sum(a), 0
    for i, x in enumerate(a):
        mine += x
        if mine > total - mine:
            return str(i + 1)


def sol_melon(inp):
    w = int(inp.split()[0])
    return "YES" if w > 2 and w % 2 == 0 else "NO"


def sol_bills(inp):
    n, res = int(inp.split()[0]), 0
    for b in (100, 20, 10, 5, 1):
        res += n // b
        n %= b
    return str(res)


def sol_min_x(inp):
    d = list(map(int, inp.split()))
    n, k = d[0], d[1]
    a = sorted(d[2 : n + 2])
    if k == 0:
        return "1" if a[0] > 1 else "-1"
    x = a[k - 1]
    return "-1" if k < n and a[k] == x else str(x)


def sol_cards(inp):
    d = list(map(int, inp.split()))
    a = d[1 : d[0] + 1]
    l, r, s = 0, len(a) - 1, [0, 0]
    turn = 0
    while l <= r:
        if a[l] > a[r]:
            s[turn] += a[l]; l += 1
        else:
            s[turn] += a[r]; r -= 1
        turn ^= 1
    return f"{s[0]} {s[1]}"


def multi(inp, per_case):
    tok = inp.split()
    t, pos, out = int(tok[0]), 1, []
    for _ in range(t):
        ans, pos = per_case(tok, pos)
        out.append(ans)
    return "\n".join(out)


def sol_prepend(inp):
    def case(tok, p):
        n, s = int(tok[p]), tok[p + 1]
        l, r = 0, n - 1
        while l < r and s[l] != s[r]:
            n -= 2; l += 1; r -= 1
        return str(n), p + 2
    return multi(inp, case)


def sol_fav_seq(inp):
    def case(tok, p):
        n = int(tok[p]); b = tok[p + 1 : p + 1 + n]
        res, l, r = [], 0, n - 1
        while l <= r:
            res.append(b[l])
            if l != r:
                res.append(b[r])
            l += 1; r -= 1
        return " ".join(res), p + 1 + n
    return multi(inp, case)


def sol_stripe(inp):
    def case(tok, p):
        n, k, s = int(tok[p]), int(tok[p + 1]), tok[p + 2]
        cur = s[:k].count("W"); best = cur
        for i in range(k, n):
            cur += (s[i] == "W") - (s[i - k] == "W")
            best = min(best, cur)
        return str(best), p + 3
    return multi(inp, case)


def sol_pi(inp):
    def case(tok, p):
        s, res = tok[p], 0
        while res < len(s) and s[res] == PI[res]:
            res += 1
        return str(res), p + 1
    return multi(inp, case)


def sol_parity(inp):
    def case(tok, p):
        n = int(tok[p])
        return ("YES" if sum(map(int, tok[p + 1 : p + 1 + n])) % 2 == 0 else "NO"), p + 1 + n
    return multi(inp, case)


def sol_stones(inp):
    tok = list(map(int, inp.split()))
    n = tok[0]; v = tok[1 : n + 1]; u = sorted(v)
    p1, p2 = [0], [0]
    for i in range(n):
        p1.append(p1[-1] + v[i]); p2.append(p2[-1] + u[i])
    m, pos, out = tok[n + 1], n + 2, []
    for _ in range(m):
        t, l, r = tok[pos : pos + 3]; pos += 3
        pre = p1 if t == 1 else p2
        out.append(str(pre[r] - pre[l - 1]))
    return "\n".join(out)


def sol_odd_even(inp):
    n, k = map(int, inp.split())
    odds = (n + 1) // 2
    return str(2 * k - 1 if k <= odds else 2 * (k - odds))


def sol_lucky(inp):
    n = int(inp.split()[0])
    return "YES" if any(n % x == 0 for x in LUCKY) else "NO"


def g_sort_sum(r, big):
    k = 50 if big else r.randint(1, 10)
    return "+".join(r.choice("123") for _ in range(k))


def g_list(r, n, lo, hi):
    return " ".join(str(r.randint(lo, hi)) for _ in range(n))


def g_min_x(r, big):
    n = 200000 if big else r.randint(1, 10)
    hi = 10 if r.random() < 0.5 and not big else 10**9
    return f"{n} {r.randint(0, n)}\n{g_list(r, n, 1, hi)}"


def g_cards(r, big):
    n = 1000 if big else r.randint(1, 12)
    a = r.sample(range(1, 1001), n)
    return f"{n}\n{' '.join(map(str, a))}"


def g_prepend(r, big):
    t = 100 if big else r.randint(1, 5)
    cases = []
    for _ in range(t):
        s = "".join(r.choice("01") for _ in range(r.randint(0, 6)))
        for _ in range(r.randint(0, 900 if big else 4)):
            a = r.choice("01")
            s = a + s + ("1" if a == "0" else "0")
        s = s or r.choice("01")
        cases.append(f"{len(s)}\n{s}")
    return f"{t}\n" + "\n".join(cases)


def g_fav_seq(r, big):
    t = 30 if big else r.randint(1, 4)
    cases = []
    for _ in range(t):
        n = 300 if big else r.randint(1, 8)
        cases.append(f"{n}\n{g_list(r, n, 1, 10**9)}")
    return f"{t}\n" + "\n".join(cases)


def g_stripe(r, big):
    t = 4 if big else r.randint(1, 5)
    cases = []
    for _ in range(t):
        n = 50000 if big else r.randint(1, 12)
        k = r.randint(1, n)
        s = "".join(r.choice("BW") for _ in range(n))
        cases.append(f"{n} {k}\n{s}")
    return f"{t}\n" + "\n".join(cases)


def g_pi(r, big):
    t = 1000 if big else r.randint(1, 6)
    out = []
    for _ in range(t):
        good = r.randint(0, 30)
        s = PI[:good]
        if len(s) < 30 and r.random() < 0.7:
            s += r.choice([c for c in "0123456789" if c != PI[len(s)]])
        s += "".join(r.choice("0123456789") for _ in range(r.randint(0, 30 - len(s))))
        out.append(s or "0")
    return f"{t}\n" + "\n".join(out)


def g_parity(r, big):
    t = 1000 if big else r.randint(1, 5)
    cases = []
    for _ in range(t):
        n = r.randint(2, 50)
        cases.append(f"{n}\n{g_list(r, n, 1, 50)}")
    return f"{t}\n" + "\n".join(cases)


def g_stones(r, big):
    n = 100000 if big else r.randint(1, 8)
    m = 100000 if big else r.randint(1, 8)
    qs = []
    for _ in range(m):
        l = r.randint(1, n); rr = r.randint(l, n)
        qs.append(f"{r.randint(1, 2)} {l} {rr}")
    return f"{n}\n{g_list(r, n, 1, 10**9)}\n{m}\n" + "\n".join(qs)


def g_odd_even(r, big):
    n = r.randint(10**11, 10**12) if big else r.randint(1, 20)
    return f"{n} {r.randint(1, n)}"


PROBLEMS = [
    dict(id="P03", set="w1", title="Sắp xếp phép cộng", difficulty="Dễ", solve=sol_sort_sum,
         gen=g_sort_sum, samples=["3+2+1", "2"],
         statement="""Bé Na mới học phép cộng nên chỉ tính được tổng khi các số hạng được viết **theo thứ tự không giảm**. Cho một biểu thức tổng chỉ gồm các số $1$, $2$, $3$ và dấu `+` (không có khoảng trắng), hãy viết lại biểu thức đó để bé Na tính được.

### Input
Một dòng chứa chuỗi $s$ là biểu thức tổng, độ dài không quá $100$ ký tự.

### Output
In ra biểu thức sau khi sắp xếp lại các số hạng theo thứ tự không giảm.""",
         hint="Chỉ có 3 loại số hạng. Hãy **đếm** số lượng chữ số `1`, `2`, `3` (bỏ qua dấu `+`) rồi in lần lượt, chèn `+` giữa các số."),
    dict(id="P04", set="w1", title="Trò chơi rút que", difficulty="Dễ", solve=sol_sticks,
         gen=lambda r, big: f"{r.randint(1, 100)} {r.randint(1, 100)}", samples=["2 2", "2 3", "3 3"],
         statement="""Có $n$ que đặt nằm ngang và $m$ que đặt thẳng đứng tạo thành một lưới gồm $n \\cdot m$ giao điểm. An và Bình chơi luân phiên, **An đi trước**. Mỗi lượt, người chơi chọn một giao điểm còn lại và rút bỏ **cả hai que** đi qua giao điểm đó. Ai đến lượt mà không còn giao điểm nào để chọn thì thua.

Biết cả hai đều chơi tối ưu, hãy cho biết ai thắng.

### Input
Một dòng gồm hai số nguyên $n, m$ ($1 \\le n, m \\le 100$).

### Output
In `An` nếu An thắng, ngược lại in `Binh`.""",
         hint="Mỗi lượt luôn làm mất đúng 1 que ngang và 1 que dọc, nên trò chơi kéo dài đúng $\\min(n, m)$ lượt bất kể chọn thế nào."),
    dict(id="P05", set="w1", title="Chia xu", difficulty="Dễ", solve=sol_coins,
         gen=lambda r, big: (lambda n: f"{n}\n{g_list(r, n, 1, 100)}")(100 if big else r.randint(1, 10)),
         samples=["2\n3 3", "3\n2 1 2"],
         statement="""Có $n$ đồng xu với giá trị $a_1, a_2, \\ldots, a_n$. Bạn muốn lấy **ít đồng nhất** sao cho tổng giá trị các đồng bạn lấy **lớn hơn hẳn** tổng giá trị các đồng còn lại.

### Input
- Dòng 1: số nguyên $n$ ($1 \\le n \\le 100$).
- Dòng 2: $n$ số nguyên $a_i$ ($1 \\le a_i \\le 100$).

### Output
In ra số đồng xu ít nhất cần lấy.""",
         hint="Tham lam: sắp xếp giảm dần rồi lấy từ đồng lớn nhất cho tới khi tổng của bạn $>$ tổng còn lại. Có thể dùng `qsort` với hàm so sánh."),
    dict(id="P06", set="w1", title="Chia dưa hấu", difficulty="Dễ", solve=sol_melon,
         gen=lambda r, big: str(r.randint(1, 100)), samples=["8", "2", "7"],
         statement="""Hai bạn muốn chia một quả dưa hấu nặng $w$ kg thành **hai phần**, mỗi phần có khối lượng là một **số chẵn dương** (không cần bằng nhau). Hỏi có chia được không?

### Input
Một số nguyên $w$ ($1 \\le w \\le 100$).

### Output
In `YES` nếu chia được, ngược lại in `NO`.""",
         hint="$w$ phải chẵn, nhưng hãy cẩn thận với trường hợp $w = 2$."),
    dict(id="P07", set="w1", title="Rút tiền ít tờ nhất", difficulty="Dễ", solve=sol_bills,
         gen=lambda r, big: str(r.randint(1, 10**9) if big else r.randint(1, 300)), samples=["125", "43", "1000000000"],
         statement="""Ngân hàng có các tờ tiền mệnh giá $1$, $5$, $10$, $20$ và $100$ (đồng), số lượng không giới hạn. Bạn cần rút đúng $n$ đồng. Hỏi cần **ít nhất** bao nhiêu tờ?

### Input
Một số nguyên $n$ ($1 \\le n \\le 10^9$).

### Output
In ra số tờ tiền ít nhất.""",
         hint="Lấy tờ mệnh giá lớn nhất có thể trước: dùng phép chia nguyên `/` và chia lấy dư `%`, không cần vòng lặp trừ dần (sẽ quá thời gian với $n = 10^9$)."),
    dict(id="P08", set="w1", title="Số x nhỏ nhất", difficulty="Trung bình", solve=sol_min_x, gen=g_min_x,
         samples=["7 4\n3 7 5 1 10 3 20", "7 2\n3 7 5 1 10 3 20", "3 0\n1 2 3"],
         statement="""Cho dãy $n$ số nguyên dương $a_1, \\ldots, a_n$ và số nguyên $k$. Hãy tìm số nguyên $x$ **nhỏ nhất** trong đoạn $[1, 10^9]$ sao cho có **đúng** $k$ phần tử của dãy nhỏ hơn hoặc bằng $x$. Nếu không tồn tại, in $-1$.

### Input
- Dòng 1: hai số nguyên $n, k$ ($1 \\le n \\le 2 \\cdot 10^5$, $0 \\le k \\le n$).
- Dòng 2: $n$ số nguyên $a_i$ ($1 \\le a_i \\le 10^9$).

### Output
In ra $x$ nhỏ nhất tìm được, hoặc $-1$.""",
         hint="Sắp xếp dãy. Với $k > 0$, ứng viên duy nhất là $a_{k}$ (đánh số từ 1) — nhưng kiểm tra xem $a_{k+1}$ có bằng nó không. Với $k = 0$, xét $x = 1$."),
    dict(id="P09", set="w2", title="Bốc thẻ hai đầu", difficulty="Dễ", solve=sol_cards, gen=g_cards,
         samples=["4\n4 1 2 10", "7\n1 2 3 4 5 6 7"],
         statement="""Có $n$ thẻ xếp thành một hàng, mỗi thẻ ghi một số nguyên **khác nhau**. An và Bình lần lượt bốc thẻ, **An đi trước**. Mỗi lượt, người chơi chỉ được bốc thẻ ở **đầu trái** hoặc **đầu phải** của hàng, và luôn chọn thẻ có số **lớn hơn** trong hai đầu. Trò chơi kết thúc khi hết thẻ. Tính tổng điểm của mỗi người.

### Input
- Dòng 1: số nguyên $n$ ($1 \\le n \\le 1000$).
- Dòng 2: $n$ số nguyên phân biệt từ $1$ đến $1000$.

### Output
In hai số: tổng điểm của An và của Bình.""",
         hint="Dùng **hai con trỏ** `l` và `r` ở hai đầu, mỗi lượt so sánh `a[l]` và `a[r]`, dùng một biến để đổi lượt."),
    dict(id="P10", set="w2", title="Thêm đầu thêm cuối", difficulty="Dễ", solve=sol_prepend, gen=g_prepend,
         samples=["3\n3\n100\n4\n0111\n6\n101010"],
         statement="""Từ một chuỗi nhị phân ban đầu (có thể rỗng), người ta thực hiện nhiều lần thao tác: thêm `0` vào một đầu và `1` vào đầu còn lại (tức là biến $s$ thành `0`$s$`1` hoặc `1`$s$`0`). Cho chuỗi kết quả, hãy tìm **độ dài nhỏ nhất** có thể của chuỗi ban đầu.

### Input
- Dòng 1: số bộ test $t$ ($1 \\le t \\le 100$).
- Mỗi bộ test gồm 2 dòng: độ dài $n$ ($1 \\le n \\le 2000$) và chuỗi nhị phân $s$ độ dài $n$.

### Output
Với mỗi bộ test, in ra độ dài nhỏ nhất trên một dòng.""",
         hint="Hai con trỏ từ hai đầu: còn bóc được khi hai ký tự ở hai đầu **khác nhau**."),
    dict(id="P11", set="w2", title="Khôi phục dãy", difficulty="Dễ", solve=sol_fav_seq, gen=g_fav_seq,
         samples=["2\n7\n3 4 5 2 9 1 1\n4\n9 2 7 1"],
         statement="""Minh viết dãy $a_1, a_2, \\ldots, a_n$ lên bảng theo cách: $a_1$ ở vị trí **trái nhất**, $a_2$ ở vị trí **phải nhất**, $a_3$ ngay bên phải $a_1$, $a_4$ ngay bên trái $a_2$, … cứ thế xen kẽ cho đến khi viết hết. Cho dãy $b$ đọc trên bảng từ trái sang phải, hãy khôi phục dãy $a$.

### Input
- Dòng 1: số bộ test $t$ ($1 \\le t \\le 300$).
- Mỗi bộ test: dòng đầu là $n$ ($1 \\le n \\le 300$), dòng sau là $n$ số nguyên $b_i$ ($1 \\le b_i \\le 10^9$).

### Output
Với mỗi bộ test, in dãy $a$ trên một dòng.""",
         hint="Đọc xen kẽ từ hai đầu của $b$: trái, phải, trái, phải… Cẩn thận khi hai con trỏ gặp nhau ở giữa (n lẻ)."),
    dict(id="P12", set="w2", title="Dải đen trắng", difficulty="Trung bình", solve=sol_stripe, gen=g_stripe,
         samples=["4\n5 3\nBBWBW\n5 5\nBBWBW\n5 1\nBBWBW\n1 1\nW"],
         statement="""Cho dải $n$ ô, mỗi ô màu đen (`B`) hoặc trắng (`W`). Mỗi thao tác tô một ô trắng thành đen. Hỏi cần ít nhất bao nhiêu thao tác để có **$k$ ô đen liên tiếp**?

### Input
- Dòng 1: số bộ test $t$ ($1 \\le t \\le 10^4$).
- Mỗi bộ test: dòng đầu gồm $n, k$ ($1 \\le k \\le n \\le 2 \\cdot 10^5$), dòng sau là chuỗi $s$ độ dài $n$. Tổng $n$ của mọi bộ test không quá $2 \\cdot 10^5$.

### Output
Với mỗi bộ test, in ra số thao tác ít nhất.""",
         hint="**Cửa sổ trượt** độ dài $k$: đếm số ô `W` trong cửa sổ, mỗi lần trượt cộng ô mới, trừ ô cũ, lấy giá trị nhỏ nhất. Đếm lại từ đầu mỗi cửa sổ sẽ bị TLE."),
    dict(id="P13", set="w2", title="Nhớ số Pi", difficulty="Dễ", solve=sol_pi, gen=g_pi,
         samples=["3\n31415\n000\n3141592653589793238462643383279"],
         statement="""Một bạn cố đọc thuộc các chữ số của số $\\pi = 3.14159\\ldots$ (bỏ dấu chấm, tức chuỗi `314159…`). Cho chuỗi chữ số bạn ấy đọc, hãy cho biết bạn ấy nhớ **đúng bao nhiêu chữ số đầu tiên**.

### Input
- Dòng 1: số bộ test $t$ ($1 \\le t \\le 1000$).
- Mỗi dòng tiếp theo là một chuỗi chữ số độ dài từ $1$ đến $30$.

### Output
Với mỗi chuỗi, in ra số chữ số đầu tiên khớp với $\\pi$.""",
         hint="Khai báo sẵn chuỗi `\"314159265358979323846264338327950\"` rồi so sánh từng ký tự cho đến khi khác."),
    dict(id="P14", set="w2", title="Chia nhóm cùng chẵn lẻ", difficulty="Dễ", solve=sol_parity, gen=g_parity,
         samples=["3\n4\n1 2 4 3\n2\n1 2\n3\n1 1 1"],
         statement="""Cho dãy $n$ số nguyên dương. Hãy chia các phần tử thành **hai nhóm khác rỗng** sao cho tổng của hai nhóm có **cùng tính chẵn lẻ**. Hỏi có thể chia được không?

### Input
- Dòng 1: số bộ test $t$ ($1 \\le t \\le 1000$).
- Mỗi bộ test: dòng đầu là $n$ ($2 \\le n \\le 50$), dòng sau là $n$ số nguyên $a_i$ ($1 \\le a_i \\le 50$).

### Output
Với mỗi bộ test, in `YES` hoặc `NO`.""",
         hint="Hai số cùng chẵn lẻ khi và chỉ khi tổng của chúng chẵn. Vậy chỉ cần xét tổng cả dãy."),
    dict(id="P15", set="w2", title="Truy vấn tổng hai kiểu", difficulty="Trung bình", solve=sol_stones, gen=g_stones,
         samples=["6\n6 4 2 7 2 7\n3\n2 3 6\n1 3 4\n1 1 6"],
         statement="""Cho dãy $v_1, \\ldots, v_n$. Có $m$ truy vấn, mỗi truy vấn gồm $t, l, r$:
- $t = 1$: in tổng $v_l + v_{l+1} + \\ldots + v_r$ của dãy **ban đầu**.
- $t = 2$: in tổng các phần tử từ vị trí $l$ đến $r$ của dãy **sau khi sắp xếp tăng dần**.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 10^5$). Dòng 2: $n$ số $v_i$ ($1 \\le v_i \\le 10^9$).
- Dòng 3: $m$ ($1 \\le m \\le 10^5$). $m$ dòng sau, mỗi dòng $t, l, r$ ($1 \\le l \\le r \\le n$).

### Output
In kết quả mỗi truy vấn trên một dòng.""",
         hint="Dựng **hai mảng cộng dồn** (prefix sum): một cho dãy gốc, một cho dãy đã sắp xếp. Mỗi truy vấn trả lời $O(1)$. Tổng có thể tới $10^{14}$ — dùng `long long`."),
    dict(id="P16", set="w2", title="Lẻ trước chẵn sau", difficulty="Dễ", solve=sol_odd_even, gen=g_odd_even,
         samples=["10 3", "7 7", "1000000000000 500000000001"],
         statement="""Viết các số từ $1$ đến $n$ theo thứ tự: **tất cả số lẻ** tăng dần, rồi đến **tất cả số chẵn** tăng dần. Hỏi số ở vị trí thứ $k$ là bao nhiêu?

### Input
Một dòng gồm hai số nguyên $n, k$ ($1 \\le k \\le n \\le 10^{12}$).

### Output
In ra số ở vị trí $k$.""",
         hint="Có $\\lceil n/2 \\rceil$ số lẻ. Không được tạo mảng ($n$ tới $10^{12}$) — tính trực tiếp bằng công thức, dùng `long long` và `%lld`."),
    dict(id="P17", set="w2", title="Chia hết cho số may mắn", difficulty="Dễ", solve=sol_lucky,
         gen=lambda r, big: str(r.randint(1, 1000)), samples=["47", "16", "78"],
         statement="""Số **may mắn** là số nguyên dương chỉ gồm các chữ số $4$ và $7$ (ví dụ $4, 47, 744$). Số $n$ gọi là **gần may mắn** nếu nó chia hết cho ít nhất một số may mắn. Hãy kiểm tra $n$ có gần may mắn không.

### Input
Một số nguyên $n$ ($1 \\le n \\le 1000$).

### Output
In `YES` hoặc `NO`.""",
         hint="Chỉ có 14 số may mắn không vượt quá $1000$. Liệt kê sẵn chúng vào một mảng rồi thử chia."),
]

EXTRA_TESTS = {"P04": ["1 1", "100 100", "1 100"], "P06": ["1", "4", "100", "99"], "P07": ["1", "4", "99"],
               "P16": ["1 1", "2 2"], "P17": ["4", "1", "1000", "777"], "P08": ["1 0\n1", "1 1\n5", "2 0\n2 2", "3 2\n5 5 5"]}


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text if text.endswith("\n") else text + "\n")


def build(p):
    r = random.Random(p["id"])
    inputs = list(p["samples"]) + EXTRA_TESTS.get(p["id"], [])
    while len(inputs) < 10:
        inputs.append(p["gen"](r, False))
    inputs.append(p["gen"](r, True))
    base = os.path.join(ROOT, p["id"])
    os.makedirs(os.path.join(base, "tests"), exist_ok=True)
    for i, inp in enumerate(inputs, 1):
        write(os.path.join(base, "tests", f"{i}.in"), inp)
        write(os.path.join(base, "tests", f"{i}.out"), p["solve"](inp))
    samples = ",".join(str(i) for i in range(1, len(p["samples"]) + 1))
    write(os.path.join(base, "problem.txt"),
          f"title={p['title']}\ntime_ms=1000\nmemory_mb=256\ntests={len(inputs)}\ndifficulty={p['difficulty']}\nsamples={samples}")
    write(os.path.join(base, "statement.md"), p["statement"])
    write(os.path.join(base, "hint.md"), p["hint"])
    return len(inputs)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    for p in PROBLEMS:
        if not only or p["id"] in only:
            print(p["id"], p["title"], build(p), "tests")
