#include <stdio.h>

int main() {
    long long x[4], y[4];
    for (int i = 0; i < 4; i++) {
        if (scanf("%lld %lld", &x[i], &y[i]) != 2) return 0;
    }
    long long min_x = x[0], max_x = x[0];
    long long min_y = y[0], max_y = y[0];
    for (int i = 1; i < 4; i++) {
        if (x[i] < min_x) min_x = x[i];
        if (x[i] > max_x) max_x = x[i];
        if (y[i] < min_y) min_y = y[i];
        if (y[i] > max_y) max_y = y[i];
    }
    if (min_x == max_x || min_y == max_y) {
        printf("INVALID\n");
        return 0;
    }
    // Check that the multiset of points matches (min_x, min_y), (min_x, max_y), (max_x, min_y), (max_x, max_y)
    int found[4] = {0, 0, 0, 0};
    for (int i = 0; i < 4; i++) {
        if (x[i] == min_x && y[i] == min_y && !found[0]) found[0] = 1;
        else if (x[i] == min_x && y[i] == max_y && !found[1]) found[1] = 1;
        else if (x[i] == max_x && y[i] == min_y && !found[2]) found[2] = 1;
        else if (x[i] == max_x && y[i] == max_y && !found[3]) found[3] = 1;
        else {
            printf("INVALID\n");
            return 0;
        }
    }
    long long w = max_x - min_x;
    long long h = max_y - min_y;
    long long p = 2 * (w + h);
    long long s = w * h;
    printf("%lld\n%lld\n", p, s);
    return 0;
}
