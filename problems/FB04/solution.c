#include <stdio.h>
#include <math.h>

int main() {
    long long L, R;
    if (scanf("%lld %lld", &L, &R) == 2) {
        long long start = (long long)ceil(sqrt((double)L));
        long long end = (long long)floor(sqrt((double)R));
        if (start <= end) {
            printf("%lld\n", end - start + 1);
        } else {
            printf("0\n");
        }
    }
    return 0;
}
