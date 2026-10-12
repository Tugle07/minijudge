#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    long long *a = malloc((size_t)n * sizeof *a);
    if (!a) return 1;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    long long cur = 0;
    for (int i = 0; i < k; i++) cur += a[i];
    long long best = cur;
    for (int i = k; i < n; i++) {
        cur += a[i] - a[i - k];
        if (cur > best) best = cur;
    }
    printf("%lld\n", best);
    free(a);
    return 0;
}