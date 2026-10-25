#include <stdio.h>

int main() {
    long long a, b, c;
    if (scanf("%lld %lld %lld", &a, &b, &c) == 3) {
        long long mid;
        if ((a >= b && a <= c) || (a >= c && a <= b)) mid = a;
        else if ((b >= a && b <= c) || (b >= c && b <= a)) mid = b;
        else mid = c;
        printf("%lld\n", mid);
    }
    return 0;
}
