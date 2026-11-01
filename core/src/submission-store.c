#include "submission-store.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

_Static_assert(sizeof(submission_t) == 88, "submission_t phai co dung 88 byte");

static const char STORE_MAGIC[4] = {'M', 'J', 'S', '2'};

static int list_push(submission_list_t *list, const submission_t *s) {
    if (list->count == list->capacity) {
        int cap = list->capacity ? list->capacity * 2 : 16;
        submission_t *tmp = realloc(list->items, (size_t)cap * sizeof *tmp);
        if (!tmp) return -1;
        list->items = tmp;
        list->capacity = cap;
    }
    list->items[list->count++] = *s;
    return 0;
}

int store_load(const char *path, submission_list_t *list) {
    memset(list, 0, sizeof *list);
    FILE *f = fopen(path, "rb");
    if (!f) return 0;

    char magic[4];
    if (fread(magic, 1, sizeof magic, f) != sizeof magic ||
        memcmp(magic, STORE_MAGIC, sizeof magic) != 0) {
        fclose(f);
        return -1;
    }
    submission_t s;
    size_t got;
    while ((got = fread(&s, 1, sizeof s, f)) == sizeof s) {
        if (list_push(list, &s) != 0) {
            fclose(f);
            store_free(list);
            return -1;
        }
    }
    fclose(f);
    if (got != 0) { /* Bản ghi cuối bị cụt: báo lỗi để lần ghi sau không làm lệch dữ liệu. */
        store_free(list);
        return -1;
    }
    return 0;
}

int store_append(const char *path, submission_list_t *list, submission_t *s) {
    s->id = list->count ? list->items[list->count - 1].id + 1 : 1;
    int fresh = !mj_file_exists(path);

    FILE *f = fopen(path, "ab");
    if (!f) return -1;
    if (fresh && fwrite(STORE_MAGIC, 1, sizeof STORE_MAGIC, f) != sizeof STORE_MAGIC) {
        fclose(f);
        return -1;
    }
    if (fwrite(s, sizeof *s, 1, f) != 1) {
        fclose(f);
        return -1;
    }
    if (fclose(f) != 0) return -1;
    return list_push(list, s);
}

void store_free(submission_list_t *list) {
    free(list->items);
    list->items = NULL;
    list->count = list->capacity = 0;
}
