#include <stdio.h>

int main() {
    long long n;
    if (scanf("%lld", &n) == 1) {
        if (n < 0) {
            printf("NO\n");
            return 0;
        }
        long long temp = n;
        long long rev = 0;
        while (temp > 0) {
            rev = rev * 10 + (temp % 10);
            temp /= 10;
        }
        if (rev == n) printf("YES\n");
        else printf("NO\n");
    }
    return 0;
}
