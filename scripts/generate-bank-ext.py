"""Sinh ngân hàng bài mở rộng N01–N37 cho lộ trình KTLT mới.

Mỗi bài: 15–20 test, 4 subtask (10/50/25/15 điểm).
Chạy:  python scripts/generate-bank-ext.py [N01 N02 ...]
"""
import json
import math
import os
import random
import re
import string
import sys
from math import gcd, isqrt

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "problems")


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text if text.endswith("\n") else text + "\n")


def span(a, b):
    return f"{a}" if a == b else f"{a}-{b}"


def seed(pid):
    return random.Random(pid + "-bank-ext")


# ==================== Ch1 ====================

def sol_card(_):
    return "Nguyen Van A\nSV2007001\nCNTT K67 - UTC2"


N01 = dict(id="N01", title="Danh thiếp sinh viên", difficulty="Dễ", chapter="ch1",
    statement="""Hãy in ra **đúng ba dòng** sau:
```
Nguyen Van A
SV2007001
CNTT K67 - UTC2
```
### Input
Không có.
### Output
Ba dòng như trên, mỗi dòng kết thúc bằng ký tự xuống dòng.""",
    hint="Chỉ cần `printf(\"Nguyen Van A\\n\");` ba lần. Không có `scanf`.",
    samples=[""], tiers=[], solve=sol_card)


# ==================== Ch2 ====================

def sol_tri_area(inp):
    a, h = map(int, inp.split())
    s = a * h / 2
    return f"{s:.2f}"


def g_pair(lo, hi):
    def g(r):
        return f"{r.randint(lo, hi)} {r.randint(lo, hi)}"
    return g


N02 = dict(id="N02", title="Diện tích tam giác", difficulty="Dễ", chapter="ch2",
    statement="""Cho đáy $a$ và chiều cao $h$ của một tam giác. Hãy tính diện tích $S = \\dfrac{a \\cdot h}{2}$.

### Input
Một dòng gồm hai số nguyên dương $a, h$ ($1 \\le a, h \\le 10^6$).

### Output
Diện tích làm tròn **2 chữ số thập phân**.""",
    hint="`printf(\"%.2f\\n\", a * h / 2.0);`. Nhớ `/ 2.0` để không bị mất phần lẻ.",
    samples=["5 4", "7 3"],
    tiers=[("a, h ≤ 100", 8, 50, "Số nhỏ, kết quả chẵn", g_pair(1, 100)),
           ("a, h ≤ 1000", 4, 25, "Kết quả lẻ, kiểm tra format %.2f", g_pair(1, 1000)),
           ("a hoặc h cỡ 10^6", 3, 15, "Tích lớn — cần đổi sang double khi chia", g_pair(10**5, 10**6))],
    edge=None, solve=sol_tri_area)


def sol_dtb(inp):
    t, l, h = map(float, inp.split())
    return f"{(t + l + h) / 3:.2f}"


def g_scores(r):
    return f"{r.uniform(0, 10):.1f} {r.uniform(0, 10):.1f} {r.uniform(0, 10):.1f}"


N03 = dict(id="N03", title="Điểm trung bình ba môn", difficulty="Dễ", chapter="ch2",
    statement="""Nhập điểm ba môn Toán, Lý, Hoá (số thực $0 \\le d \\le 10$). In điểm trung bình cộng làm tròn 2 chữ số thập phân.

### Input
Một dòng gồm ba số thực $t, l, h$.

### Output
Điểm trung bình làm tròn 2 chữ số thập phân.""",
    hint="Dùng `double`: `scanf(\"%lf %lf %lf\", &t, &l, &h);` rồi `printf(\"%.2f\\n\", (t+l+h)/3);`",
    samples=["8 7 9", "5.5 6.0 7.5"],
    tiers=[("Điểm nguyên 0–10", 6, 50, "", lambda r: f"{r.randint(0,10)} {r.randint(0,10)} {r.randint(0,10)}"),
           ("Điểm có 1 chữ số thập phân", 5, 25, "", g_scores),
           ("Số 0 và 10 ở các biên", 3, 15, "", lambda r: " ".join(r.choice(["0", "10", f"{r.uniform(0,10):.1f}"]) for _ in range(3)))],
    edge=None, solve=sol_dtb)


def sol_f2c(inp):
    f = float(inp)
    return f"{(f - 32) * 5 / 9:.2f}"


N04 = dict(id="N04", title="Đổi độ F sang độ C", difficulty="Dễ", chapter="ch2",
    statement="""Cho nhiệt độ $F$ (số thực) theo thang Fahrenheit. Đổi sang thang Celsius theo công thức $C = (F - 32) \\cdot \\dfrac{5}{9}$.

### Input
Một số thực $F$ ($-500 \\le F \\le 500$).

### Output
Nhiệt độ C làm tròn 2 chữ số thập phân.""",
    hint="`double c = (f - 32) * 5.0 / 9.0;` — nhớ `5.0 / 9.0` để không bị chia nguyên.",
    samples=["32", "100", "-40"],
    tiers=[("F nguyên trong [0, 100]", 6, 50, "", lambda r: str(r.randint(0, 100))),
           ("F thực trong [-100, 212]", 5, 25, "", lambda r: f"{r.uniform(-100, 212):.1f}"),
           ("F lớn / rất âm", 3, 15, "", lambda r: f"{r.uniform(-500, 500):.2f}")],
    edge=None, solve=sol_f2c)


def sol_vat(inp):
    sl, dg = map(int, inp.split())
    return str(sl * dg * 11 // 10)


N05 = dict(id="N05", title="Tiền hàng có VAT 10%", difficulty="Dễ", chapter="ch2",
    statement="""Cho **số lượng** sản phẩm và **đơn giá** (đồng). Tính tổng tiền phải trả, đã bao gồm thuế VAT 10%.

### Input
Một dòng gồm hai số nguyên dương: $sl$ ($1 \\le sl \\le 10^6$) và $dg$ ($1 \\le dg \\le 10^9$), $dg$ luôn chia hết cho 10.

### Output
Tổng tiền phải trả (đồng, số nguyên).""",
    hint="`long long tong = (long long) sl * dg * 11 / 10;` — nhớ long long vì tích có thể tới $10^{16}$.",
    samples=["3 20000", "1 100000"],
    tiers=[("sl ≤ 100, dg ≤ 10^5", 6, 50, "", lambda r: f"{r.randint(1,100)} {r.randint(10,10**5)//10*10}"),
           ("Tích ≤ 10^12", 5, 25, "", lambda r: f"{r.randint(100,10**4)} {r.randint(10**4,10**7)//10*10}"),
           ("Tích tới 10^15 — bắt buộc long long", 3, 15, "", lambda r: f"{r.randint(10**5,10**6)} {r.randint(10**7,10**9)//10*10}")],
    edge=None, solve=sol_vat)


def sol_swap(inp):
    a, b = inp.split()
    return f"{b} {a}"


N06 = dict(id="N06", title="Hoán đổi hai số", difficulty="Dễ", chapter="ch2",
    statement="""Cho hai số nguyên $a$ và $b$. Hãy in ra chúng theo thứ tự **ngược lại**: $b$ rồi $a$.

### Input
Một dòng gồm hai số nguyên $a, b$ ($|a|, |b| \\le 10^9$).

### Output
Hai số, đổi thứ tự, cách nhau một dấu cách.""",
    hint="Dùng biến tạm: `int tmp = a; a = b; b = tmp;`. Hoặc đơn giản `printf(\"%d %d\\n\", b, a);`.",
    samples=["3 7", "100 -5"],
    tiers=[("|a|, |b| ≤ 100", 6, 50, "", g_pair(-100, 100)),
           ("|a|, |b| ≤ 10^6", 5, 25, "", g_pair(-10**6, 10**6)),
           ("|a|, |b| cỡ 10^9", 3, 15, "", g_pair(-10**9, 10**9))],
    edge=None, solve=sol_swap)


# ==================== Ch4 — vẽ hình sao ====================

def sol_rect_full(inp):
    n, m = map(int, inp.split())
    return "\n".join("*" * m for _ in range(n))


N07 = dict(id="N07", title="Hình chữ nhật sao đặc", difficulty="Dễ", chapter="ch4",
    statement="""Cho hai số nguyên dương $n, m$. In ra hình chữ nhật đặc kích thước $n$ hàng, $m$ cột, mỗi ô là dấu `*`.

### Input
Hai số nguyên $n, m$ ($1 \\le n, m \\le 50$).

### Output
$n$ dòng, mỗi dòng gồm $m$ dấu `*`.""",
    hint="Hai vòng `for` lồng nhau: `for i = 1..n` { `for j = 1..m` printf(\"*\"); printf(\"\\n\"); }",
    samples=["3 5", "1 4"],
    tiers=[("n, m ≤ 5", 6, 50, "", lambda r: f"{r.randint(1,5)} {r.randint(1,5)}"),
           ("n, m ≤ 20", 5, 25, "", lambda r: f"{r.randint(6,20)} {r.randint(6,20)}"),
           ("n, m tới 50", 4, 15, "n = 1 hoặc m = 1 là trường hợp đặc biệt", lambda r: r.choice([f"{r.randint(45,50)} {r.randint(45,50)}", f"1 {r.randint(10,50)}", f"{r.randint(10,50)} 1"]))],
    edge=None, solve=sol_rect_full)


def sol_tri_right(inp):
    n = int(inp)
    return "\n".join("*" * i for i in range(1, n + 1))


N08 = dict(id="N08", title="Tam giác sao vuông", difficulty="Dễ", chapter="ch4",
    statement="""In tam giác vuông bằng dấu `*`, cạnh góc vuông $n$. Dòng thứ $i$ có $i$ dấu `*`.

### Input
Một số nguyên $n$ ($1 \\le n \\le 50$).

### Output
$n$ dòng, dòng $i$ gồm $i$ dấu `*`.""",
    hint="Vòng ngoài `for i = 1..n`, vòng trong in `*` từ 1 đến `i`.",
    samples=["3", "5"],
    tiers=[("n ≤ 5", 6, 50, "", lambda r: str(r.randint(1, 5))),
           ("n ≤ 20", 5, 25, "", lambda r: str(r.randint(6, 20))),
           ("n tới 50", 4, 15, "", lambda r: str(r.randint(30, 50)))],
    edge=None, solve=sol_tri_right)


def sol_tri_iso(inp):
    n = int(inp)
    return "\n".join(" " * (n - i) + "*" * (2 * i - 1) for i in range(1, n + 1))


N09 = dict(id="N09", title="Tam giác cân sao", difficulty="Trung bình", chapter="ch4",
    statement="""In tam giác cân bằng dấu `*`, chiều cao $n$. Dòng $i$ có $2i - 1$ dấu `*`, lùi đầu dòng $n - i$ khoảng trắng để đỉnh ở giữa.

### Input
Số nguyên $n$ ($1 \\le n \\le 50$).

### Output
$n$ dòng mô tả tam giác cân.""",
    hint="Dòng $i$: in `(n - i)` dấu cách trước, rồi `(2*i - 1)` dấu `*`.",
    samples=["3", "5"],
    tiers=[("n ≤ 5", 6, 50, "", lambda r: str(r.randint(1, 5))),
           ("n ≤ 20", 5, 25, "", lambda r: str(r.randint(6, 20))),
           ("n tới 50", 4, 15, "", lambda r: str(r.randint(30, 50)))],
    edge=None, solve=sol_tri_iso)


# ==================== Ch5 — Số học ====================

def sol_armstrong(inp):
    t = inp.split()
    out = []
    for s in t[1:1 + int(t[0])]:
        n = int(s)
        k = len(s)
        total = sum(int(c) ** k for c in s)
        out.append("YES" if total == n else "NO")
    return "\n".join(out)


def g_arm(tmax, nmax):
    arms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 153, 370, 371, 407, 1634, 8208, 9474]
    arms = [x for x in arms if x <= nmax]
    def g(r):
        t = r.randint(1, tmax)
        xs = []
        for _ in range(t):
            if r.random() < 0.3 and arms:
                xs.append(r.choice(arms))
            else:
                xs.append(r.randint(1, nmax))
        return f"{t}\n{' '.join(map(str, xs))}"
    return g


N10 = dict(id="N10", title="Số Armstrong", difficulty="Trung bình", chapter="ch5",
    statement="""Số Armstrong (còn gọi là **Narcissistic**) là số có $k$ chữ số và bằng tổng lũy thừa bậc $k$ của các chữ số. Ví dụ $153 = 1^3 + 5^3 + 3^3$, $9474 = 9^4 + 4^4 + 7^4 + 4^4$.

Cho $T$ số nguyên, với mỗi số kiểm tra xem có phải Armstrong hay không.

### Input
- Dòng 1: $T$ ($1 \\le T \\le 50$).
- Dòng 2: $T$ số nguyên $1 \\le n_i \\le 10^7$.

### Output
$T$ dòng, mỗi dòng in `YES` hoặc `NO`.""",
    hint="Đếm số chữ số $k$ bằng vòng `while (tmp > 0) { k++; tmp /= 10; }`. Rồi duyệt lại các chữ số, cộng dồn `(chữ số)^k`. Dùng vòng `for` để tính lũy thừa, hoặc `pow(d, k)` rồi ép về `int`.",
    samples=["3\n153 100 9474", "2\n371 500"],
    tiers=[("n ≤ 1000", 6, 50, "", g_arm(20, 1000)),
           ("n ≤ 10^5", 5, 25, "", g_arm(30, 10**5)),
           ("n ≤ 10^7", 4, 15, "Có số 1 chữ số (luôn YES) và số lớn 7 chữ số", g_arm(50, 10**7))],
    edge=None, solve=sol_armstrong)


def sol_last_digit(inp):
    a, b = map(int, inp.split())
    if b == 0:
        return "1"
    tail = a % 10
    if tail in (0, 1, 5, 6):
        return str(tail)
    cycle = {2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 4: [4, 6], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6], 9: [9, 1]}[tail]
    return str(cycle[(b - 1) % len(cycle)])


N11 = dict(id="N11", title="Chữ số tận cùng của a mũ b", difficulty="Khó", chapter="ch5",
    statement="""Cho hai số nguyên $a, b$. Hãy tìm **chữ số tận cùng** của $a^b$ (tức là $a^b \\bmod 10$).

### Input
Một dòng gồm hai số nguyên $a, b$ ($0 \\le a \\le 10^{18}$, $0 \\le b \\le 10^{18}$).

### Output
Một số nguyên: chữ số tận cùng.""",
    hint="Chữ số tận cùng của $a^b$ chỉ phụ thuộc **chữ số tận cùng của $a$** và **$b$**. "
         "Các chữ số 0, 1, 5, 6 có chu kỳ 1 (lặp chính nó). Chữ số 4 và 9 có chu kỳ 2. "
         "Các chữ số 2, 3, 7, 8 có chu kỳ 4. Khi $b = 0$ kết quả luôn là 1 (quy ước $a^0 = 1$). Nhớ dùng `long long` vì b có thể tới $10^{18}$.",
    samples=["2 10", "7 3", "0 0"],
    tiers=[("a, b ≤ 20", 6, 50, "Trâu nhân b lần cũng được", lambda r: f"{r.randint(0,20)} {r.randint(0,20)}"),
           ("a, b ≤ 10^9", 5, 25, "Trâu TLE — cần công thức chu kỳ", lambda r: f"{r.randint(0,10**9)} {r.randint(0,10**9)}"),
           ("a, b tới 10^18", 4, 15, "Long long cho a và b", lambda r: f"{r.randint(0,10**18)} {r.randint(0,10**18)}")],
    edge=None, solve=sol_last_digit)


# ==================== Ch6 — Hàm & đệ quy ====================

def sol_cnk(inp):
    n, k = map(int, inp.split())
    if k < 0 or k > n:
        return "0"
    k = min(k, n - k)
    res = 1
    for i in range(1, k + 1):
        res = res * (n - i + 1) // i
    return str(res)


N12 = dict(id="N12", title="Tổ hợp C(n, k)", difficulty="Trung bình", chapter="ch6",
    statement="""Tính $C(n, k) = \\dfrac{n!}{k! \\cdot (n-k)!}$ — số cách chọn $k$ phần tử từ $n$ phần tử.

### Input
Một dòng gồm hai số nguyên $n, k$ ($0 \\le k \\le n \\le 60$). Đề đảm bảo kết quả vừa `long long`.

### Output
Giá trị $C(n, k)$.""",
    hint="Viết hàm `long long cnk(int n, int k)`. Tối ưu: `k = min(k, n - k)`, sau đó nhân tích `(n-k+1)*…*n / (1*…*k)` bằng vòng for, chia dần để không tràn.",
    samples=["5 2", "10 0", "60 30"],
    tiers=[("n ≤ 10", 6, 50, "Tính bằng công thức giai thừa cũng ổn", lambda r: f"{r.randint(0,10)} {r.randint(0,r.randint(0,10))}"),
           ("n ≤ 30", 5, 25, "Kết quả lớn — long long", lambda r: (lambda n: f"{n} {r.randint(0,n)}")(r.randint(10, 30))),
           ("n ≤ 60", 4, 15, "C(60, 30) ~ 1.18 * 10^17 — long long bắt buộc", lambda r: (lambda n: f"{n} {r.randint(0,n)}")(r.randint(40, 60)))],
    edge=None, solve=sol_cnk)


def sol_zero_fact(inp):
    n = int(inp)
    cnt = 0
    p = 5
    while p <= n:
        cnt += n // p
        p *= 5
    return str(cnt)


N13 = dict(id="N13", title="Số số 0 tận cùng của n!", difficulty="Khó", chapter="ch6",
    statement="""Cho số nguyên $n$. Hãy tính xem $n!$ có bao nhiêu số 0 ở cuối.

### Input
Một số nguyên $n$ ($0 \\le n \\le 10^9$).

### Output
Số lượng số 0 tận cùng.""",
    hint="Số 0 tận cùng = số thừa số 5 trong phân tích của $n!$. Công thức Legendre: $\\lfloor n/5 \\rfloor + \\lfloor n/25 \\rfloor + \\lfloor n/125 \\rfloor + \\dots$. "
         "Dùng vòng `while` nhân biến $p$ lên 5 lần mỗi vòng tới khi $p > n$. Nhớ `long long` vì $n$ tới $10^9$ và $p$ có thể lớn hơn.",
    samples=["5", "25", "100", "1000000000"],
    tiers=[("n ≤ 20", 6, 50, "Có thể trâu n! trực tiếp (fit long long với n ≤ 20)", lambda r: str(r.randint(0, 20))),
           ("n ≤ 10^6", 5, 25, "Trâu n! tràn — cần công thức Legendre", lambda r: str(r.randint(100, 10**6))),
           ("n ≤ 10^9", 4, 15, "Long long cho p", lambda r: str(r.randint(10**7, 10**9)))],
    edge=None, solve=sol_zero_fact)


# ==================== Ch7 — Mảng 1D ====================

def sol_push_zero(inp):
    t = inp.split()
    n = int(t[0])
    a = list(map(int, t[1:1 + n]))
    nz = [x for x in a if x != 0]
    nz += [0] * (n - len(nz))
    return " ".join(map(str, nz))


def g_arr0(nmax):
    def g(r):
        n = r.randint(1, nmax)
        return f"{n}\n{' '.join(str(r.choice([0, 0, r.randint(-100, 100)])) for _ in range(n))}"
    return g


N14 = dict(id="N14", title="Dồn số 0 về cuối mảng", difficulty="Trung bình", chapter="ch7",
    statement="""Cho mảng $n$ số nguyên. Hãy dồn tất cả các số $0$ về **cuối** mảng, giữ nguyên **thứ tự tương đối** của các số khác $0$.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($-10^9 \\le a_i \\le 10^9$).

### Output
Mảng kết quả, các số cách nhau một dấu cách.""",
    hint="Duyệt 1 lần: với mỗi phần tử khác 0, ghi vào vị trí `pos`, tăng `pos`. Hết lần đầu, điền 0 vào các vị trí từ `pos` tới `n - 1`.",
    samples=["5\n0 1 0 3 12", "6\n0 0 1 2 0 5"],
    tiers=[("n ≤ 100", 6, 50, "", g_arr0(100)),
           ("n ≤ 10^4", 5, 25, "", g_arr0(10**4)),
           ("n ≤ 10^5", 4, 15, "", g_arr0(10**5))],
    edge=None, solve=sol_push_zero)


def sol_merge(inp):
    lines = inp.split("\n")
    n, m = map(int, lines[0].split())
    a = list(map(int, lines[1].split()))
    b = list(map(int, lines[2].split()))
    i = j = 0
    out = []
    while i < n and j < m:
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out += a[i:] + b[j:]
    return " ".join(map(str, out))


def g_merge(nm_max):
    def g(r):
        n = r.randint(1, nm_max); m = r.randint(1, nm_max)
        a = sorted(r.randint(-10**6, 10**6) for _ in range(n))
        b = sorted(r.randint(-10**6, 10**6) for _ in range(m))
        return f"{n} {m}\n{' '.join(map(str, a))}\n{' '.join(map(str, b))}"
    return g


N15 = dict(id="N15", title="Trộn hai mảng đã sắp xếp", difficulty="Trung bình", chapter="ch7",
    statement="""Cho hai mảng $A$ và $B$ đã **sắp xếp tăng dần không giảm**. Hãy trộn thành một mảng duy nhất cũng tăng dần không giảm.

### Input
- Dòng 1: $n, m$ ($1 \\le n, m \\le 10^5$) — độ dài hai mảng.
- Dòng 2: $n$ số của $A$ (tăng dần không giảm).
- Dòng 3: $m$ số của $B$ (tăng dần không giảm).

### Output
Mảng kết quả gồm $n + m$ số, cách nhau một dấu cách.""",
    hint="Dùng 2 con trỏ `i = 0, j = 0`. Mỗi vòng so sánh `A[i]` và `B[j]`, lấy số nhỏ hơn trước. Hết một mảng thì copy phần còn lại.",
    samples=["3 3\n1 3 5\n2 4 6", "2 3\n1 2\n3 4 5"],
    tiers=[("n, m ≤ 100", 6, 50, "", g_merge(100)),
           ("n, m ≤ 10^4", 5, 25, "", g_merge(10**4)),
           ("n, m tới 10^5", 4, 15, "", g_merge(10**5))],
    edge=None, solve=sol_merge)


# ==================== Ch8 — Sắp xếp & tìm kiếm ====================

def sol_sort(inp):
    t = inp.split()
    a = sorted(map(int, t[1:1 + int(t[0])]))
    return " ".join(map(str, a))


def g_sort(nmax, vmax):
    def g(r):
        n = r.randint(1, nmax)
        return f"{n}\n{' '.join(str(r.randint(-vmax, vmax)) for _ in range(n))}"
    return g


N16 = dict(id="N16", title="Sắp xếp mảng tăng dần (nổi bọt)", difficulty="Dễ", chapter="ch8",
    statement="""Cho mảng $n$ số nguyên. Hãy sắp xếp **tăng dần không giảm**. Khuyến khích viết thuật **nổi bọt (bubble sort)** để rèn.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 2 \\cdot 10^4$).
- Dòng 2: $n$ số nguyên $|a_i| \\le 10^9$.

### Output
$n$ số đã sắp xếp, cách nhau dấu cách.""",
    hint="Hai vòng `for` lồng: ngoài `i = 0..n-2`, trong `j = 0..n-i-2`. Nếu `a[j] > a[j+1]` thì hoán đổi. "
         "Bubble sort O(n²) qua được tới n = 20 000; muốn n = 10^5 dùng `qsort`.",
    samples=["5\n3 1 4 1 5", "3\n2 2 2"],
    tiers=[("n ≤ 100", 6, 50, "Bubble sort ổn", g_sort(100, 1000)),
           ("n ≤ 2000", 5, 25, "Vẫn O(n²) kịp (~4 triệu phép)", g_sort(2000, 10**9)),
           ("n ≤ 2·10^4", 4, 15, "Bubble gần giới hạn 400 triệu phép — nên dùng qsort", g_sort(2 * 10**4, 10**9))],
    edge=None, solve=sol_sort)


def sol_sort_desc(inp):
    t = inp.split()
    a = sorted(map(int, t[1:1 + int(t[0])]), reverse=True)
    return " ".join(map(str, a))


N17 = dict(id="N17", title="Sắp xếp mảng giảm dần (chọn)", difficulty="Dễ", chapter="ch8",
    statement="""Cho mảng $n$ số nguyên. Hãy sắp xếp **giảm dần không tăng**. Khuyến khích viết **sắp xếp chọn (selection sort)**.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 2 \\cdot 10^4$).
- Dòng 2: $n$ số nguyên $|a_i| \\le 10^9$.

### Output
$n$ số đã sắp xếp giảm dần.""",
    hint="Vòng `i = 0..n-2`: tìm vị trí số lớn nhất trong `a[i..n-1]`, đổi chỗ với `a[i]`.",
    samples=["5\n3 1 4 1 5", "4\n10 10 5 1"],
    tiers=[("n ≤ 100", 6, 50, "", g_sort(100, 1000)),
           ("n ≤ 2000", 5, 25, "", g_sort(2000, 10**9)),
           ("n ≤ 2·10^4", 4, 15, "", g_sort(2 * 10**4, 10**9))],
    edge=None, solve=sol_sort_desc)


def sol_bsearch(inp):
    lines = inp.split("\n")
    n = int(lines[0])
    a = list(map(int, lines[1].split()))
    q = int(lines[2])
    out = []
    for x in map(int, lines[3].split()):
        import bisect
        i = bisect.bisect_left(a, x)
        out.append(str(i + 1) if i < n and a[i] == x else "-1")
    return "\n".join(out)


def g_bs(nmax, qmax):
    def g(r):
        n = r.randint(1, nmax)
        a = sorted(r.sample(range(1, max(2 * n, 10)), n)) if n <= nmax else sorted(r.randint(1, 10**6) for _ in range(n))
        q = r.randint(1, qmax)
        qs = [r.choice(a) if r.random() < 0.5 else r.randint(1, 10**6) for _ in range(q)]
        return f"{n}\n{' '.join(map(str, a))}\n{q}\n{' '.join(map(str, qs))}"
    return g


N18 = dict(id="N18", title="Tìm kiếm nhị phân", difficulty="Trung bình", chapter="ch8",
    statement="""Cho mảng $n$ số **đã sắp xếp tăng dần nghiêm ngặt** và $q$ truy vấn. Mỗi truy vấn cho số $x$: nếu $x$ có trong mảng, in **vị trí** (đếm từ 1); nếu không, in `-1`.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 2 \\cdot 10^5$).
- Dòng 2: $n$ số đã sắp xếp.
- Dòng 3: $q$ ($1 \\le q \\le 2 \\cdot 10^5$).
- Dòng 4: $q$ số truy vấn.

### Output
$q$ dòng, mỗi dòng là vị trí hoặc $-1$.""",
    hint="Hàm `int tim(int a[], int n, int x)`: `lo = 0, hi = n - 1`. Lặp `while (lo <= hi)`: `mid = (lo + hi) / 2`. "
         "Nếu `a[mid] == x` trả về `mid + 1`. Nếu `a[mid] < x` thì `lo = mid + 1`, ngược lại `hi = mid - 1`. Hết vòng chưa thấy thì trả `-1`.",
    samples=["5\n2 4 6 8 10\n3\n4 7 10"],
    tiers=[("n, q ≤ 100", 6, 50, "Trâu for cho mỗi truy vấn", g_bs(100, 100)),
           ("n, q ≤ 2000", 5, 25, "O(n*q) sát giới hạn", g_bs(2000, 2000)),
           ("n, q tới 2·10^5", 4, 15, "Bắt buộc tìm kiếm nhị phân O(q log n)", g_bs(2 * 10**5, 2 * 10**5))],
    edge=None, solve=sol_bsearch)


def sol_freq_max(inp):
    t = inp.split()
    a = list(map(int, t[1:1 + int(t[0])]))
    from collections import Counter
    c = Counter(a)
    best = max(c.items(), key=lambda kv: (kv[1], -kv[0]))
    return f"{best[0]} {best[1]}"


def g_freq(nmax, vmax):
    def g(r):
        n = r.randint(1, nmax)
        return f"{n}\n{' '.join(str(r.randint(1, vmax)) for _ in range(n))}"
    return g


N19 = dict(id="N19", title="Phần tử xuất hiện nhiều nhất", difficulty="Trung bình", chapter="ch8",
    statement="""Cho mảng $n$ số nguyên dương. Tìm **phần tử xuất hiện nhiều nhất** và **số lần xuất hiện**. Nếu nhiều phần tử cùng số lần, chọn phần tử **nhỏ nhất**.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 10^5$).
- Dòng 2: $n$ số nguyên $1 \\le a_i \\le 10^6$.

### Output
Hai số trên một dòng: giá trị và số lần xuất hiện, cách nhau một dấu cách.""",
    hint="Nếu $a_i \\le 10^6$: khai `int cnt[1000005] = {0};`, duyệt mảng cộng `cnt[a[i]]++`. "
         "Sau đó duyệt `v = 1..1000000`, giữ `(cnt[v], v)` lớn nhất, lưu ý ưu tiên số nhỏ hơn khi hoà.",
    samples=["5\n1 2 2 3 3", "6\n5 1 5 1 5 1"],
    tiers=[("n ≤ 100, a_i ≤ 100", 6, 50, "", g_freq(100, 100)),
           ("n ≤ 10^4, a_i ≤ 10^5", 5, 25, "", g_freq(10**4, 10**5)),
           ("n ≤ 10^5, a_i ≤ 10^6", 4, 15, "Mảng đếm 10^6 phần tử", g_freq(10**5, 10**6))],
    edge=None, solve=sol_freq_max)


def sol_unique(inp):
    t = inp.split()
    a = list(map(int, t[1:1 + int(t[0])]))
    from collections import Counter
    c = Counter(a)
    unique = sorted(x for x in c if c[x] == 1)
    return str(len(unique)) + "\n" + " ".join(map(str, unique)) if unique else "0\n"


N20 = dict(id="N20", title="Liệt kê phần tử xuất hiện đúng 1 lần", difficulty="Trung bình", chapter="ch8",
    statement="""Cho mảng $n$ số nguyên dương. Liệt kê các phần tử **xuất hiện đúng 1 lần**, in theo thứ tự tăng dần. Dòng 1 in số lượng, dòng 2 in các phần tử (dòng 2 vẫn in dù rỗng).

### Input
- Dòng 1: $n$ ($1 \\le n \\le 10^5$).
- Dòng 2: $n$ số nguyên $1 \\le a_i \\le 10^6$.

### Output
Dòng 1: số lượng. Dòng 2: các phần tử cách nhau dấu cách (bỏ qua nếu không có).""",
    hint="Dùng mảng đếm `cnt[v]` như bài 19. Rồi duyệt `v = 1..max`, nếu `cnt[v] == 1` thì ghi vào mảng kết quả. Mảng này đã theo thứ tự tăng dần sẵn.",
    samples=["6\n1 2 2 3 3 4", "4\n5 5 5 5"],
    tiers=[("n ≤ 100", 6, 50, "", g_freq(100, 100)),
           ("n ≤ 10^4", 5, 25, "", g_freq(10**4, 10**5)),
           ("n ≤ 10^5", 4, 15, "", g_freq(10**5, 10**6))],
    edge=None, solve=sol_unique)


def sol_max2(inp):
    t = inp.split()
    a = list(map(int, t[1:1 + int(t[0])]))
    s = sorted(set(a), reverse=True)
    return str(s[1]) if len(s) >= 2 else "-1"


N21 = dict(id="N21", title="Phần tử lớn thứ hai", difficulty="Trung bình", chapter="ch8",
    statement="""Cho mảng $n$ số nguyên. In ra giá trị **lớn thứ hai** (phân biệt — nếu mảng chỉ có 1 giá trị khác nhau thì in `-1`).

### Input
- Dòng 1: $n$ ($1 \\le n \\le 10^5$).
- Dòng 2: $n$ số nguyên $|a_i| \\le 10^9$.

### Output
Một số: giá trị lớn thứ hai, hoặc `-1`.""",
    hint="Duyệt 1 lần: giữ 2 biến `max1` và `max2`, cập nhật song song. Nhớ chỉ cập nhật `max2` khi phần tử mới KHÁC `max1`.",
    samples=["5\n3 1 4 1 5", "4\n7 7 7 7"],
    tiers=[("n ≤ 100", 6, 50, "", g_sort(100, 100)),
           ("n ≤ 10^4", 5, 25, "", g_sort(10**4, 10**9)),
           ("n ≤ 10^5", 4, 15, "", g_sort(10**5, 10**9))],
    edge=None, solve=sol_max2)


def sol_kth(inp):
    lines = inp.split("\n")
    n, k = map(int, lines[0].split())
    a = sorted(map(int, lines[1].split()))
    return str(a[k - 1])


def g_kth(nmax):
    def g(r):
        n = r.randint(1, nmax); k = r.randint(1, n)
        return f"{n} {k}\n{' '.join(str(r.randint(-10**9, 10**9)) for _ in range(n))}"
    return g


N22 = dict(id="N22", title="Phần tử nhỏ thứ K", difficulty="Trung bình", chapter="ch8",
    statement="""Cho mảng $n$ số nguyên và số nguyên $k$. In ra phần tử **nhỏ thứ $k$** (sau khi sắp xếp tăng dần, phần tử ở vị trí $k$ đếm từ 1).

### Input
- Dòng 1: $n, k$ ($1 \\le k \\le n \\le 10^5$).
- Dòng 2: $n$ số nguyên $|a_i| \\le 10^9$.

### Output
Giá trị nhỏ thứ $k$.""",
    hint="Dễ nhất: sắp xếp mảng rồi in `a[k-1]`. Lớp mới học có thể dùng bubble sort cho `n ≤ 2000`; `n` lớn hơn dùng `qsort`.",
    samples=["5 3\n3 1 4 1 5", "4 1\n9 8 7 6"],
    tiers=[("n ≤ 100", 6, 50, "", g_kth(100)),
           ("n ≤ 2000", 5, 25, "", g_kth(2000)),
           ("n ≤ 10^5", 4, 15, "qsort", g_kth(10**5))],
    edge=None, solve=sol_kth)


def sol_count_x(inp):
    lines = inp.split("\n")
    n = int(lines[0])
    a = list(map(int, lines[1].split()))
    x = int(lines[2])
    return str(a.count(x))


def g_count(nmax):
    def g(r):
        n = r.randint(1, nmax)
        a = [r.randint(1, 10) for _ in range(n)]
        x = r.randint(1, 10)
        return f"{n}\n{' '.join(map(str, a))}\n{x}"
    return g


N23 = dict(id="N23", title="Đếm số lần xuất hiện của X", difficulty="Dễ", chapter="ch8",
    statement="""Cho mảng $n$ số nguyên và số $x$. Đếm xem $x$ xuất hiện mấy lần trong mảng.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 10^5$).
- Dòng 2: $n$ số nguyên $|a_i| \\le 10^9$.
- Dòng 3: $x$ ($|x| \\le 10^9$).

### Output
Số lần xuất hiện.""",
    hint="Vòng for đơn giản: `for i = 0..n-1`, nếu `a[i] == x` thì `cnt++`.",
    samples=["6\n1 2 2 3 2 1\n2"],
    tiers=[("n ≤ 100", 6, 50, "", g_count(100)),
           ("n ≤ 10^4", 5, 25, "", g_count(10**4)),
           ("n ≤ 10^5", 4, 15, "", g_count(10**5))],
    edge=None, solve=sol_count_x)


# ==================== Ch9 — Chuỗi ====================

def sol_norm_name(inp):
    words = inp.split()
    return " ".join(w.capitalize() for w in words)


def g_name(wmax):
    def g(r):
        n = r.randint(1, wmax)
        return "  ".join("".join(r.choice(string.ascii_letters) for _ in range(r.randint(2, 8))) for _ in range(n))
    return g


N24 = dict(id="N24", title="Chuẩn hoá tên người", difficulty="Trung bình", chapter="ch9",
    statement="""Cho một chuỗi là tên người. Tên có thể viết lộn xộn chữ hoa / thường và có **khoảng trắng thừa** (nhiều hơn 1 dấu cách giữa các từ, có thể có dấu cách ở đầu/cuối). Hãy chuẩn hoá: **viết hoa chữ cái đầu mỗi từ, các chữ còn lại viết thường**, giữa các từ chỉ còn 1 dấu cách, không có dấu cách ở đầu/cuối.

### Input
Một dòng chuỗi dài tối đa 1000 ký tự, chỉ gồm chữ cái Latin và dấu cách.

### Output
Chuỗi đã chuẩn hoá.""",
    hint="Dùng `scanf(\"%s\", word)` lặp trong vòng — nó tự bỏ qua khoảng trắng. Với mỗi từ: chữ đầu `toupper`, các chữ sau `tolower`. In cách nhau 1 dấu cách, dòng cuối thêm `\\n`.",
    samples=["  nGUYEn   vAN   a  ", "le THI b", "DINH   quang hung"],
    tiers=[("Tên 1–2 từ, không khoảng trắng thừa", 6, 50, "", g_name(2)),
           ("Tên 3–5 từ, khoảng trắng thừa", 5, 25, "", g_name(5)),
           ("Tên dài, nhiều khoảng trắng ở đầu/cuối", 4, 15, "", lambda r: "   " + g_name(8)(r) + "    ")],
    edge=None, solve=sol_norm_name)


def sol_email(inp):
    words = inp.split()
    first = words[-1].lower()
    initials = "".join(w[0].lower() for w in words[:-1])
    return f"{first}{initials}@sinhvien.edu.vn"


def g_full_name(nmax):
    def g(r):
        n = r.randint(2, nmax)
        return " ".join("".join(r.choice(string.ascii_lowercase) for _ in range(r.randint(2, 6))).capitalize() for _ in range(n))
    return g


N25 = dict(id="N25", title="Tạo email sinh viên", difficulty="Trung bình", chapter="ch9",
    statement="""Mỗi sinh viên có một tài khoản email dạng `tenchinh + chucaidau(ho + dem) + @sinhvien.edu.vn` **viết thường toàn bộ**.

Ví dụ `Nguyen Van An` → `annv@sinhvien.edu.vn`.

### Input
Một dòng chứa họ tên đầy đủ (ít nhất 2 từ, mỗi từ gồm chữ cái Latin, chỉ cách nhau một dấu cách).

### Output
Email đã tạo.""",
    hint="Tách từng từ bằng `scanf(\"%s\")`. Lưu từ cuối là `tenchinh`. Lấy chữ cái đầu các từ trước, ghép vào. Nhớ `tolower` cho toàn bộ.",
    samples=["Nguyen Van An", "Le B", "Dinh Thi Thanh Mai"],
    tiers=[("2 từ (họ + tên)", 6, 50, "", g_full_name(2)),
           ("3 từ (họ + đệm + tên)", 5, 25, "", g_full_name(3)),
           ("4–6 từ (nhiều đệm)", 4, 15, "", g_full_name(6))],
    edge=None, solve=sol_email)


# ==================== Ch10 — Ma trận ====================

def sol_row_sum(inp):
    lines = inp.split("\n")
    n, m = map(int, lines[0].split())
    out = []
    best = (-float("inf"), -1)
    for i in range(n):
        s = sum(map(int, lines[1 + i].split()))
        out.append(str(s))
        if s > best[0]:
            best = (s, i + 1)
    out.append(f"{best[1]} {best[0]}")
    return "\n".join(out)


def g_mat(nmax, vmax):
    def g(r):
        n = r.randint(1, nmax); m = r.randint(1, nmax)
        rows = [" ".join(str(r.randint(-vmax, vmax)) for _ in range(m)) for _ in range(n)]
        return f"{n} {m}\n" + "\n".join(rows)
    return g


N26 = dict(id="N26", title="Tổng từng hàng của ma trận", difficulty="Dễ", chapter="ch10",
    statement="""Cho ma trận $n \\times m$. In ra:
- $n$ dòng: dòng thứ $i$ là **tổng các phần tử của hàng $i$**.
- Dòng cuối: **chỉ số hàng** có tổng lớn nhất và giá trị tổng đó (nếu có nhiều hàng, chọn chỉ số nhỏ nhất).

### Input
- Dòng 1: $n, m$ ($1 \\le n, m \\le 500$).
- $n$ dòng tiếp theo, mỗi dòng $m$ số nguyên $|a_{ij}| \\le 10^4$.

### Output
$n + 1$ dòng theo mô tả trên.""",
    hint="Vòng ngoài `i = 0..n-1`, trong `j = 0..m-1` cộng `a[i][j]` vào `rsum[i]`. Giữ `bestRow` và `bestVal`.",
    samples=["3 3\n1 2 3\n4 5 6\n7 8 9", "2 2\n-1 -2\n-3 -4"],
    tiers=[("n, m ≤ 10", 6, 50, "", g_mat(10, 100)),
           ("n, m ≤ 100", 5, 25, "", g_mat(100, 10**4)),
           ("n, m tới 500", 4, 15, "", g_mat(500, 10**4))],
    edge=None, solve=sol_row_sum)


def sol_transpose(inp):
    lines = inp.split("\n")
    n, m = map(int, lines[0].split())
    a = [list(map(int, lines[1 + i].split())) for i in range(n)]
    out = ["\n".join(" ".join(str(a[i][j]) for i in range(n)) for j in range(m))]
    return out[0]


N27 = dict(id="N27", title="Chuyển vị ma trận", difficulty="Dễ", chapter="ch10",
    statement="""Cho ma trận $A$ kích thước $n \\times m$. In ra ma trận chuyển vị $A^T$ kích thước $m \\times n$ (phần tử ở hàng $i$ cột $j$ của $A$ nằm ở hàng $j$ cột $i$ của $A^T$).

### Input
- Dòng 1: $n, m$ ($1 \\le n, m \\le 500$).
- $n$ dòng tiếp theo, mỗi dòng $m$ số nguyên $|a_{ij}| \\le 10^9$.

### Output
$m$ dòng, mỗi dòng $n$ số, cách nhau dấu cách.""",
    hint="Khai mảng mới `b[505][505]`, gán `b[j][i] = a[i][j]`. In mảng `b` kích thước `m × n`.",
    samples=["2 3\n1 2 3\n4 5 6", "1 1\n7"],
    tiers=[("n, m ≤ 10", 6, 50, "", g_mat(10, 100)),
           ("n, m ≤ 100", 5, 25, "", g_mat(100, 10**6)),
           ("n, m tới 500", 4, 15, "", g_mat(500, 10**9))],
    edge=None, solve=sol_transpose)


def sol_mat_add(inp):
    lines = inp.split("\n")
    n, m = map(int, lines[0].split())
    out = []
    for i in range(n):
        a = list(map(int, lines[1 + i].split()))
        b = list(map(int, lines[1 + n + i].split()))
        out.append(" ".join(str(a[j] + b[j]) for j in range(m)))
    return "\n".join(out)


def g_mat2(nmax, vmax):
    def g(r):
        n = r.randint(1, nmax); m = r.randint(1, nmax)
        rowsA = [" ".join(str(r.randint(-vmax, vmax)) for _ in range(m)) for _ in range(n)]
        rowsB = [" ".join(str(r.randint(-vmax, vmax)) for _ in range(m)) for _ in range(n)]
        return f"{n} {m}\n" + "\n".join(rowsA) + "\n" + "\n".join(rowsB)
    return g


N28 = dict(id="N28", title="Cộng hai ma trận", difficulty="Dễ", chapter="ch10",
    statement="""Cho hai ma trận $A, B$ cùng kích thước $n \\times m$. In ra ma trận tổng $C = A + B$.

### Input
- Dòng 1: $n, m$ ($1 \\le n, m \\le 300$).
- $n$ dòng tiếp theo: ma trận $A$.
- $n$ dòng cuối: ma trận $B$.
- $|a_{ij}|, |b_{ij}| \\le 10^9$.

### Output
$n$ dòng, mỗi dòng $m$ số của ma trận tổng.""",
    hint="Chú ý `long long` cho tổng vì mỗi phần tử tới $10^9$, tổng tới $2 \\cdot 10^9$ vượt `int`.",
    samples=["2 2\n1 2\n3 4\n5 6\n7 8"],
    tiers=[("n, m ≤ 10, |a| ≤ 100", 6, 50, "", g_mat2(10, 100)),
           ("n, m ≤ 100", 5, 25, "", g_mat2(100, 10**6)),
           ("n, m tới 300", 4, 15, "", g_mat2(300, 10**9))],
    edge=None, solve=sol_mat_add)


def sol_diag(inp):
    lines = inp.split("\n")
    n = int(lines[0])
    a = [list(map(int, lines[1 + i].split())) for i in range(n)]
    chinh = sum(a[i][i] for i in range(n))
    phu = sum(a[i][n - 1 - i] for i in range(n))
    return f"{chinh} {phu}"


def g_mat_sq(nmax, vmax):
    def g(r):
        n = r.randint(1, nmax)
        rows = [" ".join(str(r.randint(-vmax, vmax)) for _ in range(n)) for _ in range(n)]
        return f"{n}\n" + "\n".join(rows)
    return g


N29 = dict(id="N29", title="Tổng hai đường chéo", difficulty="Dễ", chapter="ch10",
    statement="""Cho ma trận vuông $n \\times n$. In ra **tổng các phần tử trên đường chéo chính** (các ô $(i, i)$) và **tổng trên đường chéo phụ** (các ô $(i, n-1-i)$), cách nhau một dấu cách.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 500$).
- $n$ dòng ma trận, phần tử nguyên $|a_{ij}| \\le 10^6$.

### Output
Hai số nguyên trên một dòng.""",
    hint="Một vòng `for i = 0..n-1` cộng cả `a[i][i]` vào `chinh` và `a[i][n-1-i]` vào `phu`. Dùng `long long`.",
    samples=["3\n1 2 3\n4 5 6\n7 8 9", "1\n7"],
    tiers=[("n ≤ 10", 6, 50, "", g_mat_sq(10, 100)),
           ("n ≤ 100", 5, 25, "", g_mat_sq(100, 10**6)),
           ("n tới 500", 4, 15, "", g_mat_sq(500, 10**6))],
    edge=None, solve=sol_diag)


# ==================== Ch12 — Struct ====================

def sol_frac_reduce(inp):
    t, m = map(int, inp.split())
    g = gcd(abs(t), abs(m))
    if m < 0:
        t, m = -t, -m
    return f"{t // g}/{m // g}"


def g_frac(vmax):
    def g(r):
        t = r.randint(-vmax, vmax); m = r.randint(1, vmax) * r.choice([-1, 1])
        return f"{t} {m}"
    return g


N30 = dict(id="N30", title="Rút gọn phân số", difficulty="Dễ", chapter="ch12",
    statement="""Cho phân số $\\dfrac{t}{m}$ ($m \\ne 0$). Hãy rút gọn và in dưới dạng `t/m` sao cho mẫu luôn dương và $\\gcd(|t|, m) = 1$.

### Input
Một dòng chứa hai số nguyên $t, m$ ($|t| \\le 10^9$, $1 \\le |m| \\le 10^9$).

### Output
Phân số đã rút gọn dạng `t/m`.""",
    hint="Tính $g = \\gcd(|t|, |m|)$ bằng Euclid. Chia cả tử lẫn mẫu cho $g$. Nếu mẫu âm thì nhân cả hai với $-1$.",
    samples=["6 8", "-10 4", "5 -3"],
    tiers=[("|t|, |m| ≤ 100", 6, 50, "", g_frac(100)),
           ("|t|, |m| ≤ 10^5", 5, 25, "", g_frac(10**5)),
           ("|t|, |m| ≤ 10^9", 4, 15, "", g_frac(10**9))],
    edge=None, solve=sol_frac_reduce)


def sol_frac_add(inp):
    a, b, c, d = map(int, inp.split())
    t = a * d + c * b
    m = b * d
    g = gcd(abs(t), abs(m)) if t else abs(m)
    if m < 0:
        t, m = -t, -m
    return f"{t // g}/{m // g}"


def g_frac_pair(vmax):
    def g(r):
        return f"{r.randint(-vmax, vmax)} {r.randint(1, vmax)} {r.randint(-vmax, vmax)} {r.randint(1, vmax)}"
    return g


N31 = dict(id="N31", title="Cộng hai phân số", difficulty="Trung bình", chapter="ch12",
    statement="""Cho hai phân số $\\dfrac{a}{b}$ và $\\dfrac{c}{d}$. Tính tổng và in ra dạng rút gọn `t/m` (mẫu dương).

### Input
Một dòng chứa 4 số nguyên $a, b, c, d$ ($|a|, |c| \\le 10^4$, $1 \\le b, d \\le 10^4$).

### Output
Phân số kết quả dạng `t/m` (đã rút gọn).""",
    hint="Tử mới $= a \\cdot d + c \\cdot b$, mẫu mới $= b \\cdot d$. Rồi rút gọn bằng gcd. Lưu ý mỗi phép nhân có thể tới $10^8$ (vừa `int`), nhưng tổng và mẫu tới $10^{12}$ — cần `long long` cho an toàn.",
    samples=["1 2 1 3", "2 5 3 10", "-1 4 1 4"],
    tiers=[("|a|, |c| ≤ 10", 6, 50, "", g_frac_pair(10)),
           ("|a|, |c| ≤ 100", 5, 25, "", g_frac_pair(100)),
           ("|a|, |c| ≤ 10^4", 4, 15, "", g_frac_pair(10**4))],
    edge=None, solve=sol_frac_add)


def sol_dist(inp):
    x1, y1, x2, y2 = map(int, inp.split())
    d2 = (x1 - x2) ** 2 + (y1 - y2) ** 2
    return f"{math.sqrt(d2):.3f}"


def g_pts(vmax):
    def g(r):
        return f"{r.randint(-vmax, vmax)} {r.randint(-vmax, vmax)} {r.randint(-vmax, vmax)} {r.randint(-vmax, vmax)}"
    return g


N32 = dict(id="N32", title="Khoảng cách hai điểm Oxy", difficulty="Dễ", chapter="ch12",
    statement="""Cho tọa độ nguyên hai điểm $A(x_1, y_1)$ và $B(x_2, y_2)$. In **khoảng cách** $AB = \\sqrt{(x_1-x_2)^2 + (y_1-y_2)^2}$, làm tròn **3 chữ số thập phân**.

### Input
Một dòng chứa 4 số nguyên $x_1, y_1, x_2, y_2$, trị tuyệt đối không quá $10^4$.

### Output
Khoảng cách làm tròn 3 chữ số thập phân.""",
    hint="`double d = sqrt((double)((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2)));`. In `%.3f`. Nhớ `<math.h>`.",
    samples=["0 0 3 4", "1 1 1 1", "-5 -5 5 5"],
    tiers=[("Toạ độ |x|, |y| ≤ 10", 6, 50, "", g_pts(10)),
           ("|x|, |y| ≤ 1000", 5, 25, "", g_pts(1000)),
           ("|x|, |y| ≤ 10^4", 4, 15, "", g_pts(10**4))],
    edge=None, solve=sol_dist)


def sol_rank(inp):
    lines = inp.strip("\n").split("\n")
    n = int(lines[0])
    rows = []
    for ln in lines[1:1 + n]:
        parts = ln.rsplit(" ", 3)
        name = parts[0]
        t, l, h = float(parts[1]), float(parts[2]), float(parts[3])
        avg = (t + l + h) / 3
        rows.append((name, avg))
    rows.sort(key=lambda x: (-x[1], x[0]))
    return "\n".join(f"{r[0]} {r[1]:.2f}" for r in rows)


def g_sv(nmax):
    def g(r):
        n = r.randint(1, nmax)
        lines = [str(n)]
        for _ in range(n):
            name = "".join(r.choice(string.ascii_uppercase) for _ in range(r.randint(2, 8)))
            lines.append(f"{name} {r.randint(0, 10)} {r.randint(0, 10)} {r.randint(0, 10)}")
        return "\n".join(lines)
    return g


N33 = dict(id="N33", title="Xếp hạng sinh viên theo điểm trung bình", difficulty="Trung bình", chapter="ch12",
    statement="""Cho danh sách $n$ sinh viên: tên (chữ cái Latin, không khoảng trắng, tối đa 20 ký tự), điểm Toán, Lý, Hoá (số nguyên 0–10). Sắp xếp theo **điểm trung bình giảm dần**; nếu trùng điểm thì sắp theo tên **tăng dần theo thứ tự từ điển**.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 1000$).
- $n$ dòng tiếp theo: tên và 3 điểm.

### Output
$n$ dòng, mỗi dòng tên và điểm trung bình làm tròn 2 chữ số thập phân.""",
    hint="Khai `struct SV { char name[25]; int t, l, h; double avg; };`. Nhập vào mảng, duyệt tính `avg`. "
         "Sắp xếp bằng `qsort` với hàm so sánh: trước theo `-avg`, sau theo `strcmp(a.name, b.name)`.",
    samples=["3\nAn 8 7 9\nBinh 9 8 8\nCuong 8 7 9"],
    tiers=[("n ≤ 10", 6, 50, "Bubble sort ổn", g_sv(10)),
           ("n ≤ 100", 5, 25, "", g_sv(100)),
           ("n ≤ 1000", 4, 15, "qsort nhanh hơn", g_sv(1000))],
    edge=None, solve=sol_rank)


# ==================== Ch13 — Ôn tổng hợp ====================

def sol_salary(inp):
    lines = inp.split("\n")
    n = int(lines[0])
    out = []
    total = 0
    for ln in lines[1:1 + n]:
        parts = ln.rsplit(" ", 2)
        name = parts[0]
        base, days = int(parts[1]), int(parts[2])
        bonus = (days - 22) * 50000 if days > 22 else 0
        sal = base + bonus
        total += sal
        out.append(f"{name} {sal}")
    out.append(str(total))
    return "\n".join(out)


def g_salary(nmax):
    def g(r):
        n = r.randint(1, nmax)
        lines = [str(n)]
        for _ in range(n):
            name = "".join(r.choice(string.ascii_uppercase) for _ in range(r.randint(2, 8)))
            lines.append(f"{name} {r.randint(1000000, 20000000)} {r.randint(15, 30)}")
        return "\n".join(lines)
    return g


N34 = dict(id="N34", title="Tính lương nhân viên", difficulty="Khó", chapter="ch13",
    statement="""Cho danh sách $n$ nhân viên: **tên** (không khoảng trắng, tối đa 20 ký tự), **lương cơ bản** (đồng, số nguyên), **số ngày công**. Quy định:
- Nếu số ngày công vượt 22 ngày, mỗi ngày vượt được thưởng 50 000 đồng.
- Nếu không vượt, không có thưởng.

Hãy in lương từng người (tên, lương thực nhận) và dòng cuối là **tổng lương** toàn công ty.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 10^4$).
- $n$ dòng: tên, lương cơ bản ($10^6 \\le$ lương $\\le 2 \\cdot 10^7$), số ngày (từ 15 đến 30).

### Output
$n$ dòng: `ten luong_moi`. Dòng cuối: tổng lương (có thể tới $2 \\cdot 10^{11}$).""",
    hint="Dùng `struct { char name[25]; long long salary; int days; };`. Tính thưởng = $(days - 22) \\cdot 50000$ nếu $days > 22$. Dùng `long long` cho lương và tổng.",
    samples=["2\nAn 10000000 25\nBinh 8000000 20"],
    tiers=[("n ≤ 10", 6, 50, "", g_salary(10)),
           ("n ≤ 1000", 5, 25, "", g_salary(1000)),
           ("n ≤ 10^4", 4, 15, "", g_salary(10**4))],
    edge=None, solve=sol_salary)


def sol_atbt(inp):
    lines = inp.strip().split("\n")
    n = int(lines[0])
    out = []
    for i in range(1, n + 1):
        a = list(map(int, lines[i].split()))
        if not a:
            out.append("0")
            continue
        mx = max(a)
        mn = min(a)
        out.append(f"{sum(a)} {mx - mn}")
    return "\n".join(out)


def g_atbt(nmax, lmax):
    def g(r):
        n = r.randint(1, nmax)
        lines = [str(n)]
        for _ in range(n):
            l = r.randint(1, lmax)
            lines.append(" ".join(str(r.randint(-100, 100)) for _ in range(l)))
        return "\n".join(lines)
    return g


N35 = dict(id="N35", title="Xử lý N mảng số", difficulty="Trung bình", chapter="ch13",
    statement="""Cho $n$ mảng số nguyên, mỗi mảng trên một dòng (các số cách nhau một dấu cách). Mỗi mảng có 1 tới 100 phần tử.

Với mỗi mảng, hãy in trên một dòng: **tổng mảng** và **hiệu giữa phần tử lớn nhất và nhỏ nhất**, cách nhau một dấu cách.

### Input
- Dòng 1: $n$ ($1 \\le n \\le 100$).
- $n$ dòng tiếp: các mảng.

### Output
$n$ dòng kết quả.""",
    hint="Dùng `fgets` để đọc từng dòng, rồi `sscanf` trong vòng để tách các số. Hoặc đơn giản hơn: nhớ số lượng từng mảng khó đoán → dùng `fgets` + `strtok`.",
    samples=["3\n1 2 3 4 5\n7 7 7\n-5 10 -3"],
    tiers=[("n ≤ 5, mảng nhỏ", 6, 50, "", g_atbt(5, 10)),
           ("n ≤ 50, mảng ≤ 50", 5, 25, "", g_atbt(50, 50)),
           ("n ≤ 100, mảng ≤ 100", 4, 15, "", g_atbt(100, 100))],
    edge=None, solve=sol_atbt)


def sol_scoreboard(inp):
    lines = inp.strip().split("\n")
    n, m = map(int, lines[0].split())
    out = []
    rows = []
    for i in range(1, n + 1):
        parts = lines[i].rsplit(" ", m)
        name = parts[0]
        scores = list(map(int, parts[1:1 + m]))
        total = sum(scores)
        pass_count = sum(1 for s in scores if s >= 50)
        rows.append((name, total, pass_count))
        out.append(f"{name} {total} {pass_count}")
    rows.sort(key=lambda x: (-x[1], -x[2], x[0]))
    out.append(rows[0][0])
    return "\n".join(out)


def g_score(nmax, mmax):
    def g(r):
        n = r.randint(1, nmax); m = r.randint(1, mmax)
        lines = [f"{n} {m}"]
        for _ in range(n):
            name = "".join(r.choice(string.ascii_uppercase) for _ in range(r.randint(2, 8)))
            lines.append(f"{name} " + " ".join(str(r.randint(0, 100)) for _ in range(m)))
        return "\n".join(lines)
    return g


N36 = dict(id="N36", title="Bảng điểm lớp học", difficulty="Khó", chapter="ch13",
    statement="""Lớp có $n$ sinh viên, mỗi sinh viên có $m$ môn học, điểm từ 0 tới 100. Môn **đậu** nếu điểm ≥ 50.

Với mỗi sinh viên in trên một dòng: **tên**, **tổng điểm**, **số môn đậu**. Sau cùng in **tên sinh viên có tổng điểm cao nhất**; nếu trùng tổng điểm, chọn người có nhiều môn đậu hơn; nếu vẫn trùng, chọn người có tên nhỏ nhất theo thứ tự từ điển.

### Input
- Dòng 1: $n, m$ ($1 \\le n \\le 500$, $1 \\le m \\le 10$).
- $n$ dòng tiếp theo: tên và $m$ điểm.

### Output
$n$ dòng kết quả theo thứ tự đã nhập, sau cùng là tên người đứng đầu.""",
    hint="`struct SV { char name[25]; int total, pass; };`. Vòng ngoài duyệt sinh viên, trong duyệt môn, cộng tổng và đếm số đậu. "
         "Để tìm người đứng đầu dùng vòng for giữ `best` thỏa 3 tiêu chí (hoặc dùng `qsort` sau khi đã in theo thứ tự nhập).",
    samples=["2 3\nAn 60 70 80\nBinh 90 40 50"],
    tiers=[("n ≤ 5, m ≤ 3", 6, 50, "", g_score(5, 3)),
           ("n ≤ 50, m ≤ 5", 5, 25, "", g_score(50, 5)),
           ("n ≤ 500, m ≤ 10", 4, 15, "", g_score(500, 10))],
    edge=None, solve=sol_scoreboard)


def sol_calendar(inp):
    d, m, y = map(int, inp.split())
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    leap = (y % 400 == 0) or (y % 4 == 0 and y % 100 != 0)
    if leap:
        days_in_month[1] = 29
    d += 1
    if d > days_in_month[m - 1]:
        d = 1
        m += 1
        if m > 12:
            m = 1
            y += 1
    return f"{d:02d}/{m:02d}/{y}"


def g_cal(ymin, ymax):
    def g(r):
        y = r.randint(ymin, ymax)
        m = r.randint(1, 12)
        if m == 2:
            leap = (y % 400 == 0) or (y % 4 == 0 and y % 100 != 0)
            d = r.randint(1, 29 if leap else 28)
        elif m in (4, 6, 9, 11):
            d = r.randint(1, 30)
        else:
            d = r.randint(1, 31)
        return f"{d} {m} {y}"
    return g


N37 = dict(id="N37", title="Ngày hôm sau", difficulty="Trung bình", chapter="ch13",
    statement="""Cho một ngày hợp lệ (ngày, tháng, năm). Hãy in ra **ngày của hôm sau** theo định dạng `dd/mm/yyyy` (ngày và tháng luôn 2 chữ số).

### Input
Một dòng gồm ba số nguyên: $d, m, y$ ($1 \\le d$, $1 \\le m \\le 12$, $1 \\le y \\le 9999$), đảm bảo là ngày hợp lệ.

### Output
Ngày hôm sau theo định dạng `dd/mm/yyyy`.""",
    hint="Khai mảng `int days[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};`. "
         "Nếu tháng 2 và năm nhuận thì `days[1] = 29`. Năm nhuận: chia hết cho 400, hoặc chia hết cho 4 nhưng không chia hết cho 100. "
         "Tăng `d`. Nếu `d > days[m-1]` thì về 1 và tăng `m`. Nếu `m > 12` thì về 1 và tăng `y`. In với `%02d/%02d/%d`.",
    samples=["31 12 2024", "28 2 2024", "28 2 2025"],
    tiers=[("Ngày thường (không cuối tháng)", 6, 50, "", g_cal(2020, 2025)),
           ("Cuối tháng, cuối năm", 5, 25, "Tháng chuyển, năm chuyển", lambda r: r.choice(["31 12 2024", "30 11 2024", "29 2 2024", "28 2 2025", "31 1 2024", "31 3 2024"])),
           ("Năm nhuận biên (00, 400)", 4, 15, "", lambda r: r.choice(["28 2 2000", "29 2 2000", "28 2 2100", "28 2 2400", "29 2 2400", "28 2 1900"]))],
    edge=None, solve=sol_calendar)


PROBLEMS = [N01, N02, N03, N04, N05, N06, N07, N08, N09, N10, N11, N12, N13, N14, N15,
            N16, N17, N18, N19, N20, N21, N22, N23, N24, N25, N26, N27, N28, N29,
            N30, N31, N32, N33, N34, N35, N36, N37]


def build(p):
    r = seed(p["id"])
    inputs = list(p["samples"]); seen = set(x.strip() for x in inputs)
    groups = [("Ví dụ trong đề", 1, len(inputs), 10, "Đúng ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng")]
    for name, count, points, note, gen in p.get("tiers", []):
        start = len(inputs) + 1
        tries = 0
        while len(inputs) - start + 1 < count:
            tries += 1
            inp = gen(r)
            if inp.strip() in seen and tries < 500:
                continue
            seen.add(inp.strip()); inputs.append(inp)
            if tries > 2000:
                break
        groups.append((name, start, len(inputs), points, note))
    if p.get("edge"):
        edge_name, edge_points, edge_inputs = p["edge"]
        start = len(inputs) + 1
        for x in edge_inputs:
            if x.strip() not in seen:
                seen.add(x.strip()); inputs.append(x)
        groups.append(("Trường hợp đặc biệt", start, len(inputs), edge_points, edge_name))

    if not p.get("tiers") and not p.get("edge"):
        groups = [("Ví dụ trong đề", 1, len(inputs), 100, "Chỉ cần in đúng")]

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
    samples = ",".join(str(i) for i in range(1, len(p["samples"]) + 1))
    time_ms = p.get("time_ms", 1000)
    write(os.path.join(base, "problem.txt"),
          f"title={p['title']}\ntime_ms={time_ms}\nmemory_mb=256\ntests={len(inputs)}\ndifficulty={p['difficulty']}\nsamples={samples}")
    write(os.path.join(base, "statement.md"), p["statement"])
    write(os.path.join(base, "hint.md"), p["hint"])
    return len(inputs), len(groups)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    for p in PROBLEMS:
        if not only or p["id"] in only:
            n, s = build(p)
            print(f"{p['id']} {p['title']}: {n} test, {s} subtask")
