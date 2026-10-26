Đội ngũ kỹ sư công trình thuộc trường Đại học Giao thông Vận tải Phân hiệu UTC2 tiến hành kiểm định độ ổn định của một nhịp cầu thép. Thiết bị cảm biến đo cao độ chịu lực tại $n$ mốc đo cách đều nhau dọc thân cầu (đánh số từ $0$ đến $n-1$).

Để đảm bảo kết cấu dầm cầu phân bổ ứng suất cân bằng tuyệt đối qua trụ trung tâm, chuỗi số liệu đo đạc bắt buộc phải có tính chất **đối xứng hoàn hảo** (tức là mốc thứ $i$ phải có cao độ bằng mốc đối xứng $n - 1 - i$ qua tâm). Hãy lập trình kiểm định chuỗi số liệu: in `YES` nếu nhịp cầu đạt chuẩn đối xứng, ngược lại in `NO`.

### Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### Dữ liệu ra (Output)
In ra `YES` nếu mảng đối xứng, `NO` nếu không đối xứng.

### Ví dụ 1
**Input:**
```text
10
4 -2 9 16 -5 1 3 7 -2 25
```
**Output:**
```text
NO
```

### Ví dụ 2
**Input:**
```text
3
5 5 5
```
**Output:**
```text
YES
```
