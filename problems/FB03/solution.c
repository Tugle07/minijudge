#include <stdio.h>

int main() {
    long long t;
    if (scanf("%lld", &t) == 1) {
        long long days = t / 86400LL;
        long long rem = t % 86400LL;
        long long hours = rem / 3600LL;
        rem %= 3600LL;
        long long minutes = rem / 60LL;
        long long seconds = rem % 60LL;
        printf("%lld d %02lld:%02lld:%02lld\n", days, hours, minutes, seconds);
    }
    return 0;
}
