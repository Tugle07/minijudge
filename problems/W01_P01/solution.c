#include <stdio.h>
int main() {
    int n, m, k;
    if (scanf("%d %d %d", &n, &m, &k) == 3) {
        int total = m * k;
        printf("%d %d\n", total / n, total % n);
    }
    return 0;
}
