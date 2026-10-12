"""Sinh bộ bài Lập trình C cơ bản (C01-C22), chủ đề theo lộ trình series C của blog.28tech.com.vn.

Đề, test và lời giải mẫu do nhóm tự soạn (không chép nội dung gốc).
Chạy:  python scripts/generate-c-course.py [C01 C02 ...]
"""
import importlib.util
import os
import random
import sys
from decimal import Decimal
from math import gcd, isqrt

_spec = importlib.util.spec_from_file_location("gen", os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate-problems.py"))
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)


def lines_of(inp):
    return inp.split("\n")


def sol_sum_div(inp):
    n, res, i = int(inp.split()[0]), 0, 1
    while i * i <= n:
        if n % i == 0:
            res += i + (n // i if i * i != n else 0)
        i += 1
    return str(res)


def sol_squares(inp):
    a, b = map(int, inp.split())
    return str(isqrt(b) - isqrt(a - 1))


def sol_palin_num(inp):
    tok = inp.split()
    return "\n".join("YES" if s == s[::-1] else "NO" for s in tok[1:int(tok[0]) + 1])


def is_prime(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True


def sol_prime(inp):
    tok = inp.split()
    return "\n".join("YES" if is_prime(int(x)) else "NO" for x in tok[1:int(tok[0]) + 1])


PERFECT = [6, 28, 496, 8128]


def sol_perfect(inp):
    a, b = map(int, inp.split())
    res = [str(x) for x in PERFECT if a <= x <= b]
    return " ".join(res) if res else "NONE"


def sol_gcd_lcm(inp):
    tok = list(map(int, inp.split()))
    out = []
    for i in range(tok[0]):
        a, b = tok[1 + 2 * i], tok[2 + 2 * i]
        g = gcd(a, b)
        out.append(f"{g} {a // g * b}")
    return "\n".join(out)


def sol_fib(inp):
    tok = list(map(int, inp.split()))
    f = [0, 1]
    while len(f) <= 92:
        f.append(f[-1] + f[-2])
    return "\n".join(str(f[n]) for n in tok[1:tok[0] + 1])


def sol_factor(inp):
    n, parts, p = int(inp.split()[0]), [], 2
    while p * p <= n:
        e = 0
        while n % p == 0:
            n //= p; e += 1
        if e:
            parts.append(f"{p}^{e}")
        p += 1
    if n > 1:
        parts.append(f"{n}^1")
    return " * ".join(parts)


def sol_hanoi(inp):
    n, moves = int(inp.split()[0]), []

    def move(k, a, b, c):
        if k == 0:
            return
        move(k - 1, a, c, b)
        moves.append(f"{a} {c}")
        move(k - 1, b, a, c)

    move(n, 1, 2, 3)
    return "\n".join([str(len(moves))] + moves)


def sol_freq(inp):
    tok = list(map(int, inp.split()))
    cnt = {}
    for x in tok[1:tok[0] + 1]:
        cnt[x] = cnt.get(x, 0) + 1
    return "\n".join(f"{x} {c}" for x, c in cnt.items())


def sol_insert_delete(inp):
    tok = list(map(int, inp.split()))
    n, pos = tok[0], 1
    a = tok[pos:pos + n]; pos += n
    q = tok[pos]; pos += 1
    for _ in range(q):
        if tok[pos] == 1:
            a.insert(tok[pos + 1] - 1, tok[pos + 2]); pos += 3
        else:
            del a[tok[pos + 1] - 1]; pos += 2
    return " ".join(map(str, a)) if a else "EMPTY"


def sol_bsearch(inp):
    from bisect import bisect_left
    tok = list(map(int, inp.split()))
    n = tok[0]
    a = tok[1:n + 1]
    out = []
    for x in tok[n + 2:n + 2 + tok[n + 1]]:
        i = bisect_left(a, x)
        out.append(str(i + 1) if i < n and a[i] == x else "-1")
    return "\n".join(out)


def sol_even_odd_sort(inp):
    tok = list(map(int, inp.split()))
    a = tok[1:tok[0] + 1]
    return " ".join(map(str, sorted(x for x in a if x % 2 == 0) + sorted((x for x in a if x % 2), reverse=True)))


def sol_longest_inc(inp):
    tok = list(map(int, inp.split()))
    a = tok[1:tok[0] + 1]
    res = cur = 1
    for i in range(1, len(a)):
        cur = cur + 1 if a[i] > a[i - 1] else 1
        res = max(res, cur)
    return str(res)


def read_matrix(tok, pos, n, m):
    return [tok[pos + i * m:pos + (i + 1) * m] for i in range(n)], pos + n * m


def sol_row_col(inp):
    tok = list(map(int, inp.split()))
    n, m = tok[0], tok[1]
    a, _ = read_matrix(tok, 2, n, m)
    return " ".join(str(sum(r)) for r in a) + "\n" + " ".join(str(sum(a[i][j] for i in range(n))) for j in range(m))


def sol_matmul(inp):
    tok = list(map(int, inp.split()))
    n, m, p = tok[0], tok[1], tok[2]
    a, pos = read_matrix(tok, 3, n, m)
    b, _ = read_matrix(tok, pos, m, p)
    return "\n".join(" ".join(str(sum(a[i][k] * b[k][j] for k in range(m))) for j in range(p)) for i in range(n))


def sol_spiral(inp):
    n, m = map(int, inp.split())
    g = [[0] * m for _ in range(n)]
    top, bot, lef, rig, v = 0, n - 1, 0, m - 1, 1
    while top <= bot and lef <= rig:
        for j in range(lef, rig + 1):
            g[top][j] = v; v += 1
        top += 1
        for i in range(top, bot + 1):
            g[i][rig] = v; v += 1
        rig -= 1
        if top <= bot:
            for j in range(rig, lef - 1, -1):
                g[bot][j] = v; v += 1
            bot -= 1
        if lef <= rig:
            for i in range(bot, top - 1, -1):
                g[i][lef] = v; v += 1
            lef += 1
    return "\n".join(" ".join(map(str, r)) for r in g)


def sol_palin_str(inp):
    tok = inp.split()
    return "\n".join("YES" if s == s[::-1] else "NO" for s in tok[1:int(tok[0]) + 1])


def sol_count_words(inp):
    return str(len(inp.split()))


def sol_char_freq(inp):
    s = inp.split()[0]
    return "\n".join(f"{c} {s.count(c)}" for c in sorted(set(s)))


def sol_normalize(inp):
    rows = lines_of(inp)
    out = []
    for line in rows[1:int(rows[0]) + 1]:
        w = [x.lower() for x in line.split()]
        out.append(" ".join(x.capitalize() for x in w))
        out.append(w[-1] + "".join(x[0] for x in w[:-1]) + "@st.utc2.edu.vn")
    return "\n".join(out)


def sol_students(inp):
    rows = lines_of(inp)
    n = int(rows[0])
    sv = [(rows[1 + 3 * i].strip(), " ".join(rows[2 + 3 * i].split()), Decimal(rows[3 + 3 * i].strip())) for i in range(n)]
    sv.sort(key=lambda s: (-s[2], s[0]))
    return "\n".join(f"{m} {t} {g:.2f}" for m, t, g in sv)


def g_tcases(r, big, cnt_big, item):
    t = cnt_big if big else r.randint(1, 6)
    return f"{t}\n" + "\n".join(item(r, big) for _ in range(t))


def g_num_palin(r, big):
    if r.random() < 0.5:
        h = str(r.randint(1, 10**8 if big else 999))
        return h + h[::-1][r.randint(0, 1):]
    return str(r.randint(1, 10**18 if big else 10**6))


def g_prime_item(r, big):
    x = r.randint(1, 10**9 if big else 200)
    if big and r.random() < 0.3:
        x = r.choice([999999937, 1000000007 - 8, 999999929, 2, 1, 4, 999999893])
    return str(x)


def g_semiprime(r, big):
    if not big:
        return str(r.randint(2, 5000))
    return str(r.choice([999983 * 1000003, 2**39, 600851475143, 10**12, 999999999989, 2 * 3 * 5 * 7 * 11 * 13 * 17 * 19 * 23 * 29 * 31]))


def g_insert_delete(r, big):
    n = 1000 if big else r.randint(0, 6)
    q = 1000 if big else r.randint(1, 6)
    size, ops = n, []
    for _ in range(q):
        if size == 0 or r.random() < 0.55:
            ops.append(f"1 {r.randint(1, size + 1)} {r.randint(-1000, 1000)}"); size += 1
        else:
            ops.append(f"2 {r.randint(1, size)}"); size -= 1
    return f"{n}\n{gen.g_list(r, n, -1000, 1000)}\n{q}\n" + "\n".join(ops)


def g_bsearch(r, big):
    n = 200000 if big else r.randint(1, 10)
    q = 200000 if big else r.randint(1, 8)
    hi = 10**9 if big else 20
    a = sorted(r.randint(1, hi) for _ in range(n))
    qs = [r.choice(a) if r.random() < 0.5 else r.randint(1, hi) for _ in range(q)]
    return f"{n}\n{' '.join(map(str, a))}\n{q}\n{' '.join(map(str, qs))}"


def g_matrix(r, n, m, lo, hi):
    return "\n".join(gen.g_list(r, m, lo, hi) for _ in range(n))


def g_row_col(r, big):
    n, m = (500, 500) if big else (r.randint(1, 5), r.randint(1, 5))
    return f"{n} {m}\n{g_matrix(r, n, m, -1000, 1000)}"


def g_matmul(r, big):
    n, m, p = (100, 100, 100) if big else (r.randint(1, 4), r.randint(1, 4), r.randint(1, 4))
    return f"{n} {m} {p}\n{g_matrix(r, n, m, -1000, 1000)}\n{g_matrix(r, m, p, -1000, 1000)}"


def g_sentence(r, big):
    words = ["lap", "trinh", "C", "utc2", "minijudge", "hello", "world", "k67", "a"]
    k = 15000 if big else r.randint(1, 8)
    return "".join(" " * r.randint(1 if i else 0, 3) + r.choice(words) for i in range(k)) + " " * r.randint(0, 2)


def g_str_palin(r, big):
    def item(r, big):
        h = "".join(r.choice("abc" if not big else "abcdefgh") for _ in range(r.randint(1, 499 if big else 5)))
        return h + h[::-1][r.randint(0, 1):] if r.random() < 0.5 else h
    return g_tcases(r, big, 100, item)


NAMES = ["nguyen", "tran", "le", "pham", "hoang", "van", "thi", "minh", "an", "binh", "tuan", "cong", "thanh", "ngoc", "lan"]


def g_names(r, big):
    def item(r, big):
        words = []
        for _ in range(r.randint(1, 5)):
            w = r.choice(NAMES)
            words.append("".join(c.upper() if r.random() < 0.3 else c for c in w))
        return " " * r.randint(0, 3) + "".join(w + " " * r.randint(1, 3) for w in words).rstrip() + " " * r.randint(0, 2)
    return g_tcases(r, big, 1000, item)


def g_students(r, big):
    n = 1000 if big else r.randint(1, 6)
    ids = r.sample(range(1, 100000), n)
    rows = [str(n)]
    for i in ids:
        name = " ".join(r.choice(NAMES).capitalize() for _ in range(r.randint(2, 4)))
        gpa = r.choice([r.randint(0, 400), 300, 325, 350]) / 100
        rows += [f"SV{i:05d}", name, f"{gpa:.2f}"]
    return "\n".join(rows)


PROBLEMS = [
    dict(id="C01", set="c1", title="Tổng ước số", difficulty="Dễ", solve=sol_sum_div,
         gen=lambda r, big: str(r.choice([10**12, 963761198400, 999999999989]) if big else r.randint(1, 10**4)),
         samples=["12", "1", "7"],
         statement=r"""Cho số nguyên dương $n$. Hãy tính tổng tất cả các ước dương của $n$ (kể cả $1$ và chính $n$).

### Input
Một số nguyên $n$ ($1 \le n \le 10^{12}$).

### Output
In ra tổng các ước của $n$.""",
         hint=r"Ước luôn đi theo cặp $(i, n/i)$ nên chỉ cần duyệt $i$ đến $\sqrt{n}$ (điều kiện `i * i <= n`). Cẩn thận khi $i = n / i$ (số chính phương) và dùng `long long`."),
    dict(id="C02", set="c1", title="Đếm số chính phương", difficulty="Dễ", solve=sol_squares,
         gen=lambda r, big: (lambda a: f"{a} {r.randint(a, 10**12 if big else 200)}")(r.randint(1, 10**12 if big else 200)),
         samples=["1 10", "5 8", "16 16"],
         statement=r"""Số chính phương là bình phương của một số nguyên ($1, 4, 9, 16, \ldots$). Đếm xem trong đoạn $[a, b]$ có bao nhiêu số chính phương.

### Input
Hai số nguyên $a, b$ ($1 \le a \le b \le 10^{12}$).

### Output
In ra số lượng số chính phương thuộc $[a, b]$.""",
         hint=r"Số chính phương $\le x$ là $\lfloor\sqrt{x}\rfloor$. Đáp án $= \lfloor\sqrt{b}\rfloor - \lfloor\sqrt{a-1}\rfloor$. Hàm `sqrt` trả về `double` có thể lệch 1 — tăng/giảm lại cho đúng."),
    dict(id="C03", set="c1", title="Số thuận nghịch", difficulty="Dễ", solve=sol_palin_num,
         gen=lambda r, big: g_tcases(r, big, 1000, g_num_palin),
         samples=["4\n12321\n1221\n123\n7"],
         statement=r"""Số thuận nghịch là số đọc từ trái sang phải hay từ phải sang trái đều giống nhau (ví dụ $12321$). Với mỗi số $n$, cho biết nó có phải số thuận nghịch không.

### Input
- Dòng 1: số lượng $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng một số nguyên $n$ ($1 \le n \le 10^{18}$).

### Output
Mỗi số in `YES` hoặc `NO` trên một dòng.""",
         hint="Tạo số đảo ngược bằng vòng lặp: `rev = rev * 10 + n % 10; n /= 10;`, rồi so sánh với số ban đầu (nhớ lưu lại bản sao)."),
    dict(id="C04", set="c1", title="Kiểm tra số nguyên tố", difficulty="Dễ", solve=sol_prime,
         gen=lambda r, big: g_tcases(r, big, 1000, g_prime_item),
         samples=["5\n1\n2\n9\n17\n1000000007"],
         statement=r"""Với mỗi số nguyên $n$, cho biết $n$ có phải số nguyên tố hay không.

### Input
- Dòng 1: số lượng $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng một số nguyên $n$ ($1 \le n \le 10^9 + 7$).

### Output
Mỗi số in `YES` nếu là số nguyên tố, ngược lại in `NO`.""",
         hint=r"Viết hàm `int isPrime(long long n)`: $n < 2$ thì không phải; thử chia cho $i$ từ $2$ đến $\sqrt{n}$. Duyệt tới $n$ sẽ bị TLE với 1000 số cỡ $10^9$."),
    dict(id="C05", set="c1", title="Số hoàn hảo", difficulty="Trung bình", solve=sol_perfect,
         gen=lambda r, big: (lambda a: f"{a} {r.randint(a, 10**6)}")(r.randint(1, 10**6 if not big else 10)),
         samples=["1 100", "29 495", "1 1000000"],
         statement=r"""Số hoàn hảo là số nguyên dương bằng tổng các ước dương **nhỏ hơn nó** (ví dụ $6 = 1 + 2 + 3$). Liệt kê các số hoàn hảo trong đoạn $[a, b]$.

### Input
Hai số nguyên $a, b$ ($1 \le a \le b \le 10^6$).

### Output
In các số hoàn hảo tăng dần trên một dòng, cách nhau dấu cách. Nếu không có, in `NONE`.""",
         hint=r"Kiểm tra từng số bằng cách duyệt ước đến $\sqrt{x}$: tổng cộng khoảng $10^6 \cdot 10^3$ phép — vẫn kịp. Muốn nhanh hơn: dùng sàng cộng ước `for i, for j = 2i; j <= b; j += i: s[j] += i`."),
    dict(id="C06", set="c1", title="UCLN và BCNN", difficulty="Dễ", solve=sol_gcd_lcm,
         gen=lambda r, big: g_tcases(r, big, 1000, lambda r, big: f"{r.randint(1, 10**9 if big else 60)} {r.randint(1, 10**9 if big else 60)}"),
         samples=["3\n12 18\n7 5\n10 10"],
         statement=r"""Với mỗi cặp số nguyên dương $a, b$, tính ước chung lớn nhất và bội chung nhỏ nhất của chúng.

### Input
- Dòng 1: số cặp $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng hai số $a, b$ ($1 \le a, b \le 10^9$).

### Output
Mỗi cặp in hai số UCLN và BCNN trên một dòng.""",
         hint=r"Thuật toán Euclid: `while (b) { r = a % b; a = b; b = r; }`. BCNN $= a / \gcd \cdot b$ — chia trước rồi nhân để không tràn, kết quả cần `long long`."),
    dict(id="C07", set="c1", title="Số Fibonacci", difficulty="Dễ", solve=sol_fib,
         gen=lambda r, big: g_tcases(r, big, 93, lambda r, big: str(r.randint(0, 92 if big else 20))),
         samples=["4\n0\n1\n10\n92"],
         statement=r"""Dãy Fibonacci: $F_0 = 0$, $F_1 = 1$, $F_n = F_{n-1} + F_{n-2}$ với $n \ge 2$. Với mỗi $n$, in ra $F_n$.

### Input
- Dòng 1: số lượng $t$ ($1 \le t \le 100$).
- $t$ dòng sau, mỗi dòng một số nguyên $n$ ($0 \le n \le 92$).

### Output
Mỗi giá trị $F_n$ in trên một dòng.""",
         hint=r"$F_{92} \approx 7.5 \cdot 10^{18}$ vẫn vừa `long long`. Tính sẵn mảng `f[0..92]` một lần rồi trả lời — đừng dùng đệ quy thuần (gọi lại hàng tỉ lần)."),
    dict(id="C08", set="c1", title="Phân tích thừa số nguyên tố", difficulty="Trung bình", solve=sol_factor, gen=g_semiprime,
         samples=["60", "13", "1024"],
         statement=r"""Phân tích số nguyên $n$ thành tích các thừa số nguyên tố.

### Input
Một số nguyên $n$ ($2 \le n \le 10^{12}$).

### Output
In theo dạng `p1^e1 * p2^e2 * ...` với các thừa số nguyên tố tăng dần (số mũ 1 vẫn ghi `^1`). Ví dụ $60$ → `2^2 * 3^1 * 5^1`.""",
         hint=r"Chia $n$ cho $p$ chừng nào còn chia hết, đếm số mũ; $p$ chạy tới khi $p \cdot p > n$. Sau vòng lặp nếu $n > 1$ thì phần còn lại là một số nguyên tố lớn."),
    dict(id="C09", set="c1", title="Tháp Hà Nội", difficulty="Trung bình", solve=sol_hanoi,
         gen=lambda r, big: str(15 if big else r.randint(1, 8)),
         samples=["1", "2", "3"],
         statement=r"""Có 3 cọc đánh số $1, 2, 3$. Cọc $1$ có $n$ đĩa, đĩa nhỏ nằm trên đĩa lớn. Cần chuyển toàn bộ sang cọc $3$, mỗi lần chuyển một đĩa trên cùng và **không bao giờ** đặt đĩa lớn lên đĩa nhỏ. Hãy đưa ra cách chuyển ít bước nhất.

### Input
Một số nguyên $n$ ($1 \le n \le 15$).

### Output
Dòng đầu là số bước. Mỗi dòng sau gồm hai số `a b`: chuyển đĩa trên cùng của cọc $a$ sang cọc $b$.""",
         hint="Đệ quy `move(n, tu, trung_gian, den)`: chuyển $n-1$ đĩa sang cọc trung gian, chuyển đĩa lớn nhất sang đích, rồi chuyển $n-1$ đĩa từ trung gian sang đích. Số bước là $2^n - 1$."),
    dict(id="C10", set="c2", title="Tần suất phần tử", difficulty="Dễ", solve=sol_freq,
         gen=lambda r, big: (lambda n: f"{n}\n{gen.g_list(r, n, 0, 10**6 if big else 9)}")(100000 if big else r.randint(1, 12)),
         samples=["7\n3 1 3 2 1 3 5"],
         statement=r"""Cho dãy $n$ số nguyên. Với mỗi giá trị xuất hiện trong dãy, in ra giá trị đó và số lần xuất hiện, theo **thứ tự xuất hiện lần đầu**.

### Input
- Dòng 1: $n$ ($1 \le n \le 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($0 \le a_i \le 10^6$).

### Output
Mỗi giá trị khác nhau in trên một dòng: `giá_trị số_lần`.""",
         hint="**Mảng đánh dấu**: `int cnt[1000001]` khai báo toàn cục. Lần 1 đếm; lần 2 duyệt lại dãy, in `a[i]` nếu `cnt[a[i]] > 0` rồi gán `cnt[a[i]] = 0` để không in lại."),
    dict(id="C11", set="c2", title="Chèn và xóa phần tử", difficulty="Dễ", solve=sol_insert_delete, gen=g_insert_delete,
         samples=["3\n1 2 3\n3\n1 2 9\n2 1\n1 4 7", "1\n5\n1\n2 1"],
         statement=r"""Cho mảng gồm $n$ phần tử. Thực hiện lần lượt $q$ thao tác:
- `1 k x`: chèn $x$ vào vị trí $k$ (các phần tử từ vị trí $k$ dịch sang phải; $k$ có thể bằng độ dài mảng $+1$ — tức chèn vào cuối).
- `2 k`: xóa phần tử ở vị trí $k$.

Vị trí đánh số từ $1$. Dữ liệu đảm bảo mọi thao tác hợp lệ.

### Input
- Dòng 1: $n$ ($0 \le n \le 1000$). Dòng 2: $n$ số nguyên (dòng trống nếu $n = 0$).
- Dòng 3: $q$ ($1 \le q \le 1000$). $q$ dòng sau là các thao tác, $|x| \le 1000$.

### Output
In mảng sau cùng trên một dòng, hoặc `EMPTY` nếu mảng rỗng.""",
         hint="Chèn: dịch các phần tử từ cuối về vị trí $k$ sang phải một ô rồi gán. Xóa: dịch các phần tử sau $k$ sang trái một ô. Mảng tối đa $n + q$ phần tử."),
    dict(id="C12", set="c2", title="Tìm kiếm nhị phân", difficulty="Trung bình", solve=sol_bsearch, gen=g_bsearch,
         samples=["6\n1 3 3 5 8 9\n4\n3 4 9 1"],
         statement=r"""Cho dãy $n$ số nguyên đã sắp xếp **không giảm** và $q$ truy vấn. Mỗi truy vấn cho số $x$, hãy in vị trí **đầu tiên** của $x$ trong dãy (đánh số từ $1$), hoặc $-1$ nếu không có.

### Input
- Dòng 1: $n$ ($1 \le n \le 2 \cdot 10^5$). Dòng 2: dãy $a$ ($1 \le a_i \le 10^9$).
- Dòng 3: $q$ ($1 \le q \le 2 \cdot 10^5$). Dòng 4: $q$ số $x$.

### Output
Mỗi truy vấn in kết quả trên một dòng.""",
         hint=r"Tìm tuyến tính mất $n \cdot q = 4 \cdot 10^{10}$ phép → TLE. Tìm nhị phân: khi `a[mid] >= x` thì ghi nhận `mid` và tiếp tục tìm ở **nửa trái** để ra vị trí đầu tiên."),
    dict(id="C13", set="c2", title="Chẵn tăng, lẻ giảm", difficulty="Trung bình", solve=sol_even_odd_sort,
         gen=lambda r, big: (lambda n: f"{n}\n{gen.g_list(r, n, -10**9 if big else -20, 10**9 if big else 20)}")(200000 if big else r.randint(1, 10)),
         samples=["7\n5 2 8 3 4 1 9"],
         statement=r"""Sắp xếp lại dãy $n$ số nguyên sao cho: các số **chẵn** đứng trước theo thứ tự **tăng dần**, sau đó là các số **lẻ** theo thứ tự **giảm dần**.

### Input
- Dòng 1: $n$ ($1 \le n \le 2 \cdot 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($|a_i| \le 10^9$).

### Output
In dãy sau khi sắp xếp trên một dòng.""",
         hint=r"Dùng `qsort` với hàm so sánh tự viết: khác tính chẵn lẻ thì số chẵn đứng trước; cùng chẵn thì tăng; cùng lẻ thì giảm. Lưu ý số âm: `-3 % 2 == -1` trong C — kiểm tra lẻ bằng `x % 2 != 0`. Không trả về `a - b` (có thể tràn)."),
    dict(id="C14", set="c2", title="Đoạn tăng dài nhất", difficulty="Dễ", solve=sol_longest_inc,
         gen=lambda r, big: (lambda n: f"{n}\n{gen.g_list(r, n, 1, 10**9 if big else 6)}")(100000 if big else r.randint(1, 12)),
         samples=["8\n1 2 2 3 4 5 1 2", "3\n3 2 1"],
         statement=r"""Cho dãy $n$ số nguyên. Tìm độ dài của đoạn **liên tiếp** dài nhất mà các phần tử **tăng ngặt**.

### Input
- Dòng 1: $n$ ($1 \le n \le 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($1 \le a_i \le 10^9$).

### Output
In ra độ dài lớn nhất.""",
         hint="Duyệt một lần, giữ `cur` là độ dài đoạn tăng kết thúc tại vị trí hiện tại: nếu `a[i] > a[i-1]` thì `cur++`, ngược lại `cur = 1`; cập nhật `res = max(res, cur)`."),
    dict(id="C15", set="c3", title="Tổng hàng và cột", difficulty="Dễ", solve=sol_row_col, gen=g_row_col,
         samples=["2 3\n1 2 3\n4 5 6"],
         statement=r"""Cho ma trận $n$ hàng, $m$ cột. Tính tổng từng hàng và tổng từng cột.

### Input
- Dòng 1: $n, m$ ($1 \le n, m \le 500$).
- $n$ dòng sau, mỗi dòng $m$ số nguyên có trị tuyệt đối không quá $1000$.

### Output
- Dòng 1: $n$ số là tổng hàng $1, 2, \ldots, n$.
- Dòng 2: $m$ số là tổng cột $1, 2, \ldots, m$.""",
         hint="Hai vòng `for` lồng nhau. Có thể cộng dồn vào hai mảng `row[i]` và `col[j]` ngay khi đọc từng phần tử."),
    dict(id="C16", set="c3", title="Nhân hai ma trận", difficulty="Trung bình", solve=sol_matmul, gen=g_matmul,
         samples=["2 3 2\n1 2 3\n4 5 6\n7 8\n9 10\n11 12"],
         statement=r"""Cho ma trận $A$ kích thước $n \times m$ và $B$ kích thước $m \times p$. Tính $C = A \times B$, với $C_{ij} = \sum_{k=1}^{m} A_{ik} \cdot B_{kj}$.

### Input
- Dòng 1: $n, m, p$ ($1 \le n, m, p \le 100$).
- $n$ dòng tiếp theo là ma trận $A$, sau đó $m$ dòng là ma trận $B$. Các phần tử có trị tuyệt đối không quá $1000$.

### Output
In ma trận $C$ gồm $n$ dòng, mỗi dòng $p$ số.""",
         hint="Ba vòng lặp `i, j, k`. Nhớ khởi tạo `C[i][j] = 0` trước khi cộng dồn. Giá trị tối đa $100 \\cdot 10^6 = 10^8$ vừa kiểu `int`."),
    dict(id="C17", set="c3", title="Ma trận xoắn ốc", difficulty="Trung bình", solve=sol_spiral,
         gen=lambda r, big: f"{100 if big else r.randint(1, 6)} {100 if big else r.randint(1, 6)}",
         samples=["3 4", "1 1", "4 1"],
         statement=r"""Điền các số $1, 2, \ldots, n \cdot m$ vào ma trận $n \times m$ theo hình **xoắn ốc** thuận chiều kim đồng hồ, bắt đầu từ góc trên bên trái.

### Input
Hai số nguyên $n, m$ ($1 \le n, m \le 100$).

### Output
In ma trận gồm $n$ dòng, mỗi dòng $m$ số.""",
         hint="Giữ 4 biên `top, bottom, left, right`. Mỗi vòng điền: hàng trên (trái → phải), cột phải (xuống), hàng dưới (phải → trái), cột trái (lên), rồi thu hẹp biên. Kiểm tra `top <= bottom` và `left <= right` trước hai bước cuối."),
    dict(id="C18", set="c4", title="Xâu đối xứng", difficulty="Dễ", solve=sol_palin_str, gen=g_str_palin,
         samples=["3\nabba\nabc\nx"],
         statement=r"""Với mỗi xâu, cho biết xâu đó có đối xứng (đọc xuôi và ngược giống nhau) hay không.

### Input
- Dòng 1: số lượng $t$ ($1 \le t \le 100$).
- $t$ dòng sau, mỗi dòng một xâu gồm chữ cái thường, không có dấu cách, độ dài từ $1$ đến $1000$.

### Output
Mỗi xâu in `YES` hoặc `NO` trên một dòng.""",
         hint="Hai con trỏ `i = 0`, `j = strlen(s) - 1`, so sánh `s[i]` với `s[j]` rồi tiến vào giữa. Gọi `strlen` một lần trước vòng lặp, đừng đặt trong điều kiện `for`."),
    dict(id="C19", set="c4", title="Đếm từ trong câu", difficulty="Dễ", solve=sol_count_words, gen=g_sentence,
         samples=["Hoc lap trinh C", "   nhieu    dau   cach  "],
         statement=r"""Cho một dòng văn bản. Từ là một dãy ký tự liên tiếp không chứa dấu cách. Đếm số từ trong dòng (giữa các từ có thể có nhiều dấu cách, đầu và cuối dòng cũng có thể có dấu cách).

### Input
Một dòng độ dài không quá $2 \cdot 10^5$ ký tự, có ít nhất một từ.

### Output
In ra số từ.""",
         hint="Đọc cả dòng bằng `fgets`. Đếm số vị trí `i` mà `s[i]` không phải dấu cách / xuống dòng và (`i == 0` hoặc `s[i-1]` là dấu cách). Cách khác: `strtok(s, \" \\n\")`."),
    dict(id="C20", set="c4", title="Tần suất ký tự", difficulty="Dễ", solve=sol_char_freq,
         gen=lambda r, big: "".join(r.choice("abcdefghijklmnopqrstuvwxyz" if big else "abcde") for _ in range(100000 if big else r.randint(1, 15))),
         samples=["banana", "z"],
         statement=r"""Cho xâu $s$ gồm các chữ cái thường. Với mỗi chữ cái xuất hiện trong $s$, in ra chữ cái đó và số lần xuất hiện, theo **thứ tự bảng chữ cái**.

### Input
Một xâu $s$ độ dài từ $1$ đến $10^5$.

### Output
Mỗi chữ cái in trên một dòng: `chữ_cái số_lần`.""",
         hint="Mảng `int cnt[26]`, với mỗi ký tự tăng `cnt[s[i] - 'a']`. Sau đó duyệt `c` từ `0` đến `25`, in `'a' + c` nếu `cnt[c] > 0`."),
    dict(id="C21", set="c4", title="Chuẩn hóa tên và email", difficulty="Trung bình", solve=sol_normalize, gen=g_names,
         samples=["2\n  nGUYEN   van    AN \ntran thi BINH", "1\nTUAN"],
         statement=r"""Mỗi họ tên sinh viên được nhập lộn xộn: thừa dấu cách, chữ hoa chữ thường lẫn lộn. Hãy:
1. Chuẩn hóa họ tên: các từ cách nhau đúng một dấu cách, mỗi từ viết hoa chữ cái đầu, còn lại viết thường.
2. Tạo email: **tên** (từ cuối) viết thường, nối với **chữ cái đầu** của các từ còn lại (viết thường), thêm đuôi `@st.utc2.edu.vn`.

Ví dụ `nGUYEN van AN` → `Nguyen Van An` và `annv@st.utc2.edu.vn`.

### Input
- Dòng 1: số lượng $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng một họ tên chỉ gồm chữ cái Latin không dấu và dấu cách (ít nhất một từ, không quá $100$ ký tự).

### Output
Với mỗi họ tên in 2 dòng: họ tên đã chuẩn hóa, rồi email.""",
         hint="Sau `scanf(\"%d\", &t)` còn ký tự xuống dòng — đọc bỏ bằng `getchar()` trước khi `fgets`. Tách từ bằng `strtok(line, \" \\n\")`, dùng `tolower` / `toupper` từ `<ctype.h>`, lưu các từ vào mảng 2 chiều để lấy được từ cuối."),
    dict(id="C22", set="c5", title="Xếp hạng sinh viên", difficulty="Trung bình", solve=sol_students, gen=g_students,
         samples=["3\nSV00012\nNguyen Van An\n3.25\nSV00003\nTran Thi Binh\n3.80\nSV00001\nLe Minh\n3.25"],
         statement=r"""Cho danh sách $n$ sinh viên, mỗi sinh viên gồm mã, họ tên và điểm GPA. Hãy sắp xếp theo GPA **giảm dần**; nếu bằng GPA thì theo mã **tăng dần** (so sánh xâu).

### Input
- Dòng 1: $n$ ($1 \le n \le 1000$).
- Mỗi sinh viên gồm 3 dòng: mã (xâu không có dấu cách, tối đa $10$ ký tự), họ tên (tối đa $50$ ký tự), GPA (số thực có 2 chữ số thập phân, từ $0$ đến $4$).

### Output
Mỗi sinh viên in trên một dòng: `mã họ_tên GPA`, GPA in với đúng 2 chữ số thập phân.""",
         hint="Khai báo `struct SinhVien { char ma[11]; char ten[51]; double gpa; };`. Đọc tên bằng `fgets` rồi xóa ký tự `'\\n'` ở cuối. Sắp xếp bằng `qsort` với hàm so sánh dùng `strcmp` cho mã; in `%.2lf`."),
]

gen.EXTRA_TESTS.update({
    "C01": ["2", "1000000", "999999999999"], "C02": ["1 1", "2 3", "1 1000000000000", "999999999999 1000000000000"],
    "C05": ["6 6", "7 27", "8128 1000000"], "C07": ["1\n2", "2\n91\n50"], "C08": ["2", "999999999989", "1000000000000"],
    "C11": ["0\n\n2\n1 1 5\n1 1 6", "2\n4 4\n2\n2 2\n2 1"], "C14": ["1\n5", "5\n1 2 3 4 5"],
    "C17": ["1 5", "5 5", "2 7"], "C19": ["a", "x y"],
})


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    for p in PROBLEMS:
        if not only or p["id"] in only:
            print(p["id"], p["title"], gen.build(p), "tests")
