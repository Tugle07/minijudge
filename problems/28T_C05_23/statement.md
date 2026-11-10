# Mảng cộng dồn

## Đề bài
Cho mảng số nguyên A[] gồm N phần tử, nhiệm vụ của bạn là xây dựng mảng F cũng có N phần tử trong đó F[0] = A[0] và F[i] = F[i-1] + A[i] với mọi i >= 1. Như vậy bạn thử nghĩ xem F[i] lưu giá trị gì?

## Định dạng đầu vào (Input Format)
Dòng đầu tiên là số nguyên dương N; Dòng thứ 2 gồm N số nguyên viết cách nhau một vài khoảng trắng

## Ràng buộc (Constraints)
1 <= N <= 1000; 0 <= A[i] <= 10^3;

## Định dạng đầu ra (Output Format)
In ra mảng cộng dồn F

## Ví dụ
### Đầu vào
```
5
1 2 2 3 1
```

### Đầu ra
```
1 2
```
