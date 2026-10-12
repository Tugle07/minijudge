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
