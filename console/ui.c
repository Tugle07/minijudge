#include "ui.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <windows.h>
#endif

void ui_init(void) {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
    HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD mode = 0;
    if (h != INVALID_HANDLE_VALUE && GetConsoleMode(h, &mode)) {
        SetConsoleMode(h, mode | 0x0004 /* ENABLE_VIRTUAL_TERMINAL_PROCESSING */);
    }
#endif
}

void ui_clear(void) {
    printf("\033[2J\033[H");
}

/* Đọc 1 dòng an toàn: nếu người dùng gõ dài hơn bộ đệm thì bỏ phần thừa (chống trôi lệnh). */
int ui_read_line(const char *prompt, char *buf, size_t size) {
    if (prompt) {
        printf("%s", prompt);
        fflush(stdout);
    }
    if (!fgets(buf, (int)size, stdin)) return -1;

    /* Bỏ UTF-8 BOM (EF BB BF) nếu input được chuyển hướng từ file lưu bằng Notepad/PowerShell. */
    if ((unsigned char)buf[0] == 0xEF && (unsigned char)buf[1] == 0xBB && (unsigned char)buf[2] == 0xBF) {
        memmove(buf, buf + 3, strlen(buf + 3) + 1);
    }
    char *nl = strchr(buf, '\n');
    if (nl) {
        *nl = '\0';
    } else {
        int c;
        while ((c = getchar()) != '\n' && c != EOF) {
        }
    }
    mj_trim(buf);
    return (int)strlen(buf);
}

int ui_read_int(const char *prompt, int min, int max, int *out) {
    char buf[64];
    for (;;) {
        if (ui_read_line(prompt, buf, sizeof buf) < 0) return -1;
        char *end;
        errno = 0;
        long v = strtol(buf, &end, 10);
        if (buf[0] != '\0' && *end == '\0' && errno == 0 && v >= min && v <= max) {
            *out = (int)v;
            return 0;
        }
        printf(C_RED "  Vui long nhap so nguyen tu %d den %d.\n" C_RESET, min, max);
    }
}

void ui_pause(void) {
    char buf[8];
    ui_read_line(C_GRAY "\nNhan Enter de tiep tuc..." C_RESET, buf, sizeof buf);
}

const char *ui_verdict_color(verdict_t v) {
    switch (v) {
    case VERDICT_AC: return C_GREEN;
    case VERDICT_WA: return C_RED;
    case VERDICT_TLE:
    case VERDICT_MLE: return C_YELLOW;
    case VERDICT_RE: return C_CYAN;
    case VERDICT_CE: return C_BLUE;
    default: return C_GRAY;
    }
}
