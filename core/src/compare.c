#include <ctype.h>
#include <stdio.h>

#include "judge.h"

static int skip_spaces(FILE *f) {
    int c;
    do {
        c = fgetc(f);
    } while (c != EOF && isspace(c));
    return c;
}

/* So khớp theo từng token, bỏ qua khác biệt khoảng trắng/xuống dòng (giống checker mặc định của CF). */
int judge_compare_files(const char *expected, const char *actual) {
    FILE *fa = fopen(expected, "rb");
    FILE *fb = fopen(actual, "rb");
    if (!fa || !fb) {
        if (fa) fclose(fa);
        if (fb) fclose(fb);
        return 0;
    }

    int equal = 1;
    int ca = skip_spaces(fa), cb = skip_spaces(fb);
    while (ca != EOF || cb != EOF) {
        if (ca == EOF || cb == EOF) {
            equal = 0;
            break;
        }
        while (ca != EOF && cb != EOF && !isspace(ca) && !isspace(cb)) {
            if (ca != cb) {
                equal = 0;
                goto done;
            }
            ca = fgetc(fa);
            cb = fgetc(fb);
        }
        int end_a = (ca == EOF || isspace(ca));
        int end_b = (cb == EOF || isspace(cb));
        if (end_a != end_b) {
            equal = 0;
            break;
        }
        if (ca != EOF) ca = skip_spaces(fa);
        if (cb != EOF) cb = skip_spaces(fb);
    }
done:
    fclose(fa);
    fclose(fb);
    return equal;
}
