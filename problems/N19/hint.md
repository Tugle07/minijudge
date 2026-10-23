Nếu $a_i \le 10^6$: khai `int cnt[1000005] = {0};`, duyệt mảng cộng `cnt[a[i]]++`. Sau đó duyệt `v = 1..1000000`, giữ `(cnt[v], v)` lớn nhất, lưu ý ưu tiên số nhỏ hơn khi hoà.
