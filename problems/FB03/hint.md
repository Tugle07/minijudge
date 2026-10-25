- 1 ngày = 86400 giây.
- Số ngày: `D = T / 86400LL;`
- Phần dư: `rem = T % 86400LL;`
- Giờ: `HH = rem / 3600LL; rem %= 3600LL;`
- Phút: `MM = rem / 60LL; SS = rem % 60LL;`
- In định dạng: `printf("%lld d %02lld:%02lld:%02lld
", D, HH, MM, SS);`
