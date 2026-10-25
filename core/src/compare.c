#include <ctype.h>
#include <stdio.h>

#include "judge.h"

static int get_next_char(FILE *f) {
    int c;
    while ((c = fgetc(f)) != EOF) {
        if (c != '\r') return c; /* Bỏ qua \r (chuẩn hóa Windows line ending CRLF -> LF) */
    }
    return EOF;
}

/* So khớp nghiêm ngặt theo từng dòng:
 * - Nội dung từng dòng và khoảng trắng phải khớp chính xác (không chấp nhận thừa/thiếu khoảng trắng, không dồn dòng).
 * - Bỏ qua \r của Windows CRLF.
 * - Cho phép thiếu hoặc thừa ký tự xuống dòng '\n' ở cuối cùng của file (EOF). */
int judge_compare_files(const char *expected, const char *actual) {
    FILE *fa = fopen(expected, "rb");
    FILE *fb = fopen(actual, "rb");
    if (!fa || !fb) {
        if (fa) fclose(fa);
        if (fb) fclose(fb);
        return 0;
    }

    int ca = get_next_char(fa);
    int cb = get_next_char(fb);

    while (ca != EOF && cb != EOF) {
        if (ca != cb) {
            fclose(fa);
            fclose(fb);
            return 0;
        }
        ca = get_next_char(fa);
        cb = get_next_char(fb);
    }

    /* Bỏ qua các dòng trống / xuống dòng dư ở cuối file */
    while (ca == '\n') ca = get_next_char(fa);
    while (cb == '\n') cb = get_next_char(fb);

    int ok = (ca == EOF && cb == EOF);
    fclose(fa);
    fclose(fb);
    return ok;
}
