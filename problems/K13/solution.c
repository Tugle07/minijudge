#include <stdio.h>
#include <stdbool.h>

bool is_prime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[105];
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
    }
    int x;
    scanf("%d", &x);

    // 1. TBC các phần tử âm (2 chữ số thập phân, NONE nếu không có)
    long long sum_neg = 0;
    int count_neg = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] < 0) {
            sum_neg += a[i];
            count_neg++;
        }
    }
    if (count_neg == 0) {
        printf("NONE\n");
    } else {
        printf("%.2lf\n", (double)sum_neg / count_neg);
    }

    // 2. Đếm số nguyên tố
    int count_prime = 0;
    for (int i = 0; i < n; i++) {
        if (is_prime(a[i])) count_prime++;
    }
    printf("%d\n", count_prime);

    // 3. Max và vị trí cuối cùng
    int max_val = a[0];
    int last_pos = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] >= max_val) {
            max_val = a[i];
            last_pos = i;
        }
    }
    printf("%d %d\n", max_val, last_pos);

    // 4. Nhỏ thứ hai (lớn hơn hẳn min)
    int min1 = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < min1) min1 = a[i];
    }
    bool found2 = false;
    int min2 = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > min1) {
            if (!found2 || a[i] < min2) {
                min2 = a[i];
                found2 = true;
            }
        }
    }
    if (!found2) printf("NONE\n");
    else printf("%d\n", min2);

    // 5. Kiểm tra mảng đối xứng
    bool sym = true;
    for (int i = 0; i < n / 2; i++) {
        if (a[i] != a[n - 1 - i]) {
            sym = false;
            break;
        }
    }
    printf("%s\n", sym ? "YES" : "NO");

    // 6. Sắp xếp tăng dần rồi xóa mọi phần tử bằng x
    int b[105];
    for (int i = 0; i < n; i++) b[i] = a[i];
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (b[j] > b[j + 1]) {
                int tmp = b[j];
                b[j] = b[j + 1];
                b[j + 1] = tmp;
            }
        }
    }
    int m = 0;
    int c[105];
    for (int i = 0; i < n; i++) {
        if (b[i] != x) {
            c[m++] = b[i];
        }
    }
    if (m == 0) {
        printf("EMPTY\n");
    } else {
        for (int i = 0; i < m; i++) {
            printf("%d%c", c[i], (i == m - 1) ? '\n' : ' ');
        }
    }

    // 7. Đoạn liên tiếp dài nhất bằng nhau trên mảng ban đầu
    int best_start = 0, max_len = 1;
    int cur_start = 0, cur_len = 1;
    for (int i = 1; i < n; i++) {
        if (a[i] == a[i - 1]) {
            cur_len++;
        } else {
            if (cur_len > max_len) {
                max_len = cur_len;
                best_start = cur_start;
            }
            cur_start = i;
            cur_len = 1;
        }
    }
    if (cur_len > max_len) {
        max_len = cur_len;
        best_start = cur_start;
    }
    printf("%d %d\n", best_start, max_len);

    return 0;
}
