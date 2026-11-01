#include "problem.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int problem_load(const char *root, const char *id, problem_t *p) {
    memset(p, 0, sizeof *p);
    if (!mj_is_valid_id(id)) return -1;

    snprintf(p->id, sizeof p->id, "%s", id);
    snprintf(p->title, sizeof p->title, "%s", id);
    mj_path_join(p->dir, sizeof p->dir, root, id);
    p->time_ms = 1000;
    p->memory_mb = 256;

    char cfg[MJ_PATH_MAX];
    mj_path_join(cfg, sizeof cfg, p->dir, "problem.txt");
    FILE *f = fopen(cfg, "r");
    if (!f) return -1;

    char line[256];
    while (fgets(line, sizeof line, f)) {
        mj_trim(line);
        char *eq = strchr(line, '=');
        if (!eq || line[0] == '#') continue;
        *eq = '\0';
        const char *key = line, *val = eq + 1;
        if (strcmp(key, "title") == 0) {
            size_t n = strlen(val);
            if (n >= sizeof p->title) n = sizeof p->title - 1;
            memcpy(p->title, val, n);
            p->title[n] = '\0';
        } else if (strcmp(key, "time_ms") == 0) {
            p->time_ms = atoi(val);
        } else if (strcmp(key, "memory_mb") == 0) {
            p->memory_mb = atoi(val);
        } else if (strcmp(key, "tests") == 0) {
            p->test_count = atoi(val);
        }
    }
    fclose(f);

    if (p->time_ms <= 0 || p->memory_mb <= 0 || p->test_count <= 0) return -1;
    return 0;
}

static int list_push(problem_list_t *list, const problem_t *p) {
    if (list->count == list->capacity) {
        int cap = list->capacity ? list->capacity * 2 : 8;
        problem_t *tmp = realloc(list->items, (size_t)cap * sizeof *tmp);
        if (!tmp) return -1;
        list->items = tmp;
        list->capacity = cap;
    }
    list->items[list->count++] = *p;
    return 0;
}

int problem_list_load(const char *root, problem_list_t *list) {
    memset(list, 0, sizeof *list);
    char index_path[MJ_PATH_MAX];
    mj_path_join(index_path, sizeof index_path, root, "index.txt");
    FILE *f = fopen(index_path, "r");
    if (!f) return -1;

    char line[64];
    while (fgets(line, sizeof line, f)) {
        mj_trim(line);
        if (line[0] == '\0' || line[0] == '#') continue;
        problem_t p;
        if (problem_load(root, line, &p) != 0) {
            fprintf(stderr, "Bo qua de '%s': khong doc duoc problem.txt\n", line);
            continue;
        }
        if (list_push(list, &p) != 0) {
            fclose(f);
            problem_list_free(list);
            return -1;
        }
    }
    fclose(f);
    return 0;
}

void problem_list_free(problem_list_t *list) {
    free(list->items);
    list->items = NULL;
    list->count = list->capacity = 0;
}

int problem_list_index(const problem_list_t *list, const char *id) {
    for (int i = 0; i < list->count; i++) {
        if (strcmp(list->items[i].id, id) == 0) return i;
    }
    return -1;
}

const problem_t *problem_list_find(const problem_list_t *list, const char *id) {
    int i = problem_list_index(list, id);
    return i < 0 ? NULL : &list->items[i];
}

void problem_test_paths(const problem_t *p, int index, char *in, char *ans, size_t size) {
    snprintf(in, size, "%s/tests/%d.in", p->dir, index);
    snprintf(ans, size, "%s/tests/%d.out", p->dir, index);
}

/* Ghi lại 4 khoá của chương trình, giữ nguyên các khoá khác (difficulty, samples...) của bản web. */
int problem_save(const problem_t *p) {
    char cfg[MJ_PATH_MAX];
    mj_path_join(cfg, sizeof cfg, p->dir, "problem.txt");
    char *old = mj_read_file(cfg, NULL);
    FILE *f = fopen(cfg, "w");
    if (!f) {
        free(old);
        return -1;
    }
    fprintf(f, "title=%s\ntime_ms=%d\nmemory_mb=%d\ntests=%d\n", p->title, p->time_ms, p->memory_mb,
            p->test_count);
    if (old) {
        for (char *line = strtok(old, "\n"); line; line = strtok(NULL, "\n")) {
            mj_trim(line);
            if (line[0] == '\0' || strncmp(line, "title=", 6) == 0 || strncmp(line, "time_ms=", 8) == 0 ||
                strncmp(line, "memory_mb=", 10) == 0 || strncmp(line, "tests=", 6) == 0) {
                continue;
            }
            fprintf(f, "%s\n", line);
        }
    }
    free(old);
    return fclose(f) == 0 ? 0 : -1;
}

int problem_add_test(problem_t *p, const char *in_src, const char *ans_src) {
    char dir[MJ_PATH_MAX], in[MJ_PATH_MAX], ans[MJ_PATH_MAX];
    mj_path_join(dir, sizeof dir, p->dir, "tests");
    if (mj_make_dir(dir) != 0) return -1;
    problem_test_paths(p, p->test_count + 1, in, ans, sizeof in);
    if (mj_copy_file(in_src, in) != 0 || mj_copy_file(ans_src, ans) != 0) {
        remove(in);
        remove(ans);
        return -1;
    }
    p->test_count++;
    if (problem_save(p) != 0) {
        p->test_count--;
        return -1;
    }
    return 0;
}

int problem_index_add(const char *root, const char *id) {
    char path[MJ_PATH_MAX];
    mj_path_join(path, sizeof path, root, "index.txt");
    size_t len = 0;
    char *old = mj_read_file(path, &len);
    int need_newline = old && len > 0 && old[len - 1] != '\n';
    free(old);
    FILE *f = fopen(path, "a");
    if (!f) return -1;
    fprintf(f, "%s%s\n", need_newline ? "\n" : "", id);
    return fclose(f) == 0 ? 0 : -1;
}

/* Chỉ bỏ mã đề khỏi index.txt, thư mục đề vẫn còn trên đĩa để khôi phục được. */
int problem_index_remove(const char *root, const char *id) {
    char path[MJ_PATH_MAX];
    mj_path_join(path, sizeof path, root, "index.txt");
    char *old = mj_read_file(path, NULL);
    if (!old) return -1;
    FILE *f = fopen(path, "w");
    if (!f) {
        free(old);
        return -1;
    }
    for (char *line = strtok(old, "\n"); line; line = strtok(NULL, "\n")) {
        mj_trim(line);
        if (strcmp(line, id) != 0) fprintf(f, "%s\n", line);
    }
    free(old);
    return fclose(f) == 0 ? 0 : -1;
}

int problem_list_add(problem_list_t *list, const problem_t *p) {
    return list_push(list, p);
}

void problem_list_remove(problem_list_t *list, int index) {
    memmove(&list->items[index], &list->items[index + 1],
            (size_t)(list->count - index - 1) * sizeof list->items[0]);
    list->count--;
}
