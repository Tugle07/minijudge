Duyệt một lần, giữ `cur` là độ dài đoạn tăng kết thúc tại vị trí hiện tại: nếu `a[i] > a[i-1]` thì `cur++`, ngược lại `cur = 1`; cập nhật `res = max(res, cur)`.
