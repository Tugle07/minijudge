#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    for (int i = 0; i < 64; i++) {
        char *block = malloc(16u * 1024 * 1024);
        if (!block) return 3;
        memset(block, 1, 16u * 1024 * 1024);
    }
    printf("0\n");
    return 0;
}