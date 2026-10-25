#include <stdio.h>

int main() {
    int n, m;
    if (scanf("%d %d", &n, &m) == 2) {
        int a[55][55];
        int val = 1;
        for (int i = 0; i < n; i++) {
            if (i % 2 == 0) {
                for (int j = 0; j < m; j++) a[i][j] = val++;
            } else {
                for (int j = m - 1; j >= 0; j--) a[i][j] = val++;
            }
        }
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                printf("%d%c", a[i][j], (j == m - 1 ? '\n' : ' '));
            }
        }
    }
    return 0;
}
