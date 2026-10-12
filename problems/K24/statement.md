Mỗi sinh viên gồm mã sinh viên, họ tên, ngày sinh (ngày, tháng, năm) và điểm trung bình. Cho danh sách sinh viên và các mã cần tra cứu.

### Input
- Dòng 1: $n$ ($1 \le n \le 1000$).
- Mỗi sinh viên gồm 3 dòng: mã (10 chữ số), họ tên (tối đa $50$ ký tự), rồi `ngày tháng năm điểm`.
- Tiếp theo: $q$ ($1 \le q \le 1000$), và $q$ dòng mỗi dòng một mã cần tra cứu.

### Output
Mỗi truy vấn in một dòng `mã | họ tên | dd/mm/yyyy | điểm` (điểm 2 chữ số thập phân), hoặc `Khong tim thay`. Nếu trùng mã, lấy sinh viên nhập trước.
