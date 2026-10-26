#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int x;
    scanf("%d", &x);

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {
                int tmp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = tmp;
            }
        }
    }
    int m = 0;
    int res[105];
    for (int i = 0; i < n; i++) {
        if (a[i] != x) res[m++] = a[i];
    }
    if (m == 0) printf("EMPTY\n");
    else {
        for (int i = 0; i < m; i++) {
            printf("%d%c", res[i], (i == m - 1) ? '\n' : ' ');
        }
    }
    return 0;
}
