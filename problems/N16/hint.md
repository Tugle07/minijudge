Hai vòng `for` lồng: ngoài `i = 0..n-2`, trong `j = 0..n-i-2`. Nếu `a[j] > a[j+1]` thì hoán đổi. Bubble sort O(n²) qua được tới n = 20 000; muốn n = 10^5 dùng `qsort`.
