#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int max_val = a[0];
    int last_pos = 0;
    for (int i = 1; i < n; i++) {
        if (a[i] >= max_val) {
            max_val = a[i];
            last_pos = i;
        }
    }
    printf("%d %d\n", max_val, last_pos);
    return 0;
}
