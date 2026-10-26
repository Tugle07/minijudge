#include <stdio.h>
#include <stdbool.h>

bool is_prime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int count = 0;
    for (int i = 0; i < n; i++) {
        if (is_prime(a[i])) count++;
    }
    printf("%d\n", count);
    return 0;
}
