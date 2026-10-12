#include "util.h"

#include <ctype.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <direct.h>
#else
#include <sys/stat.h>
#include <sys/types.h>
#endif

char *mj_read_file(const char *path, size_t *len) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;

    size_t cap = 4096, n = 0, r;
    char *buf = malloc(cap);
    if (!buf) {
        fclose(f);
        return NULL;
    }
    while ((r = fread(buf + n, 1, cap - n - 1, f)) > 0) {
        n += r;
        if (n + 1 >= cap) {
            char *tmp = realloc(buf, cap * 2);
            if (!tmp) {
                free(buf);
                fclose(f);
                return NULL;
            }
            buf = tmp;
            cap *= 2;
        }
    }
    fclose(f);
    buf[n] = '\0';
    if (len) *len = n;
    return buf;
}

char *mj_read_prefix(const char *path, size_t max) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    char *buf = malloc(max + 1);
    if (!buf) {
        fclose(f);
        return NULL;
    }
    size_t n = fread(buf, 1, max, f);
    fclose(f);
    buf[n] = '\0';
    return buf;
}

/* Đọc hết vào bộ nhớ rồi mới ghi: an toàn cả khi src và dst là cùng một file
 * (vd "work\1\main.c" và "work/1/main.c"), tránh mở "wb" làm rỗng file nguồn. */
int mj_copy_file(const char *src, const char *dst) {
    size_t len;
    char *data = mj_read_file(src, &len);
    if (!data) return -1;
    FILE *out = fopen(dst, "wb");
    if (!out) {
        free(data);
        return -1;
    }
    int rc = fwrite(data, 1, len, out) == len ? 0 : -1;
    if (fclose(out) != 0) rc = -1;
    free(data);
    return rc;
}

int mj_file_exists(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return 0;
    fclose(f);
    return 1;
}

int mj_make_dir(const char *path) {
#ifdef _WIN32
    int rc = _mkdir(path);
#else
    int rc = mkdir(path, 0755);
#endif
    return (rc == 0 || errno == EEXIST) ? 0 : -1;
}

void mj_path_join(char *out, size_t size, const char *a, const char *b) {
    snprintf(out, size, "%s/%s", a, b);
}

void mj_trim(char *s) {
    size_t n = strlen(s);
    while (n > 0 && isspace((unsigned char)s[n - 1])) s[--n] = '\0';
    size_t i = 0;
    while (s[i] && isspace((unsigned char)s[i])) i++;
    if (i > 0) memmove(s, s + i, n - i + 1);
}

/* Mã đề chỉ gồm chữ, số, '_' để chặn path traversal (vd "../../etc"). */
int mj_is_valid_id(const char *id) {
    size_t n = strlen(id);
    if (n == 0 || n >= 16) return 0;
    for (size_t i = 0; i < n; i++) {
        if (!isalnum((unsigned char)id[i]) && id[i] != '_') return 0;
    }
    return 1;
}
