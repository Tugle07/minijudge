"""Nhập bộ test chia mức ràng buộc (đã kiểm tra: đáp án đúng, đúng ràng buộc đề) cho C12, C18, C23, C28,
thêm nhóm "Trường hợp đặc biệt" (test viết tay) và ghi subtasks.json theo từng mức.

Chạy (trong WSL, nơi có bộ test gốc):
  python3 scripts/import-tiered-suites.py <thư mục problems nguồn>
Bộ test nguồn: mỗi bài ~100 test xếp tăng dần theo kích thước (C18: 30 test).
"""
import importlib.util
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, "..", "problems")

_spec = importlib.util.spec_from_file_location("suites", os.path.join(HERE, "build-test-suites.py"))
suites = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(suites)
SOLVE = {p["id"]: p["solve"] for m in suites.MODULES for p in m.PROBLEMS}

# (tên, khoảng test trong bộ nguồn, điểm, mô tả). Nhóm "Trường hợp đặc biệt" được nối vào cuối.
TIERS = {
    "C12": [
        ("Ví dụ trong đề", "1", 5, "Đúng ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng"),
        ("n ≤ 20", "2-20", 15, "Dữ liệu rất nhỏ — duyệt tuần tự vẫn qua"),
        ("n ≤ 2 000", "21-60", 20, "Dữ liệu vừa — duyệt tuần tự vẫn kịp"),
        ("n ≤ 3·10^4", "61-80", 20, "Duyệt tuần tự O(n·q) bắt đầu chậm"),
        ("n tới 2·10^5", "81-100", 25, "Cần tìm kiếm nhị phân O(q log n)"),
    ],
    "C23": [
        ("Ví dụ trong đề", "1-2", 5, "Đúng ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng"),
        ("n ≤ 20", "3-20", 15, "Dữ liệu rất nhỏ — thử mọi cặp O(n²) vẫn qua"),
        ("n ≤ 2 000", "21-60", 20, "Thử mọi cặp O(n²) vẫn kịp"),
        ("n ≤ 3·10^4", "61-80", 20, "O(n²) bắt đầu chậm — nên đếm theo số dư"),
        ("n tới 2·10^5", "81-100", 25, "Cần đếm theo số dư O(n + K), kết quả cần long long"),
    ],
    "C28": [
        ("Ví dụ trong đề", "1-2", 5, "Đúng ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng"),
        ("n ≤ 20", "3-20", 15, "Dữ liệu rất nhỏ — duyệt hai vòng lặp vẫn qua"),
        ("n ≤ 2 000", "21-60", 20, "Duyệt hai vòng lặp O(n²) vẫn kịp"),
        ("n ≤ 3·10^4", "61-80", 20, "O(n²) bắt đầu chậm"),
        ("n tới 2·10^5", "81-100", 25, "Cần ngăn xếp đơn điệu O(n)"),
    ],
    "C18": [
        ("Ví dụ trong đề", "1", 10, "Đúng ví dụ đã cho — hiểu đề, đọc/ghi đúng định dạng"),
        ("Xâu ngắn (≤ 10 ký tự)", "2-10", 20, "Gồm xâu 1–2 ký tự, độ dài chẵn và lẻ"),
        ("Xâu trung bình (≤ 100 ký tự)", "11-20", 25, "Nhiều xâu, YES/NO xen kẽ"),
        ("Xâu dài (≤ 1000 ký tự)", "21-30", 30, "Tới 100 xâu dài 1000 ký tự"),
    ],
}
EDGE_POINTS = 15


def main(src_root):
    for pid, tiers in TIERS.items():
        src, dst = os.path.join(src_root, pid), os.path.join(DEST, pid)
        n_src = int(tiers[-1][1].split("-")[-1])
        tdir = os.path.join(dst, "tests")
        shutil.rmtree(tdir, ignore_errors=True)
        os.makedirs(tdir)
        seen = set()
        for i in range(1, n_src + 1):
            for ext in ("in", "out"):
                shutil.copyfile(os.path.join(src, "tests", f"{i}.{ext}"), os.path.join(tdir, f"{i}.{ext}"))
            seen.add(open(os.path.join(tdir, f"{i}.in"), encoding="utf-8").read().strip())
        edge = [x for x in suites.EXTRA.get(pid, []) + suites.NEW_EDGE.get(pid, []) if x.strip() not in seen]
        for k, inp in enumerate(edge, n_src + 1):
            suites.write(os.path.join(tdir, f"{k}.in"), inp)
            suites.write(os.path.join(tdir, f"{k}.out"), SOLVE[pid](inp))
        total = n_src + len(edge)
        subtasks = [{"name": n, "tests": t, "points": p, "note": d} for n, t, p, d in tiers]
        if edge:
            subtasks.append({"name": "Trường hợp đặc biệt", "tests": suites.span(n_src + 1, total), "points": EDGE_POINTS, "note": suites.NOTES[pid][1]})
        s = sum(x["points"] for x in subtasks)
        for x in subtasks:
            x["points"] = round(x["points"] * 100 / s, 2)
        suites.write(os.path.join(dst, "subtasks.json"), json.dumps(subtasks, ensure_ascii=False, indent=2))
        cfg_path = os.path.join(dst, "problem.txt")
        cfg = dict(l.split("=", 1) for l in open(cfg_path, encoding="utf-8").read().splitlines() if "=" in l)
        cfg["tests"] = str(total)
        last_sample = int(tiers[0][1].split("-")[-1])
        cfg["samples"] = ",".join(str(i) for i in range(1, last_sample + 1))
        suites.write(cfg_path, "\n".join(f"{k}={v}" for k, v in cfg.items()))
        print(f"{pid}: {n_src} test chia mức + {len(edge)} test đặc biệt = {total} test, {len(subtasks)} subtask")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1])
