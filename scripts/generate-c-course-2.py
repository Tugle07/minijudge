"""Sinh bộ bài C nâng cao (C23-C34). Ý tưởng thuật toán tham khảo các dạng bài phổ biến
(trong đó có danh mục của oj.28tech.com.vn), đề/ràng buộc/test/lời giải do nhóm tự soạn và biến đổi.

Chạy:  python scripts/generate-c-course-2.py [C23 C24 ...]
"""
import importlib.util
import os
import re
import sys
from collections import Counter
from math import gcd, isqrt

_spec = importlib.util.spec_from_file_location("gen", os.path.join(os.path.dirname(os.path.abspath(__file__)), "generate-problems.py"))
gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gen)
MOD = 10**9 + 7


def ints(inp):
    return list(map(int, inp.split()))


def sol_pair_mod(inp):
    t = ints(inp)
    n, k = t[0], t[1]
    cnt = Counter(x % k for x in t[2:2 + n])
    res = 0
    for r, c in cnt.items():
        s = (k - r) % k
        if r < s:
            res += c * cnt.get(s, 0)
        elif r == s:
            res += c * (c - 1) // 2
    return str(res)


def sol_pair_diff(inp):
    t = ints(inp)
    n, k = t[0], t[1]
    cnt = Counter(t[2:2 + n])
    if k == 0:
        return str(sum(c * (c - 1) // 2 for c in cnt.values()))
    return str(sum(c * cnt.get(x + k, 0) for x, c in cnt.items()))


def sol_far_pair(inp):
    t = ints(inp)
    first, best = {}, None
    for i, x in enumerate(t[1:1 + t[0]]):
        if x not in first:
            first[x] = i
        else:
            d = i - first[x]
            if best is None or d > best[0] or (d == best[0] and x < best[1]):
                best = (d, x)
    return "-1" if best is None else f"{best[0]} {best[1]}"


def sol_zeros(inp):
    t = ints(inp)
    c2 = c5 = 0
    for x in t[1:1 + t[0]]:
        while x % 2 == 0:
            x //= 2; c2 += 1
        while x % 5 == 0:
            x //= 5; c5 += 1
    return str(min(c2, c5))


def sol_fact_pow(inp):
    n, k = ints(inp)
    res, p = None, 2
    while k > 1:
        if p * p > k:
            p = k
        e = 0
        while k % p == 0:
            k //= p; e += 1
        if e:
            m, c = n, 0
            while m:
                m //= p; c += m
            res = c // e if res is None else min(res, c // e)
        p += 1
    return str(res)


def sol_wait(inp):
    t = ints(inp)
    a = t[1:1 + t[0]]
    res, st = [0] * len(a), []
    for i, x in enumerate(a):
        while st and a[st[-1]] < x:
            j = st.pop(); res[j] = i - j
        st.append(i)
    return " ".join(map(str, res))


def sol_rle(inp):
    s = inp.split()[0]
    return "".join(m.group(1) + (str(len(m.group(0))) if len(m.group(0)) > 1 else "") for m in re.finditer(r"(.)\1*", s))


def sol_balance(inp):
    t = ints(inp)
    a = t[1:1 + t[0]]
    total, left, res = sum(a), 0, []
    for i, x in enumerate(a):
        if left == total - left - x:
            res.append(str(i + 1))
        left += x
    return " ".join(res) if res else "NONE"


def sol_pow_sum(inp):
    t = ints(inp)
    return str(sum(pow(t[1 + 2 * i], t[2 + 2 * i], MOD) for i in range(t[0])) % MOD)


def sol_coprime_run(inp):
    t = ints(inp)
    a = t[1:1 + t[0]]
    res = cur = 1
    for i in range(1, len(a)):
        cur = cur + 1 if gcd(a[i], a[i - 1]) == 1 else 1
        res = max(res, cur)
    return str(res)


def sol_words(inp):
    words = re.findall(r"[a-z]+", inp.lower())
    cnt = Counter(words)
    seen, out = set(), []
    for w in words:
        if w not in seen:
            seen.add(w); out.append(f"{w} {cnt[w]}")
    return "\n".join(out)


def sol_square_pairs(inp):
    t = ints(inp)
    a = t[1:1 + t[0]]
    res = 0
    for i in range(len(a)):
        for j in range(i + 1, len(a)):
            s = a[i] + a[j]
            r = isqrt(s)
            res += r * r == s
    return str(res)


def g_arr(n_small, n_big, lo, hi, head=""):
    def g(r, big):
        n = n_big if big else r.randint(1, n_small)
        return f"{n}{head(r, big) if head else ''}\n{gen.g_list(r, n, lo(big) if callable(lo) else lo, hi(big) if callable(hi) else hi)}"
    return g


def g_pair_mod(r, big):
    n = 200000 if big else r.randint(1, 10)
    k = r.randint(1, 100000) if big else r.randint(1, 6)
    return f"{n} {k}\n{gen.g_list(r, n, -10**9 if big else -15, 10**9 if big else 15)}"


def g_pair_diff(r, big):
    n = 200000 if big else r.randint(1, 10)
    hi = 1000 if big else 8
    k = r.randint(0, 5 if big else 3)
    return f"{n} {k}\n{gen.g_list(r, n, 0, hi)}" if r.random() < 0.8 or big else f"{n} {r.randint(0, 10**9)}\n{gen.g_list(r, n, 0, 10**9)}"


def g_zeros(r, big):
    n = 100000 if big else r.randint(1, 8)
    vals = []
    for _ in range(n):
        x = r.choice([2, 4, 5, 25, 10, 3, 7, 1000, 2**r.randint(0, 59), 5**r.randint(0, 25), r.randint(1, 10**18 if big else 100)])
        vals.append(str(x))
    return f"{n}\n{' '.join(vals)}"


def g_fact_pow(r, big):
    if big:
        return f"{10**18} {r.choice([999983, 720720, 2**19, 1000000, 999999])}"
    return f"{r.randint(1, 100)} {r.randint(2, 60)}"


def g_rle(r, big):
    n = 100000 if big else r.randint(1, 15)
    s, alpha = [], "abcdefghijklmnopqrstuvwxyz" if big else "abc"
    while len(s) < n:
        s += [r.choice(alpha)] * r.randint(1, 30 if big else 4)
    return "".join(s[:n])


def g_balance(r, big):
    n = 200000 if big else r.randint(1, 9)
    if not big and r.random() < 0.5:
        a = [r.randint(-3, 3) for _ in range(n)]
    else:
        a = [r.randint(-10**9, 10**9) for _ in range(n)]
        if n >= 3:
            m = r.randint(1, n - 2)
            diff = sum(a[:m]) - sum(a[m + 1:])
            a[-1] += diff
            if abs(a[-1]) > 10**9:
                a[-1] = r.randint(-10**9, 10**9)
    return f"{n}\n{' '.join(map(str, a))}"


def g_pow_sum(r, big):
    n = 100000 if big else r.randint(1, 5)
    rows = [f"{r.randint(0, 10**9 if big else 10)} {r.randint(1, 10**18 if big else 6)}" for _ in range(n)]
    return f"{n}\n" + "\n".join(rows)


def g_coprime(r, big):
    n = 200000 if big else r.randint(1, 12)
    return f"{n}\n{gen.g_list(r, n, 1, 10**9 if big else 12)}"


WORDS = ["hoc", "Lap", "trinh", "C", "vui", "UTC", "code", "bug", "AC", "WA"]


def g_text(r, big):
    k = 1200 if big else r.randint(1, 10)
    parts = []
    for i in range(k):
        parts.append(r.choice(WORDS))
        parts.append(r.choice([" ", "  ", ", ", ". ", "!", "? ", ";", ":", " - "]))
    return "".join(parts).strip() or "a"


def g_squares(r, big):
    n = 2000 if big else r.randint(1, 10)
    if big:
        sq = [x * x for x in range(1, 44721)]
        a = []
        for _ in range(n):
            a.append(r.randint(0, 10**9) if r.random() < 0.5 else max(0, min(10**9, r.choice(sq) - r.randint(0, 1000))))
        return f"{n}\n{' '.join(map(str, a))}"
    return f"{n}\n{gen.g_list(r, n, 0, 30)}"


PROBLEMS = [
    dict(id="C23", set="c6", title="Ghép cặp chia hết", difficulty="Trung bình", solve=sol_pair_mod, gen=g_pair_mod,
         samples=["5 4\n1 3 2 6 -2", "3 1\n5 -7 9"],
         statement=r"""Lớp có $n$ bạn, bạn thứ $i$ có điểm rèn luyện $a_i$ (có thể âm). Thầy muốn chọn **hai bạn khác nhau** sao cho tổng điểm của họ chia hết cho $K$. Hỏi có bao nhiêu cách chọn?

### Input
- Dòng 1: $n, K$ ($1 \le n \le 2 \cdot 10^5$, $1 \le K \le 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($|a_i| \le 10^9$).

### Output
In ra số cặp $(i, j)$ với $i < j$ thỏa mãn.""",
         hint=r"Chỉ số dư khi chia cho $K$ là quan trọng: đếm `cnt[r]`. Dư $r$ ghép với dư $(K - r) \bmod K$. Trong C, `-7 % 4 == -3` — chuẩn hóa `r = ((x % K) + K) % K`. Kết quả tới $2 \cdot 10^{10}$: dùng `long long`."),
    dict(id="C24", set="c6", title="Chênh lệch đúng K", difficulty="Trung bình", solve=sol_pair_diff, gen=g_pair_diff,
         samples=["6 2\n1 3 3 2 4 4", "4 0\n7 7 7 1"],
         statement=r"""Cho dãy $n$ số nguyên không âm và số $K$. Đếm số cặp chỉ số $i < j$ sao cho $|a_i - a_j| = K$.

### Input
- Dòng 1: $n, K$ ($1 \le n \le 2 \cdot 10^5$, $0 \le K \le 10^9$).
- Dòng 2: $n$ số nguyên $a_i$ ($0 \le a_i \le 10^9$).

### Output
In ra số cặp thỏa mãn.""",
         hint=r"Hai vòng lặp mất $n^2/2 = 2 \cdot 10^{10}$ phép → TLE. Sắp xếp dãy (`qsort`), rồi với mỗi giá trị đếm số lần xuất hiện của giá trị $+K$ bằng **tìm kiếm nhị phân** hoặc **hai con trỏ**. Trường hợp $K = 0$ xử lý riêng."),
    dict(id="C25", set="c6", title="Hai lần gặp lại", difficulty="Trung bình", solve=sol_far_pair,
         gen=g_arr(12, 200000, 1, lambda big: 10**9 if big else 6),
         samples=["7\n4 2 9 2 4 7 2", "3\n1 2 3"],
         statement=r"""Mỗi ngày bạn ghi lại mã số của một người bạn gặp. Hãy tìm hai ngày $i < j$ gặp **cùng một người** sao cho khoảng cách $j - i$ lớn nhất. Nếu có nhiều người cùng đạt khoảng cách lớn nhất, chọn người có mã số **nhỏ nhất**.

### Input
- Dòng 1: $n$ ($1 \le n \le 2 \cdot 10^5$).
- Dòng 2: $n$ mã số $a_i$ ($1 \le a_i \le 10^9$).

### Output
In hai số: khoảng cách lớn nhất và mã số người đó. Nếu không ai xuất hiện hai lần, in $-1$.""",
         hint=r"Với mỗi mã số chỉ cần lần xuất hiện **đầu tiên** và **cuối cùng**. Mã số tới $10^9$ nên không dùng được mảng đánh dấu — tạo mảng cặp `(giá trị, vị trí)` rồi sắp xếp, các phần tử cùng giá trị sẽ đứng liền nhau."),
    dict(id="C26", set="c7", title="Số 0 tận cùng của tích", difficulty="Dễ", solve=sol_zeros, gen=g_zeros,
         samples=["6\n2 5 10 3 1 2", "3\n1000000000000000000 25 7"],
         statement=r"""Cho $n$ số nguyên dương. Gọi $P$ là tích của tất cả các số. Hỏi $P$ có bao nhiêu chữ số $0$ liên tiếp ở tận cùng?

### Input
- Dòng 1: $n$ ($1 \le n \le 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($1 \le a_i \le 10^{18}$).

### Output
In ra số chữ số $0$ tận cùng của $P$.""",
         hint=r"$P$ quá lớn để tính trực tiếp. Mỗi số $0$ tận cùng ứng với một cặp thừa số $2 \times 5$: đếm tổng số mũ của $2$ và của $5$ trong mọi $a_i$, đáp án là số nhỏ hơn. Đọc $a_i$ bằng `%lld`."),
    dict(id="C27", set="c7", title="Lũy thừa chia hết giai thừa", difficulty="Khó", solve=sol_fact_pow, gen=g_fact_pow,
         samples=["10 3", "10 12", "5 7"],
         statement=r"""Cho $N$ và $k$. Tìm số nguyên $x$ lớn nhất sao cho $N!$ chia hết cho $k^x$.

### Input
Hai số nguyên $N, k$ ($1 \le N \le 10^{18}$, $2 \le k \le 10^6$).

### Output
In ra $x$.""",
         hint=r"Với $p$ nguyên tố, số mũ của $p$ trong $N!$ là $\lfloor N/p \rfloor + \lfloor N/p^2 \rfloor + \ldots$ (công thức Legendre — chia $N$ cho $p$ liên tục để tránh tràn số). Phân tích $k = \prod p^{e}$, đáp án là $\min \lfloor \text{mũ}_p(N!) / e \rfloor$."),
    dict(id="C28", set="c6", title="Đợi ngày nóng hơn", difficulty="Khó", solve=sol_wait,
         gen=g_arr(12, 200000, 1, lambda big: 10**9 if big else 9),
         samples=["8\n30 32 31 29 33 33 28 35", "3\n5 4 3"],
         statement=r"""Cho nhiệt độ của $n$ ngày liên tiếp. Với mỗi ngày, hãy cho biết phải đợi thêm bao nhiêu ngày nữa mới có một ngày **nóng hơn hẳn**. Nếu không có ngày nào như vậy, in $0$.

### Input
- Dòng 1: $n$ ($1 \le n \le 2 \cdot 10^5$).
- Dòng 2: $n$ số nguyên $t_i$ ($1 \le t_i \le 10^9$).

### Output
In $n$ số trên một dòng.""",
         hint=r"Cách thử từng ngày phía sau là $O(n^2)$ → TLE với dãy giảm dần. Dùng **ngăn xếp** (mảng + biến đỉnh) chứa chỉ số các ngày chưa có đáp án: khi gặp ngày $i$, lấy ra mọi ngày ở đỉnh có nhiệt độ nhỏ hơn $t_i$ và gán đáp án cho chúng. Mỗi chỉ số vào/ra ngăn xếp đúng một lần."),
    dict(id="C29", set="c7", title="Nén xâu", difficulty="Dễ", solve=sol_rle, gen=g_rle,
         samples=["aaabccdddd", "abc", "zzzzzzzzzzzz"],
         statement=r"""Nén xâu bằng cách thay mỗi đoạn ký tự giống nhau liên tiếp bằng ký tự đó kèm số lần lặp. Nếu ký tự chỉ xuất hiện một lần trong đoạn thì **không ghi số**. Ví dụ `aaabccdddd` → `a3bc2d4`.

### Input
Một xâu gồm chữ cái thường, độ dài từ $1$ đến $10^5$.

### Output
In ra xâu sau khi nén.""",
         hint="Duyệt với chỉ số `i`, dùng `j` chạy tới hết đoạn giống `s[i]`; in `s[i]`, nếu `j - i > 1` thì in thêm `j - i`, rồi gán `i = j`."),
    dict(id="C30", set="c6", title="Điểm cân bằng", difficulty="Trung bình", solve=sol_balance, gen=g_balance,
         samples=["7\n1 7 3 6 5 6 0", "3\n1 2 3", "1\n5"],
         statement=r"""Vị trí $i$ của dãy gọi là **điểm cân bằng** nếu tổng các phần tử bên trái $i$ bằng tổng các phần tử bên phải $i$ (tổng rỗng bằng $0$). Liệt kê mọi điểm cân bằng.

### Input
- Dòng 1: $n$ ($1 \le n \le 2 \cdot 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($|a_i| \le 10^9$).

### Output
In các vị trí (đánh số từ $1$) tăng dần trên một dòng, hoặc `NONE` nếu không có.""",
         hint=r"Tính `total` một lần. Duyệt từ trái, giữ `left` là tổng bên trái: tổng bên phải là `total - left - a[i]`. Tổng tới $2 \cdot 10^{14}$ — dùng `long long`."),
    dict(id="C31", set="c7", title="Tổng lũy thừa", difficulty="Khó", solve=sol_pow_sum, gen=g_pow_sum,
         samples=["3\n2 10\n3 2\n10 1", "1\n1000000000 1000000000000000000"],
         statement=r"""Cho $n$ cặp số $(a_i, b_i)$. Tính $S = (a_1^{b_1} + a_2^{b_2} + \ldots + a_n^{b_n}) \bmod (10^9 + 7)$.

### Input
- Dòng 1: $n$ ($1 \le n \le 10^5$).
- $n$ dòng sau, mỗi dòng $a_i, b_i$ ($0 \le a_i \le 10^9$, $1 \le b_i \le 10^{18}$).

### Output
In ra $S$.""",
         hint=r"Không thể nhân $b_i$ lần. **Lũy thừa nhanh**: $a^b = (a^{b/2})^2$ (nhân thêm $a$ nếu $b$ lẻ), chỉ mất khoảng $60$ bước. Lấy dư sau mỗi phép nhân; tích hai số $< 10^9+7$ vừa `long long`."),
    dict(id="C32", set="c6", title="Đoạn nguyên tố cùng nhau", difficulty="Trung bình", solve=sol_coprime_run, gen=g_coprime,
         samples=["7\n4 9 5 10 3 6 7", "3\n6 6 6"],
         statement=r"""Tìm độ dài của đoạn **liên tiếp** dài nhất trong dãy sao cho mọi cặp phần tử **kề nhau** trong đoạn đều nguyên tố cùng nhau (ước chung lớn nhất bằng $1$). Một phần tử đứng riêng là đoạn độ dài $1$.

### Input
- Dòng 1: $n$ ($1 \le n \le 2 \cdot 10^5$).
- Dòng 2: $n$ số nguyên $a_i$ ($1 \le a_i \le 10^9$).

### Output
In ra độ dài lớn nhất.""",
         hint="Giống bài đoạn tăng dài nhất, chỉ thay điều kiện `a[i] > a[i-1]` bằng `gcd(a[i], a[i-1]) == 1`. Viết hàm `gcd` bằng thuật toán Euclid."),
    dict(id="C33", set="c7", title="Thống kê từ", difficulty="Trung bình", solve=sol_words, gen=g_text,
         samples=["Hoc C, hoc nua; HOC mai!", "Bug? bug... AC"],
         statement=r"""Cho một đoạn văn trên một dòng. Từ là dãy chữ cái Latin liên tiếp; các từ được ngăn cách bởi dấu cách hoặc các dấu `. , ! ? ; : -`. Thống kê số lần xuất hiện của mỗi từ, **không phân biệt hoa thường**.

### Input
Một dòng độ dài từ $1$ đến $10^4$ ký tự, có ít nhất một từ.

### Output
Mỗi từ khác nhau in trên một dòng dạng `từ số_lần` (từ viết thường), theo thứ tự **xuất hiện lần đầu**.""",
         hint=r"Đọc bằng `fgets`, tách bằng `strtok(s, \" .,!?;:-\\r\\n\")`, đổi về chữ thường bằng `tolower`. Lưu các từ khác nhau vào mảng `char words[5000][101]` cùng mảng đếm; mỗi từ mới dùng `strcmp` để tìm trong danh sách."),
    dict(id="C34", set="c6", title="Cặp chính phương", difficulty="Trung bình", solve=sol_square_pairs, gen=g_squares,
         samples=["5\n1 3 8 0 1", "2\n2 3"],
         statement=r"""Đếm số cặp chỉ số $i < j$ sao cho $a_i + a_j$ là một **số chính phương**.

### Input
- Dòng 1: $n$ ($1 \le n \le 2000$).
- Dòng 2: $n$ số nguyên $a_i$ ($0 \le a_i \le 10^9$).

### Output
In ra số cặp thỏa mãn.""",
         hint=r"Có khoảng $2 \cdot 10^6$ cặp, mỗi cặp kiểm tra $s$ có chính phương không: `r = (long long)sqrt(s)`, rồi chỉnh `r` lên/xuống cho tới khi `r*r <= s < (r+1)*(r+1)`, so sánh `r*r == s`. Tổng tới $2 \cdot 10^9$ — vượt `int`."),
]

gen.EXTRA_TESTS.update({
    "C23": ["1 1\n5", "4 1\n1 2 3 4", "6 3\n-3 -6 3 6 0 9"], "C24": ["1 0\n5", "5 1000000000\n0 1000000000 0 5 1000000000"],
    "C25": ["1\n5", "2\n9 9", "6\n5 1 5 1 3 3"], "C27": ["1 2", "1000000000000000000 2", "1000000000000000000 999983", "3 4", "100 1000000"],
    "C28": ["1\n7", "5\n1 2 3 4 5", "200000\n" + " ".join(str(10**9 - i) for i in range(200000)),
            "200000\n" + " ".join(["7"] * 200000)], "C29": ["a", "ab", "aabbaa"], "C30": ["2\n0 0", "3\n-1 5 -1"],
    "C31": ["2\n0 5\n1 1000000000000000000", "1\n1000000006 3"], "C32": ["1\n1", "4\n1 1 1 1"], "C33": ["a", "A a A-a"],
    "C34": ["1\n4", "3\n0 0 0", "2\n1000000000 999950884"],
})


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    for p in PROBLEMS:
        if not only or p["id"] in only:
            print(p["id"], p["title"], gen.build(p), "tests")
