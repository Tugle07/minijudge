"""Sinh bộ bài bám đề cương học phần Kỹ thuật lập trình (IT1.103.3), chương 2-6: K01-K24.

Mỗi bài gắn với một mục trong đề cương/slide; các bài "Luyện giữa kỳ" mô phỏng dạng đề thi thực hành
(nhiều ý trong một bài, chỉ dùng mảng tĩnh, tự cài đặt sắp xếp).
Chạy:  python scripts/generate-ktlt-syllabus.py [K01 K02 ...]
"""
import importlib.util
import os
import sys
from math import isqrt

_spec = importlib.util.spec_from_file_location("gen", os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate-problems.py"))
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)

PI = 3.14159265358979


def ints(inp):
    return list(map(int, inp.split()))


def is_prime(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True


def tdiv(a, b):
    q = abs(a) // abs(b)
    return q if (a >= 0) == (b > 0) else -q


def tie_2dec(num, den):
    return (num * 200) % den == 0 and (num * 100) % den != 0


# ---------- Chương 2 ----------
def circle_out(r):
    return f"{2 * PI * r:.2f}\n{PI * r * r:.2f}"


def circle_stable(r):
    cs = {f"{x:.2f}" for x in (2 * PI * r, PI * 2 * r, 2 * r * PI, r * 2 * PI, PI * r * 2, (PI + PI) * r)}
    ss = {f"{x:.2f}" for x in (PI * r * r, r * r * PI, PI * (r * r), r * PI * r)}
    return len(cs) == 1 and len(ss) == 1


def sol_circle(inp):
    return circle_out(float(inp.split()[0]))


def g_circle(r, big):
    while True:
        v = round(r.uniform(0.01, 10000 if big else 50), 2)
        if circle_stable(v):
            return f"{v:.2f}".rstrip("0").rstrip(".")


def sol_divide(inp):
    a, b = ints(inp)
    q = tdiv(a, b)
    return f"{q}\n{a - b * q}\n{a / b:.3f}"


def g_divide(r, big):
    while True:
        hi = 10**9 if big else 50
        a, b = r.randint(-hi, hi), r.randint(-hi, hi)
        if b == 0 or (a != 0 and abs(a / b) < 0.0005) or (a == 0 and b < 0):
            continue
        return f"{a} {b}"


def sol_time(inp):
    t = int(inp.split()[0])
    return f"{t // 86400} ngay {t % 86400 // 3600:02d}:{t % 3600 // 60:02d}:{t % 60:02d}"


def sol_bits(inp):
    a, b, k = ints(inp)
    return f"{a & b} {a | b} {a ^ b}\n{(a >> k) & 1} {a | (1 << k)} {a & ~(1 << k)}\n{bin(a).count('1')}"


def g_bits(r, big):
    hi = 2**31 - 1 if big else 64
    return f"{r.randint(0, hi)} {r.randint(0, hi)} {r.randint(0, 30 if big else 6)}"


# ---------- Chương 3 ----------
def days_in(m, y):
    if m == 2:
        return 29 if (y % 4 == 0 and y % 100 != 0) or y % 400 == 0 else 28
    return 30 if m in (4, 6, 9, 11) else 31


def sol_days(inp):
    t = ints(inp)
    return "\n".join(str(days_in(t[1 + 2 * i], t[2 + 2 * i])) for i in range(t[0]))


def g_days(r, big):
    t = 1000 if big else r.randint(1, 6)
    rows = []
    for _ in range(t):
        y = r.choice([1900, 2000, 2024, 2100, 2023, 1600, r.randint(1, 9999)])
        rows.append(f"{r.choice([2, 2, r.randint(1, 12)])} {y}")
    return f"{t}\n" + "\n".join(rows)


def grade(d):
    if d < 0 or d > 10:
        return "Khong hop le"
    if d >= 8:
        return "Gioi"
    if d >= 6.5:
        return "Kha"
    if d >= 5:
        return "Trung binh"
    return "Yeu"


def sol_grade(inp):
    tok = inp.split()
    return "\n".join(grade(float(x)) for x in tok[1:int(tok[0]) + 1])


def g_grade(r, big):
    t = 1000 if big else r.randint(1, 8)
    pool = ["8", "6.5", "5", "4.99", "7.99", "10", "0", "-1", "10.5", "6.49", "8.01", "9.75"]
    vals = [r.choice(pool) if r.random() < 0.5 else f"{r.randint(-50, 1050) / 100:.2f}" for _ in range(t)]
    return f"{t}\n" + "\n".join(vals)


TIERS = [(10, 6000), (10, 7000), (10, 8500), (None, 16000)]


def water(x):
    pre, left = 0, x
    for size, price in TIERS:
        use = left if size is None else min(left, size)
        pre += use * price
        left -= use
    return pre, pre * 115 // 100


def sol_water(inp):
    t = ints(inp)
    return "\n".join("%d %d" % water(x) for x in t[1:t[0] + 1])


def g_water(r, big):
    t = 1000 if big else r.randint(1, 6)
    return f"{t}\n" + "\n".join(str(r.choice([0, 10, 11, 20, 30, 31, r.randint(0, 10**6 if big else 60)])) for _ in range(t))


def sol_rect(inp):
    n, m = ints(inp)
    return "\n".join("*" * m if i in (0, n - 1) else ("*" + "." * (m - 2) + "*" if m > 1 else "*") for i in range(n))


def sol_table(inp):
    a, b = ints(inp)
    return "\n".join(f"{i} x {j} = {i * j}" for i in range(a, b + 1) for j in range(1, 11))


def sol_next_prime(inp):
    t = ints(inp)
    out = []
    for n in t[1:t[0] + 1]:
        p = n + 1
        while not is_prime(p):
            p += 1
        out.append(str(p))
    return "\n".join(out)


def sol_fact_sum(inp):
    n, s, f = int(inp.split()[0]), 1, 1
    for i in range(1, n + 1):
        f *= i; s += f
    return str(s)


# ---------- Mảng (luyện giữa kỳ) ----------
def read_arr_x(inp):
    t = ints(inp)
    n = t[0]
    return t[1:n + 1], t[n + 1]


def sol_mid_a(inp):
    a, x = read_arr_x(inp)
    mn = min(a)
    d = sorted(a, reverse=True)
    pos = next((i for i, v in enumerate(d) if v < x), len(d))
    ins = d[:pos] + [x] + d[pos:]
    return "\n".join([
        str(sum(v for v in a if v % 2 != 0)),
        str(sum(1 for v in a if v >= 0 and isqrt(v) ** 2 == v)),
        " ".join([str(mn)] + [str(i) for i, v in enumerate(a) if v == mn]),
        "YES" if all(a[i] <= a[i + 1] for i in range(len(a) - 1)) else "NO",
        " ".join(map(str, d)),
        " ".join(map(str, ins)),
        str(len(set(a))),
    ])


def sol_mid_b(inp):
    a, x = read_arr_x(inp)
    neg = [v for v in a if v < 0]
    avg = f"{sum(neg) / len(neg):.2f}" if neg else "NONE"
    mx = max(a)
    last = max(i for i, v in enumerate(a) if v == mx)
    above = [v for v in a if v > min(a)]
    rest = [v for v in sorted(a) if v != x]
    best_s, best_l, i = 0, 0, 0
    while i < len(a):
        j = i
        while j < len(a) and a[j] == a[i]:
            j += 1
        if j - i > best_l:
            best_s, best_l = i, j - i
        i = j
    return "\n".join([
        avg,
        str(sum(1 for v in a if is_prime(v))),
        f"{mx} {last}",
        str(min(above)) if above else "NONE",
        "YES" if a == a[::-1] else "NO",
        " ".join(map(str, rest)) if rest else "EMPTY",
        f"{best_s} {best_l}",
    ])


def g_mid(kind):
    def g(r, big):
        while True:
            n = 100 if big else r.randint(1, 10)
            lo, hi = (-1000, 1000) if big else (-9, 30)
            if r.random() < 0.2 and not big:
                h = [r.randint(lo, hi) for _ in range((n + 1) // 2)]
                a = h + h[::-1][n % 2:]
            else:
                a = [r.choice([r.randint(lo, hi), r.randint(0, 5)]) for _ in range(n)]
            x = r.choice(a) if r.random() < 0.5 else r.randint(lo, hi)
            neg = [v for v in a if v < 0]
            if kind == "b" and neg and tie_2dec(sum(neg), len(neg)):
                continue
            return f"{n}\n{' '.join(map(str, a))}\n{x}"
    return g


def sol_bubble(inp):
    t = ints(inp)
    a = t[1:t[0] + 1]
    n, passes, swaps = len(a), 0, 0
    for i in range(n - 1):
        passes += 1
        moved = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swaps += 1; moved = True
        if not moved:
            break
    return f"{passes} {swaps}\n" + " ".join(map(str, a))


def g_bubble(r, big):
    n = 1000 if big else r.randint(1, 10)
    a = [r.randint(-10**4, 10**4) for _ in range(n)]
    mode = r.random()
    if mode < 0.2:
        a.sort()
    elif mode < 0.35:
        a.sort(); i = r.randrange(n); j = r.randrange(n); a[i], a[j] = a[j], a[i]
    return f"{n}\n{' '.join(map(str, a))}"


def sol_square(inp):
    t = ints(inp)
    n = t[0]
    m = [t[1 + i * n:1 + (i + 1) * n] for i in range(n)]
    mx = max(max(row) for row in m)
    pos = next((i, j) for i in range(n) for j in range(n) if m[i][j] == mx)
    lines = [f"{sum(m[i][i] for i in range(n))} {sum(m[i][n - 1 - i] for i in range(n))}", f"{mx} {pos[0]} {pos[1]}"]
    lines += [" ".join(str(m[i][j]) for i in range(n)) for j in range(n)]
    return "\n".join(lines)


def g_square(r, big):
    n = 100 if big else r.randint(1, 5)
    return f"{n}\n" + "\n".join(gen.g_list(r, n, -10**4 if big else -9, 10**4 if big else 9) for _ in range(n))


def sol_pascal(inp):
    n = int(inp.split()[0])
    rows, row = [], [1]
    for _ in range(n):
        rows.append(" ".join(map(str, row)))
        row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]
    return "\n".join(rows)


# ---------- Chương 4-5 ----------
def stairs(n):
    f = [1, 1, 2]
    while len(f) <= n:
        f.append(f[-1] + f[-2] + f[-3])
    return f[n]


STAIRS_MAX = max(n for n in range(1, 200) if stairs(n) < 2**63)


def sol_stairs(inp):
    return str(stairs(int(inp.split()[0])))


def sol_ops(inp):
    tok = inp.split()
    n = int(tok[0])
    a = tok[1:n + 1]
    q, p = int(tok[n + 1]), n + 2
    for _ in range(q):
        op, x, y = tok[p], int(tok[p + 1]), int(tok[p + 2]); p += 3
        if op == "S":
            a[x], a[y] = a[y], a[x]
        else:
            a[x:y + 1] = a[x:y + 1][::-1]
    return " ".join(a)


def g_ops(r, big):
    n = 1000 if big else r.randint(1, 8)
    q = 1000 if big else r.randint(1, 6)
    ops = []
    for _ in range(q):
        i, j = sorted((r.randrange(n), r.randrange(n)))
        ops.append(f"{r.choice('SR')} {i} {j}")
    return f"{n}\n{gen.g_list(r, n, -1000, 1000)}\n{q}\n" + "\n".join(ops)


def sol_strings(inp):
    s, t = inp.split("\n")[:2]
    cmp = (s > t) - (s < t)
    cnt = sum(1 for i in range(len(s) - len(t) + 1) if s[i:i + len(t)] == t)
    return f"{len(s)} {len(t)}\n{cmp}\n{s.find(t)}\n{cnt}\n{s + t}"


def g_strings(r, big):
    alpha = "ab " if not big else "abc "
    def word(k):
        w = "".join(r.choice(alpha) for _ in range(k)).strip()
        return w or "a"
    s = word(1000 if big else r.randint(1, 12))
    t = s[r.randrange(len(s)):][:r.randint(1, 3)].strip() if r.random() < 0.6 else word(r.randint(1, 4))
    return f"{s}\n{t or 'a'}"


def sol_rev_words(inp):
    return " ".join(inp.split()[::-1])


def g_rev_words(r, big):
    words = ["Ky", "thuat", "lap", "trinh", "C", "con", "tro", "xau", "ky", "tu"]
    k = 12000 if big else r.randint(1, 8)
    return " " * r.randint(0, 2) + "".join(r.choice(words) + " " * r.randint(1, 3) for _ in range(k)).rstrip()


def sol_dynamic(inp):
    t = ints(inp)
    a = t[:t.index(0)]
    s, c = sum(a), len(a)
    return f"{c} {s} {sum(1 for v in a if v * c > s)}"


def g_dynamic(r, big):
    n = 1000000 if big else r.randint(0, 10)
    a = [r.choice([r.randint(-10**9, -1), r.randint(1, 10**9)]) if big else r.choice([r.randint(-9, -1), r.randint(1, 20)]) for _ in range(n)]
    lines = [" ".join(map(str, a[i:i + 20])) for i in range(0, len(a), 20)]
    return "\n".join(lines + ["0"])


# ---------- Chương 6 ----------
def sol_stock(inp):
    rows = inp.split("\n")
    n = int(rows[0])
    items = []
    for i in range(n):
        ma, ten = rows[1 + 3 * i].strip(), rows[2 + 3 * i].strip()
        gia, sl = map(int, rows[3 + 3 * i].split())
        items.append((ma, ten, gia, sl))
    best = max(items, key=lambda it: it[2] * it[3])
    best = next(it for it in items if it[2] * it[3] == best[2] * best[3])
    out = [it[0] for it in items if it[3] == 0]
    return f"{sum(it[2] * it[3] for it in items)}\n{best[0]} {best[1]}\n{' '.join(out) if out else 'NONE'}"


ITEMS = ["But bi", "Vo o ly", "Thuoc ke", "Tay", "Ban phim co", "Chuot khong day", "Tai nghe", "Balo", "May tinh Casio", "USB 64GB"]


def g_stock(r, big):
    n = 1000 if big else r.randint(1, 6)
    rows = [str(n)]
    for i in range(n):
        rows += [f"SP{i + 1:04d}", r.choice(ITEMS), f"{r.randint(1000, 10**9 if big else 500000)} {r.choice([0, r.randint(0, 10**4 if big else 50)])}"]
    return "\n".join(rows)


STATUS = ["CHO_XAC_NHAN", "DANG_GIAO", "DA_GIAO", "DA_HUY"]


def sol_orders(inp):
    tok = inp.split()
    n = int(tok[0])
    cnt, rev, huy = [0] * 4, 0, []
    for i in range(n):
        oid, st, amt = tok[1 + 3 * i], int(tok[2 + 3 * i]), int(tok[3 + 3 * i])
        cnt[st] += 1
        if st == 2:
            rev += amt
        if st == 3:
            huy.append(oid)
    lines = [f"{STATUS[s]} {cnt[s]}" for s in range(4)]
    lines += [f"DOANH_THU {rev}", "HUY " + (" ".join(huy) if huy else "NONE")]
    return "\n".join(lines)


def g_orders(r, big):
    n = 100000 if big else r.randint(1, 8)
    rows = [f"DH{i + 1:06d} {r.randint(0, 3)} {r.randint(1000, 10**9 if big else 900000)}" for i in range(n)]
    return f"{n}\n" + "\n".join(rows)


NAMES = ["Nguyen Van An", "Tran Thi Binh", "Le Minh Chau", "Pham Quoc Dung", "Hoang Gia Huy", "Vo Thanh Lam", "Dang Ngoc Mai"]


def sol_lookup(inp):
    rows = inp.split("\n")
    n = int(rows[0])
    db = {}
    for i in range(n):
        ma, ten = rows[1 + 3 * i].strip(), rows[2 + 3 * i].strip()
        d, m, y, diem = rows[3 + 3 * i].split()
        db.setdefault(ma, f"{ma} | {ten} | {int(d):02d}/{int(m):02d}/{int(y):04d} | {float(diem):.2f}")
    q = int(rows[1 + 3 * n])
    return "\n".join(db.get(rows[2 + 3 * n + i].strip(), "Khong tim thay") for i in range(q))


def g_lookup(r, big):
    n = 1000 if big else r.randint(1, 5)
    ids = [f"{r.randint(6400000000, 6799999999)}" for _ in range(n)]
    rows = [str(n)]
    for ma in ids:
        rows += [ma, r.choice(NAMES), f"{r.randint(1, 28)} {r.randint(1, 12)} {r.randint(2000, 2008)} {r.randint(0, 1000) / 100:.2f}"]
    q = 1000 if big else r.randint(1, 5)
    rows.append(str(q))
    rows += [r.choice(ids) if r.random() < 0.7 else str(r.randint(6400000000, 6799999999)) for _ in range(q)]
    return "\n".join(rows)


PROBLEMS = [
    dict(id="K01", set="g2", title="Chu vi và diện tích hình tròn", difficulty="Dễ", solve=sol_circle, gen=g_circle,
         samples=["1", "2.5"],
         statement=r"""Nhập bán kính $r$ của một hình tròn, in ra chu vi $C = 2\pi r$ và diện tích $S = \pi r^2$. Dùng hằng `#define PI 3.14159265358979`.

### Input
Một số thực $r$ ($0 < r \le 10^4$, tối đa 2 chữ số thập phân).

### Output
- Dòng 1: chu vi, làm tròn 2 chữ số thập phân.
- Dòng 2: diện tích, làm tròn 2 chữ số thập phân.""",
         hint=r"Dùng kiểu `double` (đọc bằng `%lf`), in bằng `%.2lf`. Kiểu `float` chỉ chính xác khoảng 7 chữ số — với $r = 10^4$ diện tích đã sai ở phần thập phân. (Đề cương mục 2.1, 2.2, 2.7)"),
    dict(id="K02", set="g2", title="Phép chia trong C", difficulty="Dễ", solve=sol_divide, gen=g_divide,
         samples=["7 2", "-7 2", "7 -2"],
         statement=r"""Cho hai số nguyên $a, b$ ($b \ne 0$). In ra kết quả của các biểu thức C: `a / b`, `a % b` (với $a, b$ kiểu `int`) và phép chia số thực `(double)a / b`.

### Input
Hai số nguyên $a, b$ ($|a|, |b| \le 10^9$, $b \ne 0$).

### Output
- Dòng 1: giá trị `a / b`.
- Dòng 2: giá trị `a % b`.
- Dòng 3: giá trị `(double)a / b`, làm tròn 3 chữ số thập phân.""",
         hint="Trong C, chia nguyên **cắt bỏ phần thập phân về phía 0**: `-7 / 2 == -3`, và `-7 % 2 == -1` (dấu theo số bị chia). Không ép kiểu thì `7 / 2` ra `3` chứ không phải `3.5`. (Đề cương mục 2.3, 2.5)"),
    dict(id="K03", set="g2", title="Đổi giây", difficulty="Dễ", solve=sol_time,
         gen=lambda r, big: str(r.randint(0, 10**9 if big else 200000)),
         samples=["100000", "59", "0"],
         statement=r"""Đổi $t$ giây sang dạng `D ngay HH:MM:SS` (số ngày, giờ, phút, giây; giờ/phút/giây luôn đủ 2 chữ số).

### Input
Một số nguyên $t$ ($0 \le t \le 10^9$).

### Output
Một dòng dạng `D ngay HH:MM:SS`. Ví dụ $100000$ giây → `1 ngay 03:46:40`.""",
         hint="Dùng `/` và `%` với 86400, 3600, 60. Định dạng `%02d` tự thêm số 0 ở đầu. (Đề cương mục 2.3, 2.7)"),
    dict(id="K04", set="g2", title="Thao tác trên bit", difficulty="Trung bình", solve=sol_bits, gen=g_bits,
         samples=["5 3 1", "12 10 2"],
         statement=r"""Cho hai số nguyên không âm $a, b$ và vị trí bit $k$ (bit $0$ là bit thấp nhất).

### Input
Ba số nguyên $a, b, k$ ($0 \le a, b < 2^{31}$, $0 \le k \le 30$).

### Output
- Dòng 1: `a & b`, `a | b`, `a ^ b`.
- Dòng 2: giá trị bit thứ $k$ của $a$ ($0$ hoặc $1$); $a$ sau khi **bật** bit $k$; $a$ sau khi **tắt** bit $k$.
- Dòng 3: số bit $1$ trong biểu diễn nhị phân của $a$.""",
         hint="Bit thứ k: `(a >> k) & 1`. Bật: `a | (1 << k)`. Tắt: `a & ~(1 << k)`. Đếm bit 1: lặp `a &= a - 1` cho tới khi bằng 0, hoặc xét từng bit. (Đề cương mục 2.4)"),
    dict(id="K05", set="g3", title="Số ngày trong tháng", difficulty="Dễ", solve=sol_days, gen=g_days,
         samples=["4\n2 2024\n2 1900\n4 2023\n12 2000"],
         statement=r"""Với mỗi cặp tháng $m$, năm $y$, in số ngày của tháng đó. Năm nhuận là năm chia hết cho $400$, hoặc chia hết cho $4$ nhưng không chia hết cho $100$.

### Input
- Dòng 1: số truy vấn $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng $m, y$ ($1 \le m \le 12$, $1 \le y \le 9999$).

### Output
Mỗi truy vấn in số ngày trên một dòng.""",
         hint="Dùng `switch (m)`: gom các `case 4: case 6: case 9: case 11:` trả về 30; `case 2` xét năm nhuận; `default` là 31. Viết riêng hàm `int laNamNhuan(int y)`. (Đề cương mục 3.1, 3.2)"),
    dict(id="K06", set="g3", title="Xếp loại học lực", difficulty="Dễ", solve=sol_grade, gen=g_grade,
         samples=["6\n8\n6.5\n4.99\n10\n-1\n7.25"],
         statement=r"""Xếp loại theo điểm $d$: `Gioi` nếu $d \ge 8$; `Kha` nếu $6.5 \le d < 8$; `Trung binh` nếu $5 \le d < 6.5$; `Yeu` nếu $d < 5$. Điểm nằm ngoài $[0, 10]$ in `Khong hop le`.

### Input
- Dòng 1: số lượng $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng một số thực $d$ ($-10 \le d \le 20$).

### Output
Mỗi điểm in kết quả xếp loại trên một dòng (không dấu, đúng như trên).""",
         hint="Kiểm tra điều kiện không hợp lệ **trước**, rồi dùng chuỗi `if ... else if ...` từ mức cao xuống thấp — khi đó mỗi nhánh chỉ cần một điều kiện. (Đề cương mục 3.1)"),
    dict(id="K07", set="g3", title="Tiền nước bậc thang", difficulty="Trung bình", solve=sol_water, gen=g_water,
         samples=["4\n8\n25\n0\n45"],
         statement=r"""Giá nước sinh hoạt tính theo bậc thang:

| Bậc | Đơn giá (đồng/m³) |
|---|---|
| 10 m³ đầu tiên | 6.000 |
| Từ m³ thứ 11 đến 20 | 7.000 |
| Từ m³ thứ 21 đến 30 | 8.500 |
| Từ m³ thứ 31 trở đi | 16.000 |

Tổng tiền phải trả = tiền nước + 5% thuế VAT + 10% phí bảo vệ môi trường (cả hai tính trên tiền nước). Ví dụ dùng $25$ m³: tiền nước $= 10 \cdot 6000 + 10 \cdot 7000 + 5 \cdot 8500 = 172500$, tổng $= 198375$.

### Input
- Dòng 1: số hộ gia đình $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng số m³ nước đã dùng $x$ ($0 \le x \le 10^6$).

### Output
Mỗi hộ in trên một dòng: tiền nước và tổng tiền phải trả.""",
         hint=r"Trừ dần lượng nước qua từng bậc. Tiền có thể vượt $2 \cdot 10^9$ — dùng `long long`. Tính bằng số nguyên: tổng $= $ `tien * 115 / 100` (luôn chia hết với bảng giá này), tránh sai số số thực. (Đề cương mục 3.1, 3.6 — dạng bài thi giữa kỳ)"),
    dict(id="K08", set="g3", title="Khung hình chữ nhật", difficulty="Dễ", solve=sol_rect,
         gen=lambda r, big: f"{50 if big else r.randint(1, 6)} {50 if big else r.randint(1, 8)}",
         samples=["4 6", "1 3", "3 1"],
         statement=r"""Vẽ khung hình chữ nhật $n$ dòng, $m$ cột: các ô trên viền là `*`, các ô bên trong là `.`.

### Input
Hai số nguyên $n, m$ ($1 \le n, m \le 50$).

### Output
$n$ dòng, mỗi dòng $m$ ký tự.""",
         hint="Hai vòng `for` lồng nhau: ô $(i, j)$ nằm trên viền khi `i == 0 || i == n-1 || j == 0 || j == m-1`. (Đề cương mục 3.3, 3.5)"),
    dict(id="K09", set="g3", title="Bảng cửu chương", difficulty="Dễ", solve=sol_table,
         gen=lambda r, big: (lambda a: f"{a} {r.randint(a, 9)}")(1 if big else r.randint(1, 9)),
         samples=["2 3"],
         statement=r"""In các bảng cửu chương từ bảng $a$ đến bảng $b$. Mỗi bảng $i$ gồm $10$ dòng `i x j = tích` với $j = 1, 2, \ldots, 10$.

### Input
Hai số nguyên $a, b$ ($1 \le a \le b \le 9$).

### Output
Các dòng của bảng $a$, rồi bảng $a+1$, …, bảng $b$.""",
         hint="Vòng ngoài chạy theo bảng $i$, vòng trong chạy theo $j$. (Đề cương mục 3.3)"),
    dict(id="K10", set="g3", title="Số nguyên tố kế tiếp", difficulty="Dễ", solve=sol_next_prime,
         gen=lambda r, big: g_tc(r, big, 1000, lambda r, big: str(r.randint(0, 10**9 if big else 100))),
         samples=["4\n100\n1\n13\n0"],
         statement=r"""Với mỗi số nguyên $n$, tìm số nguyên tố **nhỏ nhất lớn hơn** $n$.

### Input
- Dòng 1: số lượng $t$ ($1 \le t \le 1000$).
- $t$ dòng sau, mỗi dòng một số nguyên $n$ ($0 \le n \le 10^9$).

### Output
Mỗi số in kết quả trên một dòng.""",
         hint="Vòng lặp vô hạn tăng dần từ $n+1$, gặp số nguyên tố thì `break`. Hàm kiểm tra nguyên tố chỉ thử chia đến $\\sqrt{n}$ và cũng `break` ngay khi gặp ước. (Đề cương mục 3.5, 3.6)"),
    dict(id="K11", set="g3", title="Tổng giai thừa", difficulty="Dễ", solve=sol_fact_sum,
         gen=lambda r, big: str(20 if big else r.randint(0, 15)),
         samples=["3", "0"],
         statement=r"""Tính $S = 0! + 1! + 2! + \ldots + n!$ (quy ước $0! = 1$).

### Input
Một số nguyên $n$ ($0 \le n \le 20$).

### Output
In ra $S$.""",
         hint=r"Không tính lại giai thừa từ đầu ở mỗi bước: `gt = gt * i; s += gt;`. $20! \approx 2.4 \cdot 10^{18}$ — dùng `long long` (`%lld`). Đừng quên số hạng $0! = 1$. (Đề cương mục 3.6)"),
    dict(id="K12", set="g3m", title="Luyện giữa kỳ: Mảng A", difficulty="Trung bình", solve=sol_mid_a, gen=g_mid("a"),
         samples=["10\n5 11 3 8 2 7 11 4 8 3\n6"],
         statement=r"""Cho mảng $a$ gồm $n$ số nguyên (chỉ số từ $0$) và số nguyên $x$. Thực hiện lần lượt:
1. Tính tổng các phần tử **lẻ**.
2. Đếm số phần tử là **số chính phương** ($0$ cũng là số chính phương; số âm thì không).
3. Tìm giá trị nhỏ nhất và **mọi** vị trí của nó.
4. Kiểm tra mảng có **không giảm** hay không ($a_i \le a_{i+1}$ với mọi $i$).
5. Sắp xếp mảng **giảm dần** (tự cài đặt thuật toán).
6. Chèn $x$ vào mảng đã sắp xếp sao cho mảng vẫn giảm dần (không sắp xếp lại).
7. Đếm số giá trị **khác nhau** trong mảng ban đầu.

### Input
- Dòng 1: $n$ ($1 \le n \le 100$). Dòng 2: $n$ số nguyên $|a_i| \le 1000$. Dòng 3: số nguyên $x$ ($|x| \le 1000$).

### Output
7 dòng, dòng thứ $i$ là kết quả ý $i$. Dòng 3 gồm giá trị nhỏ nhất rồi các vị trí tăng dần; dòng 4 là `YES` hoặc `NO`; dòng 5, 6 là mảng.""",
         hint="Chỉ dùng mảng tĩnh `#define MAX 101`. Sao chép mảng gốc trước khi sắp xếp (ý 7 dùng mảng gốc). Chèn: tìm vị trí đầu tiên có `a[i] < x`, dời các phần tử từ cuối sang phải một ô. Số lẻ âm: kiểm tra `a[i] % 2 != 0`. (Đề cương mục 3.7, 3.9 — dạng đề thi thực hành giữa kỳ)"),
    dict(id="K13", set="g3m", title="Luyện giữa kỳ: Mảng B", difficulty="Trung bình", solve=sol_mid_b, gen=g_mid("b"),
         samples=["10\n4 -2 9 16 -5 1 3 7 -2 25\n-2", "3\n5 5 5\n5"],
         statement=r"""Cho mảng $a$ gồm $n$ số nguyên (chỉ số từ $0$) và số nguyên $x$. Thực hiện lần lượt:
1. Trung bình cộng các phần tử **âm** (2 chữ số thập phân); không có thì in `NONE`.
2. Đếm số phần tử là **số nguyên tố**.
3. Giá trị lớn nhất và vị trí xuất hiện **cuối cùng** của nó.
4. Giá trị **nhỏ thứ hai** (lớn hơn hẳn giá trị nhỏ nhất); không có thì in `NONE`.
5. Kiểm tra mảng có **đối xứng** không ($a_i = a_{n-1-i}$).
6. Sắp xếp mảng **tăng dần** (tự cài đặt) rồi **xóa mọi** phần tử bằng $x$; in mảng còn lại, mảng rỗng in `EMPTY`.
7. Trên mảng ban đầu, tìm đoạn liên tiếp dài nhất gồm các phần tử **bằng nhau**: in vị trí bắt đầu và độ dài (nhiều đoạn cùng độ dài thì lấy đoạn đầu tiên).

### Input
- Dòng 1: $n$ ($1 \le n \le 100$). Dòng 2: $n$ số nguyên $|a_i| \le 1000$. Dòng 3: số nguyên $x$.

### Output
7 dòng, dòng thứ $i$ là kết quả ý $i$ (ý 5 in `YES` hoặc `NO`).""",
         hint="Trung bình: `(double)tong / dem` và in `%.2lf`. Xóa mọi phần tử bằng $x$ trong một lần duyệt: giữ biến `k`, chỉ chép `a[i]` sang `a[k++]` khi `a[i] != x`. (Đề cương mục 3.7, 3.9 — dạng đề thi thực hành giữa kỳ)"),
    dict(id="K14", set="g3m", title="Bubble sort có cờ hiệu", difficulty="Trung bình", solve=sol_bubble, gen=g_bubble,
         samples=["5\n5 1 4 2 8", "4\n1 2 3 4", "1\n7"],
         statement=r"""Cài đặt sắp xếp nổi bọt tăng dần **có cờ hiệu**:
```
for (i = 0; i < n - 1; i++) {
    doiCho = 0;
    for (j = 0; j < n - 1 - i; j++)
        if (a[j] > a[j + 1]) { hoán đổi a[j], a[j+1]; doiCho = 1; }
    if (!doiCho) break;
}
```
Hãy cho biết số **lượt** của vòng lặp ngoài đã chạy, tổng số lần **hoán đổi**, và mảng sau khi sắp xếp.

### Input
- Dòng 1: $n$ ($1 \le n \le 1000$). Dòng 2: $n$ số nguyên $|a_i| \le 10^4$.

### Output
- Dòng 1: số lượt và số lần hoán đổi.
- Dòng 2: mảng đã sắp xếp.""",
         hint="Mỗi lần vòng `i` bắt đầu thì tăng biến đếm lượt. Lượt cuối cùng không có hoán đổi vẫn được tính. (Slide 3.9 — bài tập thêm cờ hiệu cho bubble sort)"),
    dict(id="K15", set="g3m", title="Ma trận vuông", difficulty="Dễ", solve=sol_square, gen=g_square,
         samples=["3\n1 2 3\n4 9 6\n7 8 9"],
         statement=r"""Cho ma trận vuông cấp $n$ (hàng, cột đánh số từ $0$).

### Input
- Dòng 1: $n$ ($1 \le n \le 100$).
- $n$ dòng sau, mỗi dòng $n$ số nguyên có trị tuyệt đối không quá $10^4$.

### Output
- Dòng 1: tổng đường chéo chính và tổng đường chéo phụ.
- Dòng 2: giá trị lớn nhất cùng chỉ số hàng, cột của lần xuất hiện **đầu tiên** (duyệt theo từng hàng, từ trái sang phải).
- $n$ dòng tiếp theo: ma trận **chuyển vị**.""",
         hint="Đường chéo chính: `a[i][i]`; chéo phụ: `a[i][n-1-i]`. Chuyển vị: dòng $j$ của kết quả là cột $j$ của ma trận gốc. (Đề cương mục 3.8, slide 3.8)"),
    dict(id="K16", set="g3m", title="Tam giác Pascal", difficulty="Dễ", solve=sol_pascal,
         gen=lambda r, big: str(30 if big else r.randint(1, 10)),
         samples=["5", "1"],
         statement=r"""In $n$ dòng đầu tiên của tam giác Pascal. Dòng thứ $i$ (tính từ $0$) gồm $i + 1$ số; hai số ở hai đầu bằng $1$, mỗi số ở giữa bằng tổng hai số ngay phía trên nó.

### Input
Một số nguyên $n$ ($1 \le n \le 30$).

### Output
$n$ dòng của tam giác.""",
         hint="Dùng mảng 2 chiều `c[30][30]`: `c[i][0] = c[i][i] = 1`, `c[i][j] = c[i-1][j-1] + c[i-1][j]`. (Đề cương mục 3.8)"),
    dict(id="K17", set="g45", title="Leo cầu thang", difficulty="Trung bình", solve=sol_stairs,
         gen=lambda r, big: str(STAIRS_MAX if big else r.randint(1, 30)),
         samples=["4", "1"],
         statement=rf"""Một cầu thang có $n$ bậc. Mỗi bước bạn leo được $1$, $2$ hoặc $3$ bậc. Có bao nhiêu cách leo lên đúng bậc thứ $n$?

### Input
Một số nguyên $n$ ($1 \le n \le {STAIRS_MAX}$).

### Output
In ra số cách.""",
         hint=r"Công thức đệ quy: $f(n) = f(n-1) + f(n-2) + f(n-3)$, $f(0) = 1$. Đệ quy thuần gọi lại hàng tỉ lần → TLE; lưu kết quả đã tính vào mảng (đệ quy có nhớ) hoặc chuyển sang vòng lặp. Dùng `long long`. (Đề cương mục 4.5, slide 4.8)"),
    dict(id="K18", set="g45", title="Hoán đổi và đảo đoạn", difficulty="Trung bình", solve=sol_ops, gen=g_ops,
         samples=["5\n1 2 3 4 5\n3\nS 0 4\nR 1 3\nS 2 2"],
         statement=r"""Cho mảng $n$ số nguyên (chỉ số từ $0$) và $q$ thao tác:
- `S i j`: hoán đổi $a_i$ và $a_j$.
- `R l r`: đảo ngược đoạn $a_l, a_{l+1}, \ldots, a_r$ ($l \le r$).

### Input
- Dòng 1: $n$ ($1 \le n \le 1000$). Dòng 2: $n$ số nguyên.
- Dòng 3: $q$ ($1 \le q \le 1000$). $q$ dòng sau là các thao tác (chỉ số hợp lệ).

### Output
In mảng sau tất cả thao tác.""",
         hint="Viết hàm `void hoanDoi(int *x, int *y)` (truyền tham chiếu bằng con trỏ). Đảo đoạn = gọi `hoanDoi(&a[l], &a[r])` rồi thu hẹp `l++, r--`. (Đề cương mục 5.4, slide 5.6)"),
    dict(id="K19", set="g45", title="So sánh và tìm xâu", difficulty="Trung bình", solve=sol_strings, gen=g_strings,
         samples=["ban an banh\nan", "abc\nabd"],
         statement=r"""Cho hai xâu $s$ và $t$ (có thể chứa dấu cách).

### Input
- Dòng 1: xâu $s$. Dòng 2: xâu $t$. Mỗi xâu dài từ $1$ đến $1000$ ký tự, không có dấu cách ở đầu và cuối.

### Output
- Dòng 1: độ dài của $s$ và $t$.
- Dòng 2: $-1$, $0$ hoặc $1$ nếu $s$ nhỏ hơn, bằng hoặc lớn hơn $t$ theo thứ tự từ điển (như `strcmp`).
- Dòng 3: vị trí (từ $0$) xuất hiện đầu tiên của $t$ trong $s$, hoặc $-1$.
- Dòng 4: số lần $t$ xuất hiện trong $s$ (các lần xuất hiện được phép chồng lên nhau).
- Dòng 5: xâu $s$ nối với $t$.""",
         hint="Đọc bằng `fgets` rồi xóa `'\\n'`: `s[strcspn(s, \"\\n\")] = 0`. `strcmp` chỉ đảm bảo dấu của kết quả, không phải đúng $\\pm 1$. `strstr(s, t)` trả về con trỏ — vị trí là `p - s`; đếm tiếp bằng `strstr(p + 1, t)`. Mảng đích của `strcat` cần đủ chỗ cho cả hai xâu. (Đề cương mục 5.6, 5.7)"),
    dict(id="K20", set="g45", title="Đảo thứ tự từ", difficulty="Dễ", solve=sol_rev_words, gen=g_rev_words,
         samples=["Ky thuat   lap trinh C", "  xin chao "],
         statement=r"""Cho một câu gồm các từ ngăn cách bởi một hoặc nhiều dấu cách. In các từ theo thứ tự ngược lại, cách nhau đúng một dấu cách.

### Input
Một dòng dài không quá $10^5$ ký tự, có ít nhất một từ.

### Output
Câu sau khi đảo thứ tự từ.""",
         hint="Tách từ bằng `strtok` và lưu các con trỏ vào **mảng con trỏ** `char *tu[50000]` — không cần sao chép xâu. In từ cuối mảng về đầu. (Đề cương mục 5.5, 5.7)"),
    dict(id="K21", set="g45", title="Mảng động", difficulty="Trung bình", solve=sol_dynamic, gen=g_dynamic,
         samples=["3 -1 7 4\n0", "0"],
         statement=r"""Nhập một dãy số nguyên khác $0$, kết thúc bằng số $0$ (không thuộc dãy). Không biết trước số lượng phần tử.

### Input
Các số nguyên $a_i$ ($1 \le |a_i| \le 10^9$) cách nhau bởi dấu cách hoặc xuống dòng, cuối cùng là số $0$. Dãy có tối đa $10^6$ phần tử.

### Output
Ba số: số phần tử, tổng các phần tử, số phần tử **lớn hơn** trung bình cộng của dãy (dãy rỗng in `0 0 0`).""",
         hint="Bắt đầu với `malloc` sức chứa nhỏ; khi đầy thì `realloc` gấp đôi. Luôn kiểm tra kết quả khác `NULL` và `free` khi xong. So sánh với trung bình mà không dùng số thực: `a[i] * n > tong` (kiểu `long long`). (Đề cương mục 5.8, slide 5.11)"),
    dict(id="K22", set="g6", title="Quản lý kho hàng", difficulty="Trung bình", solve=sol_stock, gen=g_stock,
         samples=["3\nSP01\nBut bi\n5000 120\nSP02\nBan phim co\n850000 0\nSP03\nTai nghe\n300000 4"],
         statement=r"""Mỗi sản phẩm gồm mã, tên, đơn giá và số lượng tồn. Giá trị tồn kho của một sản phẩm = đơn giá × số lượng.

### Input
- Dòng 1: số sản phẩm $n$ ($1 \le n \le 1000$).
- Mỗi sản phẩm gồm 3 dòng: mã (không có dấu cách), tên (có thể có dấu cách, tối đa $50$ ký tự), đơn giá và số lượng ($1000 \le \text{giá} \le 10^9$, $0 \le \text{số lượng} \le 10^4$).

### Output
- Dòng 1: tổng giá trị tồn kho.
- Dòng 2: mã và tên của sản phẩm có giá trị tồn kho lớn nhất (nếu bằng nhau lấy sản phẩm nhập trước).
- Dòng 3: mã các sản phẩm đã hết hàng (số lượng $0$) theo thứ tự nhập, hoặc `NONE`.""",
         hint="`typedef struct { char ma[11]; char ten[51]; long long gia; int soLuong; } SanPham;` và mảng `SanPham ds[1000]`. Sau `scanf` mã, đọc bỏ ký tự xuống dòng trước khi `fgets` tên. Tổng có thể tới $10^{16}$. (Đề cương mục 6.1, 6.3 — slide 6.3)"),
    dict(id="K23", set="g6", title="Trạng thái đơn hàng", difficulty="Dễ", solve=sol_orders, gen=g_orders,
         samples=["5\nDH01 2 150000\nDH02 3 90000\nDH03 2 50000\nDH04 0 20000\nDH05 3 10000"],
         statement=r"""Mỗi đơn hàng có mã, trạng thái và số tiền. Trạng thái được mã hóa bằng số nguyên tương ứng với `enum TrangThai { CHO_XAC_NHAN, DANG_GIAO, DA_GIAO, DA_HUY }` (lần lượt là $0, 1, 2, 3$).

### Input
- Dòng 1: số đơn $n$ ($1 \le n \le 10^5$).
- $n$ dòng sau, mỗi dòng: mã đơn (không có dấu cách), trạng thái ($0$ đến $3$), số tiền ($\le 10^9$).

### Output
- 4 dòng: tên từng trạng thái (đúng như tên trong `enum`) và số đơn ở trạng thái đó, theo thứ tự $0 \to 3$.
- Dòng 5: `DOANH_THU` và tổng tiền các đơn `DA_GIAO`.
- Dòng 6: `HUY` và mã các đơn `DA_HUY` theo thứ tự nhập, hoặc `HUY NONE`.""",
         hint="Khai báo `enum` và một mảng xâu `const char *TEN[] = {\"CHO_XAC_NHAN\", ...}` để in tên theo giá trị enum. Lưu đơn hàng trong `struct` có thành phần kiểu `enum TrangThai`. (Đề cương mục 6.4 — slide 6.4)"),
    dict(id="K24", set="g6", title="Tra cứu sinh viên", difficulty="Trung bình", solve=sol_lookup, gen=g_lookup,
         samples=["2\n6751071084\nTran Cong Tuan\n7 3 2007 8.5\n6751071001\nNguyen Van An\n15 12 2006 7.25\n3\n6751071001\n6751079999\n6751071084"],
         statement=r"""Mỗi sinh viên gồm mã sinh viên, họ tên, ngày sinh (ngày, tháng, năm) và điểm trung bình. Cho danh sách sinh viên và các mã cần tra cứu.

### Input
- Dòng 1: $n$ ($1 \le n \le 1000$).
- Mỗi sinh viên gồm 3 dòng: mã (10 chữ số), họ tên (tối đa $50$ ký tự), rồi `ngày tháng năm điểm`.
- Tiếp theo: $q$ ($1 \le q \le 1000$), và $q$ dòng mỗi dòng một mã cần tra cứu.

### Output
Mỗi truy vấn in một dòng `mã | họ tên | dd/mm/yyyy | điểm` (điểm 2 chữ số thập phân), hoặc `Khong tim thay`. Nếu trùng mã, lấy sinh viên nhập trước.""",
         hint="Cấu trúc lồng nhau: `struct NgaySinh { int ngay, thang, nam; };` nằm trong `struct SinhVien`. Viết hàm `int timTheoMa(SinhVien ds[], int n, const char *ma)` trả về vị trí hoặc $-1$. In ngày bằng `%02d/%02d/%04d`. (Đề cương mục 6.2, 6.3 — slide 6.2, 6.3)"),
]


def g_tc(r, big, cnt_big, item):
    t = cnt_big if big else r.randint(1, 6)
    return f"{t}\n" + "\n".join(item(r, big) for _ in range(t))


gen.EXTRA_TESTS.update({
    "K01": ["10000", "0.01", "7.07"], "K02": ["1000000000 -1", "-1000000000 7", "0 5", "6 3"], "K03": ["86399", "86400", "1000000000"],
    "K04": ["0 0 0", "2147483647 0 30", "1024 1023 10"], "K07": ["1\n10", "1\n11", "1\n1000000", "3\n20\n30\n31"],
    "K08": ["1 1", "2 2", "50 1"], "K09": ["1 9", "9 9"], "K10": ["2\n999999999\n1000000000", "1\n2"], "K11": ["1", "20", "2"],
    "K12": ["1\n0\n5", "3\n-3 -3 -3\n-3", "4\n1 2 2 3\n0"], "K13": ["1\n7\n7", "4\n-1 -2 -2 -1\n0"],
    "K14": ["2\n2 1", "6\n6 5 4 3 2 1"], "K15": ["1\n-5", "2\n3 3\n3 3"], "K18": ["1\n9\n1\nR 0 0"],
    "K19": ["aaaa\naa", "abc\nabc", "a b\nb", "xyz\nxyzw"], "K21": ["1000000000 1000000000 -1\n0", "5\n0"],
})


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    for p in PROBLEMS:
        if not only or p["id"] in only:
            print(p["id"], p["title"], gen.build(p), "tests")
