Khoa cấp cứu bệnh viện cần phần mềm phân loại bệnh nhân theo chuẩn y tế với 3 cấp độ ưu tiên:
1. Mức độ ưu tiên $P$ (1: Nguy kịch, 2: Nặng, 3: Nhẹ). Bệnh nhân có $P$ nhỏ hơn được khám trước.
2. Nếu cùng mức độ ưu tiên $P$: Bệnh nhân nào đến trước (giờ tiếp nhận $T$ nhỏ hơn) được khám trước.
3. Nếu cùng giờ tiếp nhận: Bệnh nhân lớn tuổi hơn ($Age$ lớn hơn) được ưu tiên khám trước.

Hãy sắp xếp danh sách $N$ bệnh nhân theo đúng thứ tự được khám.
### Input
- Dòng 1: Số nguyên $N$ ($1 \le N \le 100$).
- $N$ dòng tiếp theo, mỗi dòng gồm: Mã BN (chuỗi không cách, tối đa 10 ký tự), Mức độ $P$ (1, 2 hoặc 3), Giờ đến $T$ (số nguyên phút trong ngày, $0 \le T \le 1440$), và Tuổi $Age$ ($1 \le Age \le 120$).
### Output
In ra $N$ dòng, mỗi dòng là Mã BN theo đúng thứ tự ưu tiên khám.
