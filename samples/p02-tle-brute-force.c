#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n, k;
    if (scanf("%d %d", &n, &k) != 2) return 1;
    long long *a = malloc((size_t)n * sizeof *a);
    if (!a) return 1;
    for (int i = 0; i < n; i++) scanf("%lld", &a[i]);
    long long best = 0;
    int first = 1;
    for (int i = 0; i + k <= n; i++) {
        long long s = 0;
        for (int j = i; j < i + k; j++) s += a[j];
        if (first || s > best) best = s, first = 0;
    }
    printf("%lld\n", best);
    free(a);
    return 0;
}