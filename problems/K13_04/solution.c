#include <stdio.h>
#include <stdbool.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int a[105];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int min1 = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < min1) min1 = a[i];
    }
    bool found = false;
    int min2 = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > min1) {
            if (!found || a[i] < min2) {
                min2 = a[i];
                found = true;
            }
        }
    }
    if (!found) printf("NONE\n");
    else printf("%d\n", min2);
    return 0;
}
