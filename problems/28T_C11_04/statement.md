# Sắp xếp sinh viên theo GPA

## Đề bài
Đại học 28Universy quản lý 1 danh sách sinh viên gồm thông tin về tên, ngày sinh, địa chỉ và GPA. Thực hiện sắp xếp sinh viên theo GPA giảm dần, nếu 2 sinh viên có cùng điểm thì sinh viên nào xếp trước trong danh sách sẽ được in ra trước.

## Định dạng đầu vào (Input Format)
Dòng đầu là N : số lượng sinh viên. Các dòng tiếp theo mô tả thông tin sinh viên trên 4 dòng : Tên, ngày sinh, địa chỉ, gpa.

## Ràng buộc (Constraints)
1 <= N <= 1000; Tên sinh viên có không quá 50 kí tự; Địa chỉ không quá 20 kí tự; Gpa là số thực trong khoảng từ 0 tới 4;

## Định dạng đầu ra (Output Format)
In ra danh sách sinh viên sau khi sắp xếp. Mỗi sinh viên được in thông tin trên 1 dòng gồm tên, ngày sinh, địa chỉ, gpa lấy 2 số sau dấu phẩy. Các thông tin được in cách nhau một dấu cách.

## Ví dụ
### Đầu vào
`
2
Nguyen Van A
12/03/2002
Ha Noi
2.50
Tran Thi B
20/11/2002
Da Nang
3.20
`

### Đầu ra
`
Tran Thi B 20/11/2002 Da Nang 3.20
Nguyen Van A 12/03/2002 Ha Noi 2.50
`
