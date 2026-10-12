#include <stdio.h>

int main(void) {
    volatile unsigned long long x = 0;
    for (;;) x++;
    return 0;
}