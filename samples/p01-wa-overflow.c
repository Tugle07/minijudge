#include <stdio.h>

int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 1;
    short sum = (short)(a + b);
    printf("%d\n", sum);
    return 0;
}
