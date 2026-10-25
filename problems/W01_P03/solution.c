#include <stdio.h>
#include <math.h>

int main() {
    int d, h, w;
    if (scanf("%d %d %d", &d, &h, &w) != 3) return 0;
    double base = 0;
    if (d <= 1) {
        base = 12000;
    } else if (d <= 10) {
        base = 12000 + (d - 1) * 10500;
    } else if (d <= 30) {
        base = 12000 + 9 * 10500 + (d - 10) * 9000;
    } else {
        base = 12000 + 9 * 10500 + 20 * 9000 + (d - 30) * 7500;
    }
    
    if (h >= 22 || h < 5 || (h >= 17 && h < 20)) {
        base = round(base * 1.15);
    }
    
    long long wait_fee = 0;
    if (w > 5) {
        wait_fee = (long long)(w - 5) * 500;
    }
    
    long long total = (long long)base + wait_fee;
    printf("%lld\n", total);
    return 0;
}
