"""Sinh bộ đề kiểm tra KTLT K67 F01–F06, mỗi bài 20 test, 4 subtask (10/50/25/15).

Kiến thức: if/else, for/while, mảng 1D/2D, hàm (kể cả đệ quy nhẹ như gcd).
Không dùng string, struct, qsort, con trỏ, cấp phát động.

Đề mang hơi hướng kịch bản ("đánh lạc hướng") để sinh viên phải đọc kỹ đề.

Chạy:  python scripts/generate-ktr-ktlt-k67.py [F01 F02 ...]
"""
import json
import math
import os
import random
import sys
from math import gcd, isqrt

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "problems")


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text if text.endswith("\n") else text + "\n")


def span(a, b):
    return f"{a}" if a == b else f"{a}-{b}"


# ---------------------------------------------------------------- F01 MAX3

def sol_max3(inp):
    a, b, c = map(int, inp.split())
    return str(max(a, b, c))


def g_pos_distinct(lo, hi):
    def g(r):
        xs = r.sample(range(lo, hi + 1), 3)
        return " ".join(map(str, xs))
    return g


def g_mixed_signed(lo, hi):
    def g(r):
        return " ".join(str(r.randint(lo, hi)) for _ in range(3))
    return g


def g_equal(r):
    k = r.random()
    if k < 0.4:
        x = r.randint(-10**9, 10**9); return f"{x} {x} {x}"
    if k < 0.75:
        x = r.randint(-10**9, 10**9); y = x - r.randint(1, 1000)
        return f"{x} {x} {y}"
    x = r.randint(-10**9, 10**9); y = x - r.randint(1, 10)
    perm = [x, x, y]; r.shuffle(perm); return " ".join(map(str, perm))


F01 = dict(
    id="F01", title="Số lớn nhất trong 3 số", difficulty="Dễ", time_ms=1000,
    statement="""An, Bình và Chi chơi trò **"ai cao điểm nhất"**: ba bạn tung xúc xắc lớn, mỗi bạn ghi lại điểm của mình (có thể âm nếu bị phạt). Hãy giúp trọng tài tìm ra **số điểm cao nhất** trong ba bạn.

### Input
Một dòng gồm ba số nguyên $a, b, c$ ($-10^9 \\le a, b, c \\le 10^9$) — lần lượt là điểm của An, Bình và Chi.

### Output
Một số nguyên duy nhất: điểm cao nhất.""",
    hint="So sánh bằng `if/else`: `if (a >= b && a >= c) max = a; else if (b >= c) max = b; else max = c;`. "
         "Hoặc viết hàm `int max2(int x, int y)` rồi `max2(a, max2(b, c))`. Với $|a| \\le 10^9$ dùng `int` là đủ, không cần `long long`. "
         "Chú ý: hai số bằng nhau vẫn tính là lớn nhất (dùng `>=` thay vì `>`).",
    samples=["1 5 3", "7 7 2"],
    tiers=[
        ("3 số dương phân biệt, ≤ 10^4", 10, 50, "if/else cơ bản với 3 số dương khác nhau", g_pos_distinct(1, 10000)),
        ("Có số âm", 5, 25, "Nhớ xử lý số âm — khởi tạo max = -10^9 chứ không phải 0", g_mixed_signed(-10**9, 10**9)),
        ("Có số bằng nhau", 3, 15, "Hai hoặc ba số bằng nhau — so sánh phải dùng >=", g_equal),
    ],
)


# ---------------------------------------------------------------- F02 SQUARE

def sol_square(inp):
    n = int(inp)
    if n < 0:
        return "NO"
    k = isqrt(n)
    return "YES" if k * k == n else "NO"


def g_sq_small(r):
    k = r.random()
    if k < 0.35:
        x = r.randint(0, 10**4); return str(x * x)
    if k < 0.55:
        x = r.randint(1, 10**4); return str(max(0, x * x + r.choice([-1, 1])))
    return str(r.randint(0, 10**8))


def g_sq_big(r):
    k = r.random()
    if k < 0.35:
        x = r.randint(10**4, 10**9); return str(x * x)
    if k < 0.55:
        x = r.randint(10**4, 10**9); return str(x * x + r.choice([-1, 1]))
    return str(r.randint(10**8 + 1, 10**18))


def g_sq_edge(r):
    k = r.random()
    if k < 0.5:
        return str(-r.randint(1, 10**18))
    x = r.randint(10**8, 10**9); return str(x * x + r.choice([-1, 1]))


F02 = dict(
    id="F02", title="Kiểm tra số chính phương", difficulty="Trung bình", time_ms=1000,
    statement="""Giáo sư Tâm thu thập $N$ viên bi để xếp thành hình vuông đặc. Giáo sư muốn biết có thể xếp hết $N$ viên thành hình vuông cạnh nguyên hay không — tức là $N$ có phải **số chính phương** (bình phương một số nguyên không âm) hay không.

Lưu ý: nếu nhập $N$ âm (do nhân viên gõ nhầm), **không thể** xếp được vuông nào — in `NO`.

### Input
Một số nguyên $N$ ($-10^{18} \\le N \\le 10^{18}$).

### Output
In `YES` nếu $N$ là chính phương, ngược lại in `NO`.""",
    hint="Nếu $N < 0$: in `NO` rồi dừng. "
         "Với $N$ nhỏ: duyệt `long long i = 0`, khi `i*i > N` thì dừng; nếu gặp `i*i == N` thì YES. "
         "Với $N$ lớn: dùng `long long r = (long long) sqrtl((long double) N);` rồi kiểm tra `r*r == N` ở các giá trị `r - 1, r, r + 1` (sai số `sqrt` có thể lệch ±1). "
         "Nhớ `#include <math.h>` và dùng `long long` + `%lld` ngay từ đầu để subtask lớn không tràn.",
    samples=["16", "14"],
    tiers=[
        ("1 ≤ N ≤ 10^8", 10, 50, "Dùng sqrt cơ bản hoặc vòng for i*i<=n, int là đủ", g_sq_small),
        ("10^8 < N ≤ 10^18", 5, 25, "Bắt buộc long long; sqrt có sai số, phải dò quanh ±1", g_sq_big),
        ("N = 0, số âm, số sát chính phương lớn", 3, 15, "Bẫy: 0 là chính phương; số âm luôn NO", g_sq_edge),
    ],
)


# ---------------------------------------------------------------- F03 ATM

DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1]


def sol_atm(inp):
    n = int(inp)
    cnt = 0
    for d in DENOMS:
        cnt += n // d
        n %= d
    return str(cnt)


def g_atm_small(r):
    return str(r.randint(1, 10**5))


def g_atm_big(r):
    return str(r.randint(10**5 + 1, 10**15))


def g_atm_edge(r):
    k = r.random()
    if k < 0.3:
        return "0"
    if k < 0.55:
        return str(r.randint(1, 4))
    if k < 0.8:
        return str(500 * r.randint(1, 10**12))
    return str(500 * r.randint(10**11, 2 * 10**12))


F03 = dict(
    id="F03", title="Máy ATM đổi tiền", difficulty="Trung bình", time_ms=1000,
    statement="""Nam vừa đến cây ATM đầu đường để rút tiền tiêu Tết. Máy có đủ các mệnh giá (tính theo **nghìn đồng**): $500, 200, 100, 50, 20, 10, 5, 2, 1$. Máy luôn ưu tiên trả **ít tờ nhất có thể**. Cho số tiền $N$ nghìn đồng, hãy tính **số tờ** mà máy phải trả cho Nam.

### Input
Một số nguyên $N$ ($0 \\le N \\le 10^{15}$).

### Output
Một số nguyên: số tờ tiền ít nhất.""",
    hint="Vì có đủ các mệnh giá $500, 200, 100, 50, 20, 10, 5, 2, 1$ (có cả 1 và 2) nên **lúc nào cũng đổi được** và **tham lam từ lớn tới nhỏ** cho kết quả ít tờ nhất. "
         "Khai một mảng `long long m[9] = {500, 200, 100, 50, 20, 10, 5, 2, 1};`, duyệt từng mệnh giá: `cnt += N / m[i]; N %= m[i];`. "
         "$N$ tới $10^{15}$ nên **bắt buộc long long** và `%lld` — dùng `int` sẽ tràn số âm.",
    samples=["658", "0"],
    tiers=[
        ("1 ≤ N ≤ 10^5", 10, 50, "Chia và lấy dư cơ bản, int là đủ", g_atm_small),
        ("10^5 < N ≤ 10^15", 5, 25, "Dùng int sẽ tràn thành số âm — phải long long", g_atm_big),
        ("N = 0, N < 5, bội của 500 cỡ lớn", 3, 15, "N = 0 phải in 0; N nhỏ cần dùng mệnh giá 1, 2", g_atm_edge),
    ],
)


# ---------------------------------------------------------------- F04 PRIMES

def _is_prime(n):
    if n < 2:
        return False
    if n < 4:
        return True
    if n % 2 == 0:
        return False
    i = 3
    while i * i <= n:
        if n % i == 0:
            return False
        i += 2
    return True


def sol_primes(inp):
    L, R = map(int, inp.split())
    cnt = 0
    for k in range(max(2, L), R + 1):
        if _is_prime(k):
            cnt += 1
    return str(cnt)


def g_pr_small(r):
    L = r.randint(1, 900)
    R = L + r.randint(0, 1000 - L)
    return f"{L} {R}"


def g_pr_mid(r):
    R = r.randint(1000, 2 * 10**5)
    L = R - r.randint(0, min(R - 1, 10**4))
    return f"{L} {R}"


def g_pr_edge(r):
    k = r.random()
    if k < 0.3:
        return f"0 {r.randint(0, 200)}"
    if k < 0.55:
        return f"1 {r.randint(1, 500)}"
    if k < 0.75:
        a = r.randint(10000, 200000)
        return f"{a} {a + 1}"  # likely 0 or 1 prime
    primes = [199933, 199961, 199967, 199999, 199933, 149993, 99991, 1999993 % 200000 + 150000]
    p = r.choice([x for x in primes if 2 <= x <= 2 * 10**5])
    return f"{p} {p}"


F04 = dict(
    id="F04", title="Đếm số nguyên tố trong đoạn", difficulty="Trung bình", time_ms=1000,
    statement="""Cô giáo Ngọc chuẩn bị bài giảng về số nguyên tố, cô muốn biết trong đoạn $[L, R]$ có bao nhiêu **số nguyên tố** để chọn ví dụ. Hãy viết chương trình giúp cô.

Nhắc lại: số nguyên tố là số tự nhiên lớn hơn $1$ chỉ chia hết cho $1$ và chính nó. **Số $0$ và $1$ không phải số nguyên tố.**

### Input
Một dòng gồm hai số nguyên $L, R$ ($0 \\le L \\le R \\le 2 \\cdot 10^5$, $R - L \\le 10^4$).

### Output
Số lượng số nguyên tố trong đoạn $[L, R]$.""",
    hint="Viết hàm `int prime(int n)`: nếu `n < 2` trả về 0; sau đó duyệt `i` từ 2 tới khi `i*i > n`, nếu `n % i == 0` trả về 0. Trả về 1 ở cuối. "
         "Điều kiện vòng là `i * i <= n` (không viết `i <= sqrt(n)` vì sai số). "
         "Vòng chính: `for (int k = L; k <= R; k++) if (prime(k)) cnt++;`. Nhớ bỏ qua `k = 0, 1`.",
    samples=["10 20", "1 10"],
    tiers=[
        ("1 ≤ L ≤ R ≤ 1000", 10, 50, "Vòng for L→R, hàm prime trâu O(n) vẫn kịp", g_pr_small),
        ("R ≤ 2·10^5, R − L ≤ 10^4", 5, 25, "Hàm prime phải chạy tới √n (`i*i <= n`)", g_pr_mid),
        ("L = 0 hoặc 1, không có nguyên tố, L = R là nguyên tố lớn", 3, 15, "Bẫy: loại 0 và 1; đoạn không có số nào thì in 0", g_pr_edge),
    ],
)


# ---------------------------------------------------------------- F05 SPIRAL

def sol_spiral(inp):
    n, m = map(int, inp.split())
    a = [[0] * m for _ in range(n)]
    dx, dy = [0, 1, 0, -1], [1, 0, -1, 0]
    x = y = d = 0
    for v in range(1, n * m + 1):
        a[x][y] = v
        nx, ny = x + dx[d], y + dy[d]
        if nx < 0 or nx >= n or ny < 0 or ny >= m or a[nx][ny]:
            d = (d + 1) % 4
            nx, ny = x + dx[d], y + dy[d]
        x, y = nx, ny
    return "\n".join(" ".join(str(v) for v in row) for row in a)


def g_sp_small(r):
    return f"{r.randint(2, 6)} {r.randint(2, 6)}"


def g_sp_mid(r):
    return f"{r.randint(7, 25)} {r.randint(7, 25)}"


def g_sp_edge(r):
    k = r.random()
    if k < 0.3:
        return f"1 {r.randint(1, 50)}"
    if k < 0.55:
        return f"{r.randint(1, 50)} 1"
    if k < 0.7:
        return "1 1"
    return f"{r.randint(45, 50)} {r.randint(45, 50)}"


F05 = dict(
    id="F05", title="Ma trận xoắn ốc", difficulty="Khó", time_ms=1000,
    statement="""Bộ phận IT nhận được yêu cầu in **biên lai** cho một lô hàng xếp theo lưới $n \\times m$. Các ô biên lai cần được đánh số từ $1$ đến $n \\cdot m$ **theo chiều xoắn ốc thuận chiều kim đồng hồ**, bắt đầu từ ô trên bên trái $(1, 1)$: đi sang **phải** cho hết hàng, rồi **xuống**, rồi **sang trái**, rồi **lên**, lặp lại cho đến hết.

Hãy in ma trận biên lai đó.

### Input
Hai số nguyên $n, m$ ($1 \\le n, m \\le 50$) — số hàng và số cột.

### Output
$n$ dòng, mỗi dòng gồm $m$ số nguyên **cách nhau một dấu cách**.""",
    hint="Khai `int a[55][55] = {0};` — giá trị 0 tức là ô chưa điền. "
         "Dùng 4 hướng: `dx[4] = {0, 1, 0, -1}, dy[4] = {1, 0, -1, 0}` và biến `d = 0`. "
         "Với mỗi `v` từ 1 tới `n*m`: gán `a[x][y] = v`, thử bước `(x + dx[d], y + dy[d])`; nếu ra ngoài hoặc ô đã điền thì `d = (d + 1) % 4` rồi bước lại. "
         "Khi `n = 1` hoặc `m = 1` thì chỉ đi một hướng — thuật toán trên tự xử lý đúng, không cần `if` riêng.",
    samples=["3 4", "1 1"],
    tiers=[
        ("2 ≤ n, m ≤ 6", 10, 50, "Ma trận nhỏ — thử 4 hướng vẫn kịp", g_sp_small),
        ("7 ≤ n, m ≤ 25", 5, 25, "Vẫn 4 hướng, chú ý điều kiện đổi hướng", g_sp_mid),
        ("1 × m, n × 1, 1 × 1, 50 × 50", 3, 15, "Ma trận suy biến: quên kiểm tra biên sẽ in sai", g_sp_edge),
    ],
)


# ---------------------------------------------------------------- F06 BACBA (tam giác)

def _dist2(ax, ay, bx, by):
    return (ax - bx) ** 2 + (ay - by) ** 2


def sol_bacba(inp):
    v = list(map(int, inp.split()))
    xa, ya, xb, yb, xc, yc = v
    cross = (xb - xa) * (yc - ya) - (yb - ya) * (xc - xa)
    if cross == 0:
        return "INVALID"
    ab = math.sqrt(_dist2(xa, ya, xb, yb))
    bc = math.sqrt(_dist2(xb, yb, xc, yc))
    ca = math.sqrt(_dist2(xc, yc, xa, ya))
    perim = ab + bc + ca
    area = abs(cross) / 2.0
    return f"{perim:.2f}\n{area:.2f}"


def g_bb_small(r):
    while True:
        pts = [(r.randint(1, 50), r.randint(1, 50)) for _ in range(3)]
        (xa, ya), (xb, yb), (xc, yc) = pts
        if (xb - xa) * (yc - ya) - (yb - ya) * (xc - xa) != 0:
            return f"{xa} {ya} {xb} {yb} {xc} {yc}"


def g_bb_mid(r):
    while True:
        pts = [(r.randint(-10**4, 10**4), r.randint(-10**4, 10**4)) for _ in range(3)]
        (xa, ya), (xb, yb), (xc, yc) = pts
        if (xb - xa) * (yc - ya) - (yb - ya) * (xc - xa) != 0:
            return f"{xa} {ya} {xb} {yb} {xc} {yc}"


def g_bb_edge(r):
    k = r.random()
    if k < 0.25:
        y = r.randint(-10**4, 10**4)
        xs = r.sample(range(-10**4, 10**4), 3)
        return f"{xs[0]} {y} {xs[1]} {y} {xs[2]} {y}"
    if k < 0.5:
        x = r.randint(-10**4, 10**4)
        ys = r.sample(range(-10**4, 10**4), 3)
        return f"{x} {ys[0]} {x} {ys[1]} {x} {ys[2]}"
    if k < 0.75:
        xa = r.randint(-100, 100); ya = r.randint(-100, 100)
        dx = r.randint(1, 50); dy = r.randint(-50, 50)
        return f"{xa} {ya} {xa + dx} {ya + dy} {xa + 2 * dx} {ya + 2 * dy}"
    x = r.randint(-10**4, 10**4); y = r.randint(-10**4, 10**4)
    xc = r.randint(-10**4, 10**4); yc = r.randint(-10**4, 10**4)
    return f"{x} {y} {x} {y} {xc} {yc}"


F06 = dict(
    id="F06", title="Khảo sát khu đất tam giác", difficulty="Khó", time_ms=1000,
    statement="""Bác Ba vừa cắm 3 cọc mốc để chuẩn bị khảo sát miếng đất mới mua. Mỗi cọc có toạ độ nguyên trên bản đồ: $A(x_A, y_A)$, $B(x_B, y_B)$, $C(x_C, y_C)$.

- Nếu 3 cọc **không tạo thành tam giác** (do 3 điểm thẳng hàng, hoặc có 2 cọc trùng nhau): in `INVALID`.
- Nếu tạo thành tam giác hợp lệ:
  - Dòng 1: **chu vi** tam giác.
  - Dòng 2: **diện tích** tam giác (dùng công thức Heron).
  Cả hai làm tròn **đúng 2 chữ số thập phân**.

### Input
Một dòng gồm 6 số nguyên $x_A, y_A, x_B, y_B, x_C, y_C$, trị tuyệt đối không quá $10^4$.

### Output
Một dòng `INVALID`, hoặc hai dòng chu vi và diện tích đã làm tròn.""",
    hint="**Trước tiên kiểm tra tam giác hợp lệ** bằng tích có hướng (cross product) với số nguyên: "
         "`long long cross = (long long)(xb - xa) * (yc - ya) - (long long)(yb - ya) * (xc - xa);` — nếu `cross == 0` thì in `INVALID`. "
         "Cách này tự xử lý luôn trường hợp 2 cọc trùng nhau (vì khi đó cross cũng = 0). "
         "Nếu hợp lệ: dùng `double ab = sqrt((double)((xa-xb)*(xa-xb) + (ya-yb)*(ya-yb)));` cho 3 cạnh, chu vi = tổng 3 cạnh. "
         "Diện tích dùng trực tiếp **nửa trị tuyệt đối tích có hướng**: `area = fabs(cross) / 2.0` — chính xác hơn công thức Heron và không bị NaN. "
         "In `printf(\"%.2f\\n\", perim); printf(\"%.2f\\n\", area);`.",
    samples=["0 0 3 0 0 4", "0 0 1 1 2 2"],
    tiers=[
        ("Toạ độ dương nhỏ, tam giác hợp lệ", 10, 50, "Toạ độ trong [1, 50], không thẳng hàng", g_bb_small),
        ("Toạ độ âm và lớn, tam giác tù/nhọn", 5, 25, "|x|, |y| ≤ 10^4; diện tích có thể lẻ 0.5", g_bb_mid),
        ("Thẳng hàng ngang/dọc/xiên, 2 cọc trùng", 3, 15, "Phải phát hiện INVALID trước khi tính Heron (tránh NaN)", g_bb_edge),
    ],
)


PROBLEMS = [F01, F02, F03, F04, F05, F06]


def build(p):
    r = random.Random(p["id"] + "-ktr-ktlt-k67")
    inputs, groups, seen = list(p["samples"]), [], set(x.strip() for x in p["samples"])
    groups.append(("Ví dụ trong đề", 1, len(inputs), 10, "Đúng ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng"))
    for name, count, points, note, gen in p["tiers"]:
        start = len(inputs) + 1
        tries = 0
        while len(inputs) - start + 1 < count:
            tries += 1
            inp = gen(r)
            if inp.strip() in seen and tries < 500:
                continue
            seen.add(inp.strip())
            inputs.append(inp)
            if tries > 2000:
                break
        groups.append((name, start, len(inputs), points, note))
    total = sum(g[3] for g in groups)
    assert total == 100, (p["id"], total)
    assert len(inputs) == 20, (p["id"], len(inputs))

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


SOLVERS = {"F01": sol_max3, "F02": sol_square, "F03": sol_atm,
           "F04": sol_primes, "F05": sol_spiral, "F06": sol_bacba}
for _p in PROBLEMS:
    _p["solve"] = SOLVERS[_p["id"]]

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    for p in PROBLEMS:
        if not only or p["id"] in only:
            n, s = build(p)
            print(f"{p['id']} {p['title']}: {n} test, {s} subtask")
