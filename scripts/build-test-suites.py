"""Dựng bộ test + bộ subtask mặc định cho toàn bộ bài trong problems/.

Chạy:  python scripts/build-test-suites.py [ID ...]

Mỗi bài có 4 nhóm test, mỗi nhóm là một subtask ứng với một mức độ hiểu bài:
  1. Ví dụ trong đề      — hiểu đề, đọc/ghi đúng định dạng
  2. Dữ liệu nhỏ         — thuật toán đúng ở trường hợp thông thường (ngẫu nhiên, seed cố định)
  3. Trường hợp đặc biệt — các biên riêng của từng bài (viết tay)
  4. Dữ liệu lớn         — ràng buộc tối đa: tràn số, độ phức tạp
Đáp án luôn do lời giải mẫu (Python) trong các script generate-*.py tính ra.
Kết quả: problems/<ID>/tests/*, problem.txt (số test, test ví dụ), subtasks.json.
"""
import contextlib
import importlib.util
import io
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "problems")
SMALL_COUNT = 5
BIG_COUNT = 2


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), os.path.join(HERE, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    argv, sys.argv = sys.argv, ["x", "__none__"]
    with contextlib.redirect_stdout(io.StringIO()):
        spec.loader.exec_module(mod)
    sys.argv = argv
    return mod


MODULES = [load(n) for n in ("generate-problems", "generate-c-course", "generate-c-course-2", "generate-ktlt-syllabus")]
EXTRA = {}
for m in MODULES:
    EXTRA.update(getattr(m, "EXTRA_TESTS", None) or getattr(getattr(m, "gen", None), "EXTRA_TESTS", {}))


# ---------- Hai bài soạn tay (không có trong script cũ) ----------
def sol_sum2(inp):
    a, b = map(int, inp.split())
    return str(a + b)


def g_sum2(r, big):
    lim = 10**12 if big else 1000
    return f"{r.randint(-lim, lim)} {r.randint(-lim, lim)}"


def sol_window(inp):
    d = list(map(int, inp.split()))
    n, k, a = d[0], d[1], d[2:]
    cur = best = sum(a[:k])
    for i in range(k, n):
        cur += a[i] - a[i - k]
        best = max(best, cur)
    return str(best)


def g_window(r, big):
    n = 200000 if big else r.randint(1, 10)
    k = r.randint(n // 2 if big else 1, n)
    lim = 10**9 if big else 20
    return f"{n} {k}\n" + " ".join(str(r.randint(-lim, lim)) for _ in range(n))


def read_samples(pid):
    cfg = dict(l.split("=", 1) for l in open(os.path.join(ROOT, pid, "problem.txt"), encoding="utf-8").read().splitlines() if "=" in l)
    ids = [int(x) for x in cfg.get("samples", "").split(",") if x.strip()]
    return cfg, [open(os.path.join(ROOT, pid, "tests", f"{i}.in"), encoding="utf-8").read().rstrip("\n") for i in ids]


MANUAL = []
for pid, solve, gen in (("P01", sol_sum2, g_sum2), ("P02", sol_window, g_window)):
    cfg, samples = read_samples(pid)
    MANUAL.append(dict(id=pid, title=cfg["title"], difficulty=cfg.get("difficulty", "Dễ"), solve=solve, gen=gen, samples=samples, statement=None, hint=None))

# ---------- Test trường hợp đặc biệt bổ sung (viết tay theo ràng buộc từng bài) ----------
NEW_EDGE = {
    "P01": ["0 0", "7 -7", "-1000000000000 1"],
    "P02": ["1 1\n-5", "4 4\n1 2 3 4", "5 2\n-3 -1 -4 -1 -5", "6 3\n0 0 0 0 0 0"],
    "P03": ["1", "3+3+3", "3+2+1+3+2+1"],
    "P05": ["1\n5", "4\n1 1 1 1", "5\n100 1 1 1 1"],
    "P09": ["1\n7", "2\n1 2", "5\n5 4 3 2 1"],
    "P10": ["1\n1\n0", "1\n2\n01", "1\n2\n00", "1\n6\n010101"],
    "P11": ["1\n1\n5", "1\n2\n1 2", "2\n3\n1 1 1\n4\n9 8 7 6"],
    "P12": ["1\n1 1\nW", "1\n1 1\nB", "1\n5 5\nWWWWW", "1\n5 2\nBBBBB"],
    "P13": ["1\n3", "1\n4", "1\n000000000000000000000000000000", "2\n314159265358979323846264338327\n314159265358979323846264338320"],
    "P14": ["1\n2\n1 3", "1\n2\n1 2", "1\n3\n2 4 6", "1\n2\n50 49"],
    "P15": ["1\n5\n2\n1 1 1\n2 1 1", "3\n1000000000 1000000000 1000000000\n2\n1 1 3\n2 1 3", "4\n4 3 2 1\n2\n1 2 3\n2 2 3"],
    "C03": ["3\n1\n9\n10", "2\n1000000000000000000\n999999999999999999", "2\n12321\n1221"],
    "C04": ["4\n1\n2\n3\n4", "2\n1000000007\n1000000000", "1\n999999937"],
    "C06": ["3\n1 1\n7 7\n1 1000000000", "1\n1000000000 999999999", "1\n6 4"],
    "C09": ["1", "2"],
    "C10": ["1\n0", "5\n7 7 7 7 7", "3\n1000000 0 1000000"],
    "C12": ["1\n5\n3\n4 5 6", "5\n1 1 1 1 1\n2\n1 2", "4\n2 2 3 3\n3\n3 2 1000000000"],
    "C13": ["1\n0", "4\n-2 -1 0 1", "4\n3 3 2 2", "3\n-1000000000 999999999 1000000000"],
    "C15": ["1 1\n-1000", "1 4\n1 2 3 4", "3 1\n1000\n-1000\n0"],
    "C16": ["1 1 1\n-1000\n1000", "1 3 1\n1 2 3\n4\n5\n6", "2 2 2\n1000 1000\n1000 1000\n1000 1000\n1000 1000"],
    "C18": ["1\na", "3\naa\nab\naba", "1\nabccbx"],
    "C20": ["a", "zzzzzz", "Hello, World! 123"],
    "C21": ["1\nan", "1\n   nGUYEN    van   AN   ", "2\nTRAN\nle thi b"],
    "C22": ["1\nSV01\nNguyen Van An\n4.00", "3\nB\nTran B\n3.50\nA\nTran A\n3.50\nC\nTran C\n0.00"],
    "C26": ["1\n1", "2\n25 4", "3\n1000000000000000000 5 2"],
    "K05": ["4\n2 1900\n2 2000\n2 2024\n2 2023", "2\n12 9999\n1 1"],
    "K06": ["6\n8\n6.5\n5\n4.99\n10\n0", "3\n-0.01\n10.01\n20"],
    "K16": ["1", "2"],
    "K17": ["1", "2", "3"],
    "K20": ["one", "   two   words   ", "a b c d e"],
    "K22": ["1\nSP1\nBut bi\n1000 0", "2\nA\nHang A\n1000000000 10000\nB\nHang B\n1000000000 10000"],
    "K23": ["1\nDH1 0 0", "4\nD1 3 5\nD2 3 7\nD3 2 1000000000\nD4 2 1000000000"],
    "K24": ["1\n6751071084\nTran Cong Tuan\n7 3 2007 8.5\n1\n6751071084",
            "2\n6751071001\nNguyen A\n1 1 2000 10\n6751071001\nNguyen B\n2 2 2001 9\n2\n6751071001\n6751079999"],
}

# ---------- Mô tả subtask riêng cho từng bài: (dữ liệu nhỏ, trường hợp đặc biệt, dữ liệu lớn) ----------
NOTES = {
    "P01": ("Số nhỏ, cả số âm", "0, hai số đối nhau, |a| = 10^12", "|a|, |b| tới 10^12 — tổng vượt int, cần long long"),
    "P02": ("n ≤ 10, giá trị nhỏ", "k = n, n = 1, toàn số âm, toàn số 0", "n = 2·10^5 — cần cửa sổ trượt O(n), tổng cần long long"),
    "P03": ("Biểu thức ngắn", "Chỉ 1 số hạng, các số hạng giống nhau", "Biểu thức dài 100 ký tự"),
    "P04": ("n, m ngẫu nhiên", "n = m = 1, n = m = 100, một chiều bằng 1", "n, m lớn nhất"),
    "P05": ("n ≤ 10", "n = 1, các đồng xu bằng nhau, một đồng rất lớn", "n = 100"),
    "P06": ("w ngẫu nhiên", "w = 1, 2, 4 và w lẻ lớn (99)", "w lớn nhất"),
    "P07": ("n ngẫu nhiên", "n = 1, n nhỏ hơn mệnh giá lớn", "n tới 10^9 — tính bằng phép chia, không lặp từng tờ"),
    "P08": ("n ≤ 10", "k = 0, k = n, các phần tử trùng nhau", "n = 2·10^5 — cần sắp xếp O(n log n)"),
    "P09": ("n ≤ 12", "Chỉ 1 thẻ, 2 thẻ, dãy giảm dần", "n = 1000"),
    "P10": ("Chuỗi ngắn", "n = 1, chuỗi 2 ký tự, xen kẽ 0/1", "Nhiều bộ test, chuỗi dài 2000"),
    "P11": ("n ≤ 8", "n = 1, n = 2, phần tử trùng nhau", "300 bộ test, n = 300"),
    "P12": ("n nhỏ", "n = k = 1, toàn W, toàn B", "Tổng n = 2·10^5 — cần cửa sổ trượt O(n)"),
    "P13": ("Chuỗi ngắn", "Sai ngay chữ số đầu, toàn chữ số 0, chuỗi 30 chữ số", "1000 chuỗi"),
    "P14": ("n nhỏ", "n = 2 với tổng chẵn/lẻ, toàn số chẵn", "1000 bộ test"),
    "P15": ("n, m nhỏ", "n = 1, tổng 3·10^9 vượt int, l = r", "n, m = 10^5 — cần tổng tiền tố, long long"),
    "P16": ("n, k ngẫu nhiên", "n = 1, n = 2", "n tới 10^12 — cần công thức, long long"),
    "P17": ("n ngẫu nhiên", "n = 1, n = 4, n = 777, n = 1000", "n lớn nhất"),
    "C01": ("n nhỏ", "n = 2, n = 10^6, n gần 10^12", "n tới 10^12 — duyệt tới √n"),
    "C02": ("Đoạn nhỏ", "Đoạn 1 phần tử, đoạn rất rộng tới 10^12", "Đoạn tới 10^12 — dùng √, không duyệt từng số"),
    "C03": ("Số ngắn", "Số 1 chữ số, số 10, số có 18–19 chữ số", "Nhiều số tới 10^18 — cần long long"),
    "C04": ("Số nhỏ", "n = 1, 2, 3, 4 và số nguyên tố lớn gần 10^9", "1000 số tới 10^9 — duyệt tới √n"),
    "C05": ("Đoạn nhỏ", "Đoạn chứa đúng 6, đoạn không có số hoàn hảo, 8128", "Đoạn tới 10^6"),
    "C06": ("Số nhỏ", "a = b, a = 1, BCNN tới ~10^18", "1000 cặp tới 10^9 — BCNN cần long long, Euclid"),
    "C07": ("n nhỏ", "n = 1, 2 và n = 91 (vừa đủ long long)", "Nhiều truy vấn n lớn"),
    "C08": ("n nhỏ", "n = 2, n nguyên tố lớn, n = 10^12", "n tới 10^12 — chia thử tới √n"),
    "C09": ("n nhỏ", "n = 1, n = 2", "n = 15 — 32767 bước, đệ quy"),
    "C10": ("n nhỏ", "n = 1, mọi phần tử bằng nhau, giá trị 0 và 10^6", "n = 10^5 — đếm bằng mảng tần suất"),
    "C11": ("Thao tác ngẫu nhiên", "Mảng rỗng, chèn/xóa ở biên", "Nhiều thao tác"),
    "C12": ("Dãy nhỏ", "n = 1, phần tử trùng (vị trí đầu tiên), x không có", "n, q = 2·10^5 — cần tìm kiếm nhị phân"),
    "C13": ("Dãy nhỏ", "n = 1, số âm và 0, phần tử trùng", "n = 2·10^5 — cần qsort"),
    "C14": ("Dãy nhỏ", "n = 1, dãy tăng hoàn toàn", "n lớn"),
    "C15": ("Ma trận nhỏ", "Ma trận 1×1, 1 hàng, 1 cột", "Ma trận 500×500"),
    "C16": ("Ma trận nhỏ", "Kích thước 1, ma trận hàng × cột, giá trị lớn nhất", "Ma trận 100×100"),
    "C17": ("Kích thước nhỏ", "1 hàng, ma trận vuông, 2 hàng", "Kích thước lớn nhất"),
    "C18": ("Xâu ngắn", "Xâu 1 ký tự, độ dài chẵn/lẻ, gần đối xứng", "Xâu dài 1000"),
    "C19": ("Câu ngắn", "Một từ, hai từ", "Câu dài"),
    "C20": ("Xâu ngắn", "Một ký tự, một chữ lặp lại, có ký tự không phải chữ", "Xâu dài 10^5"),
    "C21": ("Tên ngẫu nhiên", "Tên 1 từ, thừa dấu cách, toàn chữ hoa", "1000 tên"),
    "C22": ("Danh sách nhỏ", "1 sinh viên, GPA bằng nhau, GPA 0.00 và 4.00", "1000 sinh viên"),
    "C23": ("Dãy nhỏ", "n = 1, k = 1, số âm và 0", "n lớn — cần đếm theo số dư"),
    "C24": ("Dãy nhỏ", "n = 1, k = 0, giá trị cực đại", "n lớn — cần sắp xếp + hai con trỏ"),
    "C25": ("Dãy nhỏ", "n = 1, hai phần tử bằng nhau", "n lớn"),
    "C26": ("Dãy nhỏ", "n = 1, 25 × 4, số tới 10^18", "n = 10^5 số tới 10^18 — đếm thừa số 2 và 5"),
    "C27": ("Số nhỏ", "k = 2, k nguyên tố lớn, k không nguyên tố, n tới 10^18", "n tới 10^18 — công thức Legendre"),
    "C28": ("Dãy nhỏ", "n = 1, dãy tăng, dãy giảm 2·10^5, toàn bằng nhau", "n = 2·10^5 — cần ngăn xếp O(n)"),
    "C29": ("Xâu ngắn", "1 ký tự, 2 ký tự khác nhau, nhóm lặp", "Xâu dài"),
    "C30": ("Dãy nhỏ", "Toàn số 0, số âm", "Dãy lớn — cần tổng tiền tố"),
    "C31": ("Số nhỏ", "Số mũ 0, số mũ 10^18, cơ số gần mod", "Nhiều truy vấn — lũy thừa nhanh"),
    "C32": ("Dãy nhỏ", "n = 1, toàn số 1", "Dãy lớn"),
    "C33": ("Văn bản ngắn", "Một từ, chữ hoa/thường, dấu gạch nối", "Văn bản dài"),
    "C34": ("Dãy nhỏ", "n = 1, toàn số 0, tích tới ~10^18", "Dãy lớn"),
    "K01": ("Bán kính ngẫu nhiên", "r = 10^4, r = 0.01, phần thập phân", "Bán kính lớn — cần double"),
    "K02": ("Số ngẫu nhiên", "Số chia âm, số bị chia âm, 0 chia, chia hết", "Giá trị tới 10^9"),
    "K03": ("Số giây ngẫu nhiên", "86399, 86400, 10^9", "Số giây lớn nhất"),
    "K04": ("Số ngẫu nhiên", "Toàn bit 0, INT_MAX, bit thứ 30", "Giá trị lớn nhất"),
    "K05": ("Tháng/năm ngẫu nhiên", "Tháng 2 năm 1900/2000/2024/2023, năm 9999", "1000 truy vấn"),
    "K06": ("Điểm ngẫu nhiên", "Đúng các mốc 8, 6.5, 5, 0, 10 và điểm ngoài [0, 10]", "1000 điểm"),
    "K07": ("Số khối ngẫu nhiên", "Đúng các mốc bậc thang 10, 20, 30 và 10^6", "Nhiều hộ, lượng nước lớn"),
    "K08": ("Kích thước nhỏ", "1×1, 2×2, 1 cột", "Kích thước lớn nhất"),
    "K09": ("Đoạn ngẫu nhiên", "Một bảng (a = b), bảng 9", "Đủ 9 bảng"),
    "K10": ("Số nhỏ", "n = 1, 2 và gần 10^9", "Nhiều số lớn"),
    "K11": ("n nhỏ", "n = 1, 2, 20 (vừa đủ long long)", "n lớn nhất"),
    "K12": ("Mảng nhỏ", "n = 1, toàn số âm bằng nhau, phần tử trùng", "Mảng lớn"),
    "K13": ("Mảng nhỏ", "n = 1, số âm và trùng nhau", "Mảng lớn"),
    "K14": ("Mảng nhỏ", "Mảng đã sắp xếp/đảo ngược, 2 phần tử", "Mảng lớn"),
    "K15": ("Ma trận nhỏ", "Ma trận 1×1, các phần tử bằng nhau", "Ma trận lớn nhất"),
    "K16": ("n nhỏ", "n = 1, n = 2", "n = 30 — giá trị tới ~1.5·10^8"),
    "K17": ("n nhỏ", "n = 1, 2, 3", "n tới 72 — cần long long, quy hoạch động"),
    "K18": ("Thao tác ngẫu nhiên", "Mảng 1 phần tử, đảo đoạn độ dài 1", "Nhiều thao tác"),
    "K19": ("Xâu ngắn", "Xâu con lặp, hai xâu bằng nhau, có dấu cách, xâu con dài hơn", "Xâu dài"),
    "K20": ("Câu ngắn", "Một từ, nhiều dấu cách thừa ở đầu/cuối/giữa", "Câu dài 10^5 ký tự"),
    "K21": ("Mảng nhỏ", "Giá trị cực đại, mảng rỗng", "Mảng lớn — cấp phát động"),
    "K22": ("Danh sách nhỏ", "1 sản phẩm hết hàng, giá trị tồn kho bằng nhau (~10^13)", "1000 sản phẩm — tổng cần long long"),
    "K23": ("Danh sách nhỏ", "1 đơn, không có đơn hủy, doanh thu 2·10^9", "10^5 đơn — doanh thu cần long long"),
    "K24": ("Danh sách nhỏ", "1 sinh viên, mã trùng (lấy người nhập trước), mã không có", "1000 sinh viên, 1000 truy vấn"),
}

POINTS = {"sample": 10, "small": 30, "edge": 30, "big": 30}


def write(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text if text.endswith("\n") else text + "\n")


def span(a, b):
    return f"{a}" if a == b else f"{a}-{b}"


def build(p):
    r = random.Random(p["id"] + "-suite")
    samples = list(p["samples"])
    edge = [x for x in EXTRA.get(p["id"], []) + NEW_EDGE.get(p["id"], []) if x not in samples]
    small, big, seen = [], [], set(samples + edge)
    for _ in range(SMALL_COUNT * 6):
        if len(small) >= SMALL_COUNT:
            break
        x = p["gen"](r, False)
        if x not in seen:
            small.append(x)
            seen.add(x)
    for _ in range(BIG_COUNT * 3):
        if len(big) >= BIG_COUNT:
            break
        x = p["gen"](r, True)
        if x not in seen:
            big.append(x)
            seen.add(x)
    inputs = samples + small + edge + big
    base = os.path.join(ROOT, p["id"])
    tdir = os.path.join(base, "tests")
    os.makedirs(tdir, exist_ok=True)
    for f in os.listdir(tdir):
        if f.endswith((".in", ".out")):
            os.remove(os.path.join(tdir, f))
    for i, inp in enumerate(inputs, 1):
        write(os.path.join(tdir, f"{i}.in"), inp)
        write(os.path.join(tdir, f"{i}.out"), p["solve"](inp))

    note_small, note_edge, note_big = NOTES.get(p["id"], ("Dữ liệu nhỏ ngẫu nhiên", "Các trường hợp biên", "Ràng buộc lớn nhất"))
    groups, pos = [], 1
    for key, items, name, note in (
        ("sample", samples, "Ví dụ trong đề", "Đúng các ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng"),
        ("small", small, "Dữ liệu nhỏ", note_small),
        ("edge", edge, "Trường hợp đặc biệt", note_edge),
        ("big", big, "Dữ liệu lớn", note_big),
    ):
        if items:
            groups.append({"key": key, "name": name, "tests": span(pos, pos + len(items) - 1), "note": note})
            pos += len(items)
    keys = {g["key"] for g in groups}
    pts = dict(POINTS)
    if "edge" not in keys:
        pts["small"] += pts["edge"] // 2
        pts["big"] += pts["edge"] - pts["edge"] // 2
    if "big" not in keys:
        pts["small"] += pts["big"]
    total = sum(pts[g["key"]] for g in groups)
    subtasks = [{"name": g["name"], "tests": g["tests"], "points": round(pts[g["key"]] * 100 / total, 2), "note": g["note"]} for g in groups]
    write(os.path.join(base, "subtasks.json"), json.dumps(subtasks, ensure_ascii=False, indent=2))

    cfg_path = os.path.join(base, "problem.txt")
    cfg = dict(l.split("=", 1) for l in open(cfg_path, encoding="utf-8").read().splitlines() if "=" in l)
    cfg["tests"] = str(len(inputs))
    cfg["samples"] = ",".join(str(i) for i in range(1, len(samples) + 1))
    if p.get("title"):
        cfg["title"] = p["title"]
    write(cfg_path, "\n".join(f"{k}={v}" for k, v in cfg.items()))
    if p.get("statement"):
        write(os.path.join(base, "statement.md"), p["statement"])
    if p.get("hint"):
        write(os.path.join(base, "hint.md"), p["hint"])
    return len(samples), len(small), len(edge), len(big)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:])
    problems = MANUAL + [p for m in MODULES for p in m.PROBLEMS]
    missing = [p["id"] for p in problems if p["id"] not in NOTES]
    if missing:
        print("Thiếu mô tả subtask:", missing)
    for p in problems:
        if not only or p["id"] in only:
            s, sm, e, b = build(p)
            print(f"{p['id']:4} {p['title'][:34]:34} ví dụ {s} · nhỏ {sm} · đặc biệt {e} · lớn {b} = {s + sm + e + b} test")
