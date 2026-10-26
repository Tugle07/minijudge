#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    long long sum_neg = 0;
    int count_neg = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] < 0) {
            sum_neg += a[i];
            count_neg++;
        }
    }
    if (count_neg == 0) printf("NONE\n");
    else printf("%.2lf\n", (double)sum_neg / count_neg);
    return 0;
}
