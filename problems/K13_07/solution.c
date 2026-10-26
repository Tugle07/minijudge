#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

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
