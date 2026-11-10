# Tính tổ hợp chập K của N

## Đề bài
Cho 2 số nguyên dương N và K. Hãy tính tổ hợp chập K của N. Tiện thể các bạn ôn lại một vài tính chất của tổ hợp chập K của N nhé.
Số các tổ hợp chập k của n phần tử:
C(n, k) = n! / (k! * (n - k)!)
Qui ước:
C(n, 0) = 1
Tính chất:
C(n, 0) = C(n, n) = 1
C(n, k) = C(n, n - k)
C(n, k) = C(n - 1, k - 1) + C(n - 1, k)
C(n, k) = (n - k + 1) / k * C(n, k - 1)

## Định dạng đầu vào (Input Format)
2 số nguyên dương N và K.

## Ràng buộc (Constraints)
0 <= k <= n <= 10.

## Định dạng đầu ra (Output Format)
Kết quả của tổ hợp chập K của N.

## Ví dụ
### Đầu vào
```
5 2
```

### Đầu ra
```
10
```
