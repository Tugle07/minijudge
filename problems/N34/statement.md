Cho danh sách $n$ nhân viên: **tên** (không khoảng trắng, tối đa 20 ký tự), **lương cơ bản** (đồng, số nguyên), **số ngày công**. Quy định:
- Nếu số ngày công vượt 22 ngày, mỗi ngày vượt được thưởng 50 000 đồng.
- Nếu không vượt, không có thưởng.

Hãy in lương từng người (tên, lương thực nhận) và dòng cuối là **tổng lương** toàn công ty.

### Input
- Dòng 1: $n$ ($1 \le n \le 10^4$).
- $n$ dòng: tên, lương cơ bản ($10^6 \le$ lương $\le 2 \cdot 10^7$), số ngày (từ 15 đến 30).

### Output
$n$ dòng: `ten luong_moi`. Dòng cuối: tổng lương (có thể tới $2 \cdot 10^{11}$).
