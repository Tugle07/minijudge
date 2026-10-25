Trạm quan sát thiên văn vừa thu được một chuỗi xung tín hiệu kéo dài đúng $T$ giây từ ngoài không gian. Hãy viết chương trình quy đổi thời gian $T$ này ra dạng chuẩn: **Ngày, Giờ, Phút, Giây**.

Quy ước: 1 ngày = 24 giờ, 1 giờ = 60 phút, 1 phút = 60 giây.

### Input
Một số nguyên $T$ ($0 \le T \le 10^{15}$).

### Output
In ra một dòng duy nhất theo định dạng: `D d HH:MM:SS`
Trong đó: $D$ là số ngày, $HH$ là giờ ($00$–$23$), $MM$ là phút ($00$–$59$), $SS$ là giây ($00$–$59$). Giờ, phút, giây luôn in đủ **2 chữ số** (thêm chữ số `0` ở đầu nếu nhỏ hơn 10).
