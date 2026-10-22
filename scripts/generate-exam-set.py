"""Sinh bộ đề kiểm tra tổng hợp E01–E08 (8 bài, dễ → khó) cho chế độ thi.

Mỗi bài có nhiều subtask chia theo mức ràng buộc: subtask nhỏ cho lời giải trâu, subtask lớn đòi hỏi
thuật toán đúng độ phức tạp hoặc kiểu dữ liệu đủ rộng, cuối cùng là nhóm trường hợp đặc biệt.
Bộ đề KHÔNG nằm trong khối luyện tập nào (sets.json) nên sinh viên không thấy trước; Admin thêm vào cuộc thi,
subtask được điền sẵn từ subtasks.json.

Chạy:  python scripts/generate-exam-set.py [E01 E02 ...]
"""
import json
import os
import random
import re
import string
import sys
from collections import Counter
from math import gcd

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "problems")
MOD = 10**9 + 7


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text if text.endswith("\n") else text + "\n")


def span(a, b):
    return f"{a}" if a == b else f"{a}-{b}"


def ints(inp):
    return list(map(int, inp.split()))


def either(*gens):
    return lambda r: r.choice(gens)(r)


# ---------------------------------------------------------------- E01 Đổi thời gian

def sol_time(inp):
    t = int(inp)
    d, t = divmod(t, 86400)
    h, t = divmod(t, 3600)
    m, s = divmod(t, 60)
    return f"{d} {h:02d}:{m:02d}:{s:02d}"


E01 = dict(
    id="E01", title="Đổi thời gian", difficulty="Dễ", time_ms=1000,
    statement="""Đồng hồ của máy chấm đếm thời gian chạy bằng **giây**. Cho số giây $t$, hãy đổi ra số ngày, giờ, phút, giây.

### Input
Một số nguyên $t$ ($0 \\le t \\le 10^{18}$).

### Output
In ra `d hh:mm:ss`: $d$ là số ngày (không thêm số 0 ở đầu), `hh`, `mm`, `ss` là giờ ($0$–$23$), phút, giây, **luôn đủ 2 chữ số**.""",
    hint="Dùng phép chia nguyên `/` và chia dư `%` cho $86400$, $3600$, $60$. $t$ tới $10^{18}$ nên cần `long long` và `%lld`; in đủ 2 chữ số bằng `%02lld`.",
    samples=["90061", "59"],
    tiers=[
        ("t < 60", 8, 10, "Chỉ có giây — in đúng định dạng 0 00:00:ss", lambda r: str(r.randint(0, 59))),
        ("t < 86 400", 10, 20, "Chưa tới một ngày — cần in đủ 2 chữ số cho giờ, phút, giây", lambda r: str(r.randint(60, 86399))),
        ("t ≤ 2·10^9", 10, 25, "Có ngày — vẫn vừa kiểu int", lambda r: str(r.randint(86400, 2 * 10**9))),
        ("t ≤ 10^18", 10, 25, "Vượt kiểu int — cần long long và %lld", lambda r: str(r.randint(3 * 10**9, 10**18))),
    ],
    edge=("0, 59, 60, 3599, 3600, 86399, 86400, 2^31 − 1, 2^31, 10^18", 15,
          ["0", "60", "3599", "3600", "86399", "86400", "2147483647", "2147483648", "1000000000000000000", "999999999999999999"]),
)


# ---------------------------------------------------------------- E02 Chia hết cho a hoặc b

def _count(n, a, b):
    lcm = a // gcd(a, b) * b
    return n // a + n // b - n // lcm


def sol_div(inp):
    lo, hi, a, b = ints(inp)
    return str(_count(hi, a, b) - _count(lo - 1, a, b))


def g_div(rmax, amax, lmin_ratio=0.0):
    def g(r):
        hi = r.randint(max(1, rmax // 2), rmax)
        lo = r.randint(1, max(1, int(hi * lmin_ratio))) if r.random() < 0.5 else r.randint(1, hi)
        return f"{lo} {hi} {r.randint(1, amax)} {r.randint(1, amax)}"
    return g


def g_div_overflow(r):
    hi = r.randint(10**17, 10**18)
    a = r.randint(10**9, 10**18)
    b = r.randint(10**9, 10**18)
    if r.random() < 0.4:
        g = r.randint(2, 10**6)
        a, b = a // g * g, b // g * g
    return f"{r.randint(1, hi // 3)} {hi} {a} {b}"


E02 = dict(
    id="E02", title="Chia hết cho a hoặc b", difficulty="Dễ", time_ms=1000,
    statement="""Đếm số lượng số nguyên $x$ trong đoạn $[L, R]$ **chia hết cho $a$ hoặc chia hết cho $b$** (hoặc cả hai).

### Input
Một dòng gồm bốn số nguyên $L, R, a, b$ ($1 \\le L \\le R \\le 10^{18}$, $1 \\le a, b \\le 10^{18}$).

### Output
In ra số lượng tìm được.""",
    hint="Số bội của $a$ trong $[1, n]$ là $n / a$. Bao hàm – loại trừ: $f(n) = n/a + n/b - n/\\mathrm{lcm}(a,b)$, đáp án $f(R) - f(L-1)$. "
         "Tính $\\mathrm{lcm} = a / \\gcd(a,b) \\cdot b$ có thể tràn `long long`: nếu $a/\\gcd > R / b$ thì $\\mathrm{lcm} > R$, số hạng thứ ba bằng $0$.",
    samples=["1 10 2 3", "5 20 4 6"],
    tiers=[
        ("R ≤ 10^6, a, b ≤ 100", 10, 20, "Duyệt từng số trong đoạn vẫn kịp", g_div(10**6, 100)),
        ("R ≤ 10^12, a, b ≤ 10^6", 10, 25, "Duyệt O(R) quá chậm — cần công thức bao hàm – loại trừ, long long", g_div(10**12, 10**6)),
        ("R ≤ 10^18, a, b ≤ 10^9", 10, 25, "Số lớn tới 10^18, bội chung nhỏ nhất vẫn vừa long long", g_div(10**18, 10**9)),
        ("R ≤ 10^18, a, b ≤ 10^18", 8, 10, "BCNN có thể vượt 10^18 và tràn số khi nhân a·b — phải xử lý trước khi nhân", lambda r: g_div_overflow(r)),
    ],
    edge=("a = b, a = 1, L = R, b là bội của a, a > R", 15,
          ["1 1 1 1", "7 7 7 3", "7 7 2 3", "1 1000000000000000000 1 1000000000000000000",
           "1 100 5 5", "1 100 4 8", "1 100 1000 2000", "999999999999999999 1000000000000000000 999999999999999999 1000000000000000000",
           "1 1000000000000000000 999999999999999989 999999999999999877", "123456789 987654321987 24 36"]),
)


# ---------------------------------------------------------------- E03 Tổng ước

def _is_prime(n):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2; s += 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def _rho(n):
    if n % 2 == 0:
        return 2
    rnd = random.Random(n)
    while True:
        c = rnd.randrange(1, n)
        f = lambda x: (x * x + c) % n
        x = y = rnd.randrange(2, n)
        d = 1
        while d == 1:
            x = f(x); y = f(f(y)); d = gcd(abs(x - y), n)
        if d != n:
            return d


def _factor(n, out):
    if n == 1:
        return
    if _is_prime(n):
        out[n] += 1
        return
    for p in range(2, 1000):
        if n % p == 0:
            while n % p == 0:
                out[p] += 1; n //= p
            return _factor(n, out)
    d = _rho(n)
    _factor(d, out)
    _factor(n // d, out)


def sigma(n):
    f = Counter()
    _factor(n, f)
    res = 1
    for p, e in f.items():
        res *= (p ** (e + 1) - 1) // (p - 1)
    return res


def sol_sigma(inp):
    t = ints(inp)
    return "\n".join(str(sigma(x)) for x in t[1:1 + t[0]])


def g_sigma(tmax, nmax, nmin=1):
    def g(r):
        t = r.randint(max(1, tmax // 2), tmax)
        xs = []
        for _ in range(t):
            k = r.random()
            if k < 0.15 and nmax > 10**6:
                x = r.randint(int(nmax ** 0.5) // 2, int(nmax ** 0.5)) ** 2
            elif k < 0.3:
                x = r.randint(nmax // 2, nmax)
                while not _is_prime(x):
                    x -= 1
            else:
                x = r.randint(nmin, nmax)
            xs.append(max(1, x))
        return f"{t}\n{' '.join(map(str, xs))}"
    return g


E03 = dict(
    id="E03", title="Tổng ước", difficulty="Trung bình", time_ms=2000,
    statement="""Gọi $\\sigma(n)$ là **tổng tất cả các ước dương** của $n$ (kể cả $1$ và $n$). Ví dụ $\\sigma(12) = 1 + 2 + 3 + 4 + 6 + 12 = 28$.
Cho $T$ số, hãy tính $\\sigma$ của từng số.

### Input
- Dòng 1: $T$ ($1 \\le T \\le 100$).
- Dòng 2: $T$ số nguyên $n_1, \\dots, n_T$ ($1 \\le n_i \\le 10^{12}$).

### Output
In $T$ dòng, dòng thứ $i$ là $\\sigma(n_i)$.""",
    hint="Ước đi theo cặp $(i, n/i)$ với $i \\le \\sqrt{n}$, chỉ cần duyệt $i$ tới $\\sqrt{n}$ (điều kiện `i * i <= n`, $i$ kiểu `long long`). "
         "Cẩn thận khi $n$ là số chính phương: $i = n/i$ chỉ cộng một lần. Tổng ước có thể vượt $2^{31}$.",
    samples=["3\n12 1 7"],
    tiers=[
        ("n ≤ 1 000, T ≤ 10", 8, 15, "Duyệt mọi số từ 1 tới n", g_sigma(10, 1000)),
        ("n ≤ 10^6", 8, 20, "Duyệt O(n) mỗi số vẫn kịp", g_sigma(100, 10**6)),
        ("n ≤ 10^9", 8, 25, "O(n) quá chậm — duyệt tới √n; tổng ước vượt kiểu int", g_sigma(100, 10**9)),
        ("n ≤ 10^12", 8, 25, "Biến chạy phải là long long (i·i tràn int), nhiều số nguyên tố lớn", g_sigma(100, 10**12, 10**11)),
    ],
    edge=("n = 1, số nguyên tố lớn, số chính phương, 10^12", 10,
          ["1\n1", "2\n2 4", "1\n999999999989", "1\n1000000000000", "3\n999966000289 999999000001 1000000",
           "5\n963761198400 735134400 1 2 3", "1\n549755813888"]),
)


# ---------------------------------------------------------------- E04 Tổng hình chữ nhật

def sol_rect(inp):
    t = ints(inp)
    n, m, q = t[0], t[1], t[2]
    a = t[3:3 + n * m]
    pre = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n):
        row, prev, cur = a[i * m:(i + 1) * m], pre[i], pre[i + 1]
        s = 0
        for j in range(m):
            s += row[j]
            cur[j + 1] = prev[j + 1] + s
    out = []
    k = 3 + n * m
    for _ in range(q):
        r1, c1, r2, c2 = t[k:k + 4]
        k += 4
        out.append(str(pre[r2][c2] - pre[r1 - 1][c2] - pre[r2][c1 - 1] + pre[r1 - 1][c1 - 1]))
    return "\n".join(out)


def g_rect(nmax, qmax, lo, hi, full=False):
    def g(r):
        n = nmax if full else r.randint(1, nmax)
        m = nmax if full else r.randint(1, nmax)
        q = qmax if full else r.randint(1, qmax)
        rows = [" ".join(str(r.randint(lo, hi)) for _ in range(m)) for _ in range(n)]
        qs = []
        for _ in range(q):
            if r.random() < 0.3:
                r1, c1, r2, c2 = min(n, r.randint(1, 2)), min(m, r.randint(1, 2)), max(1, n - r.randint(0, 1)), max(1, m - r.randint(0, 1))
                r1, r2, c1, c2 = min(r1, r2), max(r1, r2), min(c1, c2), max(c1, c2)
            else:
                r1, r2 = sorted((r.randint(1, n), r.randint(1, n)))
                c1, c2 = sorted((r.randint(1, m), r.randint(1, m)))
            qs.append(f"{r1} {c1} {r2} {c2}")
        return f"{n} {m} {q}\n" + "\n".join(rows) + "\n" + "\n".join(qs)
    return g


E04 = dict(
    id="E04", title="Tổng hình chữ nhật", difficulty="Trung bình", time_ms=1000,
    statement="""Cho bảng số nguyên $n$ hàng, $m$ cột (hàng đánh số $1..n$ từ trên xuống, cột $1..m$ từ trái sang). Trả lời $q$ câu hỏi: mỗi câu cho $r_1, c_1, r_2, c_2$, hãy tính **tổng các ô** thuộc hình chữ nhật có góc trên trái $(r_1, c_1)$ và góc dưới phải $(r_2, c_2)$.

### Input
- Dòng 1: $n, m, q$ ($1 \\le n, m \\le 500$, $1 \\le q \\le 2 \\cdot 10^5$).
- $n$ dòng tiếp theo, mỗi dòng $m$ số nguyên $a_{ij}$ ($|a_{ij}| \\le 10^9$).
- $q$ dòng cuối, mỗi dòng bốn số $r_1, c_1, r_2, c_2$ ($1 \\le r_1 \\le r_2 \\le n$, $1 \\le c_1 \\le c_2 \\le m$).

### Output
In $q$ dòng, mỗi dòng là tổng của một câu hỏi.""",
    hint="Dựng **mảng cộng dồn 2 chiều** $S[i][j]$ = tổng hình chữ nhật $(1,1)$–$(i,j)$: "
         "$S[i][j] = a[i][j] + S[i-1][j] + S[i][j-1] - S[i-1][j-1]$. Mỗi câu hỏi: $S[r_2][c_2] - S[r_1-1][c_2] - S[r_2][c_1-1] + S[r_1-1][c_1-1]$. "
         "Tổng có thể tới $2{,}5 \\cdot 10^{14}$ — dùng `long long`, khai báo mảng toàn cục.",
    samples=["3 4 3\n1 2 3 4\n5 6 7 8\n9 10 11 12\n1 1 2 2\n2 2 3 4\n1 1 3 4"],
    tiers=[
        ("n, m ≤ 10, q ≤ 10", 8, 15, "Cộng từng ô cho mỗi câu hỏi", g_rect(10, 10, 0, 100)),
        ("n, m ≤ 100, q ≤ 1 000, 0 ≤ a ≤ 1 000", 8, 20, "Cộng từng ô vẫn kịp (≈ 10^7 phép)", g_rect(100, 1000, 0, 1000)),
        ("n, m ≤ 500, q ≤ 2 000, 0 ≤ a ≤ 1 000", 6, 20, "Bảng lớn, ít câu hỏi — cộng từng ô vẫn kịp nhưng sát giới hạn", g_rect(500, 2000, 0, 1000, full=True)),
        ("n, m ≤ 500, q ≤ 2·10^5, |a| ≤ 10^9", 3, 30, "Bắt buộc cộng dồn 2 chiều O(1) mỗi câu; có số âm, tổng cần long long", g_rect(500, 200000, -10**9, 10**9, full=True)),
    ],
    edge=("bảng 1×1, một hàng, một cột, toàn bảng, toàn số âm", 10,
          ["1 1 1\n-1000000000\n1 1 1 1", "1 5 3\n1 -2 3 -4 5\n1 1 1 5\n1 2 1 4\n1 3 1 3",
           "5 1 2\n1000000000\n1000000000\n1000000000\n1000000000\n1000000000\n1 1 5 1\n2 1 4 1",
           "2 2 4\n-1 -1\n-1 -1\n1 1 2 2\n1 1 1 1\n2 2 2 2\n1 2 2 2"]),
)


# ---------------------------------------------------------------- E05 Leo cầu thang

def sol_stairs(inp):
    t = ints(inp)
    n, k, m = t[0], t[1], t[2]
    broken = bytearray(n + 1)
    for x in t[3:3 + m]:
        broken[x] = 1
    f = [0] * (n + 1)
    f[0] = 1
    window = 1
    for i in range(1, n + 1):
        cur = 0 if broken[i] else window % MOD
        f[i] = cur
        window += cur
        if i - k >= 0:
            window -= f[i - k]
    return str(f[n])


def g_stairs(nmax, kmax, broken_ratio, full=False):
    def g(r):
        n = r.randint(max(1, nmax * 3 // 4), nmax) if full else r.randint(1, nmax)
        k = r.randint(1, min(n, kmax))
        if r.random() < 0.3:
            k = min(n, kmax)
        m = int(n * broken_ratio * r.random()) if broken_ratio else 0
        pool = r.sample(range(1, n), min(m, n - 1)) if m else []
        pool.sort()
        return f"{n} {k} {len(pool)}\n{' '.join(map(str, pool))}"
    return g


E05 = dict(
    id="E05", title="Leo cầu thang", difficulty="Trung bình", time_ms=1000,
    statement="""Cầu thang có $n$ bậc, đánh số $1..n$ từ dưới lên; bạn đứng ở mặt đất (bậc $0$). Mỗi bước bạn leo lên từ $1$ đến $k$ bậc. Có $m$ bậc bị **hỏng**, không được đặt chân lên. Hỏi có bao nhiêu cách leo lên đúng bậc $n$? In kết quả **chia lấy dư cho $10^9 + 7$**.

### Input
- Dòng 1: $n, k, m$ ($1 \\le k \\le n \\le 10^6$, $0 \\le m < n$).
- Dòng 2: $m$ số nguyên phân biệt là các bậc hỏng, mỗi số trong khoảng $[1, n - 1]$ (dòng trống nếu $m = 0$).

### Output
In ra số cách leo chia dư cho $10^9 + 7$.""",
    hint="$f[i]$ = số cách tới bậc $i$: $f[0] = 1$, $f[i] = 0$ nếu bậc hỏng, ngược lại $f[i] = f[i-1] + \\dots + f[i-k]$. "
         "Tính tổng này mỗi lần là $O(nk)$ — quá chậm khi $n, k$ tới $10^6$. Giữ **tổng trượt** của $k$ giá trị gần nhất: cộng $f[i]$ vào, bớt $f[i-k]$ ra (nhớ cộng thêm $10^9+7$ trước khi lấy dư để không âm).",
    samples=["4 2 0\n", "5 2 1\n2"],
    tiers=[
        ("n ≤ 20, k ≤ 3, không có bậc hỏng", 8, 15, "Đệ quy thử mọi bước vẫn kịp", g_stairs(20, 3, 0)),
        ("n ≤ 1 000, có bậc hỏng", 8, 20, "Đệ quy quá chậm — cần quy hoạch động (mảng f)", g_stairs(1000, 1000, 0.3)),
        ("n ≤ 10^5, k ≤ 100", 8, 20, "Quy hoạch động O(n·k) vẫn kịp", g_stairs(10**5, 100, 0.2, full=True)),
        ("n, k ≤ 10^6", 8, 30, "O(n·k) quá chậm — cần tổng trượt O(n), lấy dư đúng", g_stairs(10**6, 10**6, 0.1, full=True)),
    ],
    edge=("n = 1, k = n, hỏng gần hết, hai bậc hỏng liền nhau dài hơn k", 10,
          ["1 1 0\n", "10 10 0\n", "10 1 1\n5", "10 2 2\n4 5", "10 3 8\n1 2 3 4 5 6 7 8",
           "1000000 1 0\n", "1000000 1000000 0\n", "1000000 2 0\n"]),
)


# ---------------------------------------------------------------- E06 Từ xuất hiện nhiều nhất

def sol_words(inp):
    words = re.findall(r"[A-Za-z]+", inp)
    c = Counter(w.lower() for w in words)
    best = min(c.items(), key=lambda kv: (-kv[1], kv[0]))
    return f"{best[0]} {best[1]}"


def _vocab(r, size, lmax):
    out = set()
    while len(out) < size:
        out.add("".join(r.choice(string.ascii_lowercase) for _ in range(r.randint(1, lmax))))
    return sorted(out)


def _case(r, w, mixed):
    if not mixed:
        return w
    k = r.random()
    return w.upper() if k < 0.15 else w.capitalize() if k < 0.4 else "".join(ch.upper() if r.random() < 0.2 else ch for ch in w)


def g_words(wmax, vocab, lmax, mixed, lines, tie=False):
    def g(r):
        voc = _vocab(r, vocab, lmax)
        weights = [1 / (i + 1) for i in range(len(voc))]
        r.shuffle(weights)
        nw = r.randint(max(1, wmax * 2 // 3), wmax)
        ws = r.choices(voc, weights, k=nw)
        if tie:
            top = Counter(ws).most_common(1)[0][1]
            a, b = r.sample(voc, 2)
            ws += [a] * (top + 1 - ws.count(a)) + [b] * (top + 1 - ws.count(b))
            r.shuffle(ws)
        seps = [" "] if not mixed else [" ", " ", " ", ", ", ". ", "! ", "? ", " - ", " (", ") ", "; ", ": ", " 2026 ", "'", "_", "123"]
        out, line = [], ""
        for w in ws:
            piece = _case(r, w, mixed) + r.choice(seps)
            if lines and len(line) + len(piece) > 900:
                out.append(line.rstrip())
                line = ""
            line += piece
        out.append(line.rstrip())
        return "\n".join(out)
    return g


E06 = dict(
    id="E06", title="Từ xuất hiện nhiều nhất", difficulty="Khó", time_ms=1000,
    statement="""Cho một đoạn văn bản tiếng Anh. Một **từ** là một dãy liên tiếp dài nhất các chữ cái Latin (`a`–`z`, `A`–`Z`); mọi ký tự khác (khoảng trắng, dấu câu, chữ số, xuống dòng…) đều là dấu phân cách. Hai từ coi là giống nhau nếu **không phân biệt hoa thường**.

Tìm từ xuất hiện nhiều lần nhất. Nếu có nhiều từ cùng số lần, chọn từ **nhỏ nhất theo thứ tự từ điển** (sau khi đổi về chữ thường).

### Input
Văn bản gồm nhiều dòng, đọc tới hết dữ liệu. Mỗi dòng dài không quá $1000$ ký tự, có ít nhất một từ, tổng số từ không quá $2 \\cdot 10^5$, mỗi từ dài không quá $20$ chữ cái.

### Output
In ra từ đó (viết thường), một dấu cách, rồi số lần xuất hiện.""",
    hint="Tách từ: duyệt từng ký tự, `isalpha` thì nối vào từ hiện tại (đổi `tolower`), gặp ký tự khác thì kết thúc từ. "
         "Lưu các từ vào mảng `char words[200000][21]`, **sắp xếp bằng `qsort` với `strcmp`**, khi đó các từ giống nhau nằm liền nhau — đếm từng nhóm. "
         "So từng cặp từ $O(w^2)$ sẽ quá chậm khi có $2 \\cdot 10^5$ từ.",
    samples=["the cat and the dog and THE bird", "Hello, world! Hello... WORLD?\nhello again: world."],
    tiers=[
        ("Một dòng, chữ thường, cách nhau một dấu cách", 8, 15, "Đọc từng từ bằng scanf(\"%s\") là đủ", g_words(30, 8, 6, False, False)),
        ("Có chữ hoa, dấu câu, chữ số", 8, 20, "Phải tự tách từ theo chữ cái và đổi về chữ thường", g_words(150, 20, 8, True, False)),
        ("Nhiều dòng, ≤ 10^4 từ", 8, 20, "Đọc tới hết dữ liệu (EOF); so từng cặp từ vẫn kịp; có từ hòa số lần", either(g_words(10**4, 500, 12, True, True), g_words(10**4, 500, 12, True, True, tie=True))),
        ("≤ 2·10^5 từ", 4, 30, "So từng cặp O(w²) quá chậm — sắp xếp (qsort + strcmp) rồi đếm", either(g_words(2 * 10**5, 30000, 20, True, True), g_words(2 * 10**5, 30000, 20, True, True, tie=True))),
    ],
    edge=("một từ duy nhất, mọi từ khác nhau, hòa số lần, từ dài 20 chữ, toàn chữ hoa", 10,
          ["a", "Zebra", "b a c", "dog cat dog cat", "ABCDEFGHIJKLMNOPQRST abcdefghijklmnopqrst x",
           "it's 2026... IT'S time; it is", "x1y2z3 x y z", "\n\nend\n\n", "AAA aaa AaA bbb BBB"]),
)


# ---------------------------------------------------------------- E07 Xếp hạng kỳ thi

def sol_rank(inp):
    lines = inp.split("\n")
    n = int(lines[0])
    rows = []
    for ln in lines[1:1 + n]:
        p = ln.split()
        total = int(p[1]) + int(p[2]) + int(p[3])
        rows.append((-total, int(p[4]), p[0], total))
    rows.sort()
    out, rank = [], 0
    for i, r in enumerate(rows):
        if i == 0 or r[:2] != rows[i - 1][:2]:
            rank = i + 1
        out.append(f"{rank} {r[2]} {r[3]}")
    return "\n".join(out)


def _ids(r, n):
    out = set()
    while len(out) < n:
        out.add("".join(r.choice(string.ascii_lowercase + string.digits) for _ in range(r.randint(3, 20))))
    return list(out)


def g_rank(nmax, score_set, pen_max, full=False):
    def g(r):
        n = r.randint(max(1, nmax * 3 // 4), nmax) if full else r.randint(2, nmax)
        ids = _ids(r, n)
        rows = []
        for x in ids:
            s = [r.choice(score_set) for _ in range(3)]
            rows.append(f"{x} {s[0]} {s[1]} {s[2]} {r.randint(0, pen_max)}")
        return f"{n}\n" + "\n".join(rows)
    return g


def g_rank_distinct(r):
    n = r.randint(2, 10)
    totals = r.sample(range(0, 301), n)
    rows = []
    for x, tot in zip(_ids(r, n), totals):
        a = r.randint(max(0, tot - 200), min(100, tot))
        b = r.randint(max(0, tot - a - 100), min(100, tot - a))
        rows.append(f"{x} {a} {b} {tot - a - b} {r.randint(0, 300)}")
    return f"{n}\n" + "\n".join(rows)


E07 = dict(
    id="E07", title="Xếp hạng kỳ thi", difficulty="Khó", time_ms=1000,
    statement="""Kỳ thi có $3$ bài, mỗi bài tối đa $100$ điểm. Mỗi thí sinh có mã (tên đăng nhập), điểm từng bài và **thời gian phạt** (phút). Bảng xếp hạng sắp theo:
1. **Tổng điểm** giảm dần;
2. bằng tổng điểm thì **thời gian phạt** tăng dần;
3. vẫn bằng thì **mã** tăng dần theo thứ tự từ điển (chỉ để cố định thứ tự in).

Hai thí sinh bằng cả tổng điểm và thời gian phạt thì **cùng hạng**; hạng của người tiếp theo bỏ qua các hạng đã dùng (ví dụ $1, 2, 2, 4$).

### Input
- Dòng 1: $n$ ($1 \\le n \\le 2 \\cdot 10^5$).
- $n$ dòng tiếp theo: mã thí sinh (chữ thường và chữ số, dài $1$–$20$, các mã khác nhau), ba điểm $s_1, s_2, s_3$ ($0 \\le s_i \\le 100$) và thời gian phạt $p$ ($0 \\le p \\le 10^4$).

### Output
In $n$ dòng theo thứ tự bảng xếp hạng, mỗi dòng: hạng, mã, tổng điểm.""",
    hint="Khai báo `struct` gồm mã (`char id[21]`), tổng điểm, thời gian phạt. Viết hàm so sánh cho `qsort`: so tổng điểm, rồi phạt, rồi `strcmp` mã. "
         "Hạng: người thứ $i$ (đếm từ 1) cùng hạng người trước nếu bằng tổng và phạt, ngược lại hạng $= i$. "
         "Sắp xếp nổi bọt $O(n^2)$ không kịp với $n = 2 \\cdot 10^5$.",
    samples=["5\nan 100 50 0 120\nbinh 80 70 0 90\nchi 100 50 0 120\ndung 90 60 30 100\nem 100 100 50 200"],
    tiers=[
        ("n ≤ 10, tổng điểm khác nhau", 8, 15, "Chỉ cần sắp theo tổng điểm", lambda r: g_rank_distinct(r)),
        ("n ≤ 1 000, có người bằng tổng điểm", 8, 20, "Bằng điểm thì so thời gian phạt", g_rank(1000, list(range(0, 101, 10)), 10**4)),
        ("n ≤ 1 000, có người cùng hạng", 8, 20, "Bằng cả điểm và phạt: cùng hạng, in theo mã tăng dần", g_rank(1000, [0, 50, 100], 5)),
        ("n ≤ 2·10^5", 3, 30, "Sắp xếp O(n²) quá chậm — dùng qsort với hàm so sánh", g_rank(2 * 10**5, list(range(0, 101, 5)), 50, full=True)),
    ],
    edge=("một thí sinh, tất cả bằng nhau, toàn điểm 0, toàn điểm tuyệt đối", 10,
          ["1\nsolo 0 0 0 0", "4\nd 100 100 100 0\nc 100 100 100 0\nb 100 100 100 0\na 100 100 100 0",
           "3\nx 0 0 0 5\ny 0 0 0 5\nz 0 0 0 4", "4\nb1 50 50 0 10\na1 0 50 50 10\nc1 100 0 0 9\na2 100 0 0 10",
           "3\n9 1 1 1 1\n10 1 1 1 1\n1a 1 1 1 1"]),
)


# ---------------------------------------------------------------- E08 Đếm đoạn có tổng K

def sol_subsum(inp):
    t = ints(inp)
    n, k = t[0], t[1]
    seen = Counter({0: 1})
    s = res = 0
    for x in t[2:2 + n]:
        s += x
        res += seen.get(s - k, 0)
        seen[s] += 1
    return str(res)


def g_subsum(nmax, amax, zero_ratio, full=False, k_mode="hit"):
    def g(r):
        n = r.randint(max(1, nmax * 3 // 4), nmax) if full else r.randint(1, nmax)
        a = [0 if r.random() < zero_ratio else r.randint(1, amax) for _ in range(n)]
        if k_mode == "zero":
            k = 0
        elif k_mode == "hit" or r.random() < 0.8:
            i = r.randint(0, n - 1)
            j = r.randint(i, min(n - 1, i + r.randint(0, 50)))
            k = sum(a[i:j + 1])
        else:
            k = r.randint(0, amax * 5)
        return f"{n} {k}\n{' '.join(map(str, a))}"
    return g


E08 = dict(
    id="E08", title="Đếm đoạn có tổng K", difficulty="Khó", time_ms=1000,
    statement="""Cho dãy $n$ số nguyên **không âm** $a_1, a_2, \\dots, a_n$ và số $K$. Đếm số **đoạn con liên tiếp** $[l, r]$ ($1 \\le l \\le r \\le n$) có tổng $a_l + a_{l+1} + \\dots + a_r = K$.

### Input
- Dòng 1: $n, K$ ($1 \\le n \\le 2 \\cdot 10^5$, $0 \\le K \\le 10^{15}$).
- Dòng 2: $n$ số nguyên $a_i$ ($0 \\le a_i \\le 10^9$).

### Output
In ra số đoạn con thỏa mãn.""",
    hint="Gọi $P_i$ là tổng $i$ phần tử đầu; cần đếm cặp $i < j$ có $P_j - P_i = K$. Vì $a_i \\ge 0$, $P$ **không giảm** — dùng **hai con trỏ**: với mỗi $j$, đẩy $i$ tới khi $P_j - P_i \\le K$. "
         "Có số $0$ thì nhiều $P$ bằng nhau: đếm theo **nhóm giá trị bằng nhau** (nhân số lượng hai nhóm). Đáp án có thể tới $2 \\cdot 10^{10}$ — `long long`.",
    samples=["5 3\n1 2 1 0 2", "4 0\n0 0 1 0"],
    tiers=[
        ("n ≤ 100", 8, 15, "Thử mọi đoạn, cộng lại từng đoạn O(n³)", g_subsum(100, 10, 0.1)),
        ("n ≤ 5 000", 8, 20, "Thử mọi đoạn dùng cộng dồn O(n²)", g_subsum(5000, 100, 0.1)),
        ("n ≤ 2·10^5, a_i ≥ 1, K ≥ 1", 5, 25, "O(n²) quá chậm — hai con trỏ trên tổng tiền tố", g_subsum(2 * 10**5, 10**9, 0, full=True)),
        ("n ≤ 2·10^5, có số 0, K có thể bằng 0", 5, 25, "Nhiều tiền tố bằng nhau: đếm theo nhóm, đáp án vượt int", g_subsum(2 * 10**5, 1000, 0.5, full=True)),
    ],
    edge=("n = 1, toàn số 0 với K = 0, K lớn hơn tổng dãy, K = 10^15", 10,
          ["1 0\n0", "1 5\n5", "1 5\n4", "6 0\n0 0 0 0 0 0", "3 1000000000000000\n1000000000 1000000000 1000000000",
           "5 3000000000\n1000000000 1000000000 1000000000 1000000000 1000000000",
           "200000 0\n" + " ".join(["0"] * 200000), "200000 0\n" + " ".join("0" if i % 2 else "1" for i in range(200000))]),
)

PROBLEMS = [E01, E02, E03, E04, E05, E06, E07, E08]


def build(p):
    r = random.Random(p["id"] + "-exam")
    inputs, groups = list(p["samples"]), []
    groups.append(("Ví dụ trong đề", 1, len(inputs), 5, "Đúng ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng"))
    seen = {x.strip() for x in inputs}
    for name, count, points, note, gen in p["tiers"]:
        start = len(inputs) + 1
        tries = 0
        while len(inputs) - start + 1 < count:
            tries += 1
            inp = gen(r)
            if inp.strip() in seen and tries < 200:
                continue
            seen.add(inp.strip())
            inputs.append(inp)
        groups.append((name, start, len(inputs), points, note))
    edge_name, edge_points, edge_inputs = p["edge"]
    start = len(inputs) + 1
    inputs += [x for x in edge_inputs if x.strip() not in seen]
    groups.append(("Trường hợp đặc biệt", start, len(inputs), edge_points, f"Biên và trường hợp dễ sót: {edge_name}"))
    total = sum(g[3] for g in groups)
    assert total == 100, (p["id"], total)

    base = os.path.join(ROOT, p["id"])
    tdir = os.path.join(base, "tests")
    os.makedirs(tdir, exist_ok=True)
    for f in os.listdir(tdir):
        os.remove(os.path.join(tdir, f))
    for i, inp in enumerate(inputs, 1):
        write(os.path.join(tdir, f"{i}.in"), inp)
        write(os.path.join(tdir, f"{i}.out"), p["solve"](inp))
    subtasks = [{"name": n, "tests": span(a, b), "points": pts, "note": note} for n, a, b, pts, note in groups]
    write(os.path.join(base, "subtasks.json"), json.dumps(subtasks, ensure_ascii=False, indent=2))
    write(os.path.join(base, "problem.txt"),
          f"title={p['title']}\ntime_ms={p['time_ms']}\nmemory_mb=256\ntests={len(inputs)}\ndifficulty={p['difficulty']}\n"
          f"samples={','.join(str(i) for i in range(1, len(p['samples']) + 1))}")
    write(os.path.join(base, "statement.md"), p["statement"])
    write(os.path.join(base, "hint.md"), p["hint"])
    return len(inputs), len(subtasks)


SOLVERS = {"E01": sol_time, "E02": sol_div, "E03": sol_sigma, "E04": sol_rect,
           "E05": sol_stairs, "E06": sol_words, "E07": sol_rank, "E08": sol_subsum}
for _p in PROBLEMS:
    _p["solve"] = SOLVERS[_p["id"]]

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    for p in PROBLEMS:
        if not only or p["id"] in only:
            n, s = build(p)
            print(f"{p['id']} {p['title']}: {n} test, {s} subtask")
