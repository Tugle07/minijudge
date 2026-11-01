#ifndef MJ_PROBLEM_H
#define MJ_PROBLEM_H

#include <stddef.h>

#include "util.h"

typedef struct {
    char id[16];
    char title[128];
    int time_ms;
    int memory_mb;
    int test_count;
    char dir[MJ_DIR_MAX];
} problem_t;

/* Mảng động các đề bài, tự giãn bằng realloc. */
typedef struct {
    problem_t *items;
    int count;
    int capacity;
} problem_list_t;

int problem_load(const char *root, const char *id, problem_t *p);
int problem_list_load(const char *root, problem_list_t *list);
void problem_list_free(problem_list_t *list);
const problem_t *problem_list_find(const problem_list_t *list, const char *id);
int problem_list_index(const problem_list_t *list, const char *id);
void problem_test_paths(const problem_t *p, int index, char *in, char *ans, size_t size);

/* Quản lý đề: ghi xuống problem.txt và index.txt. */
int problem_save(const problem_t *p);
int problem_add_test(problem_t *p, const char *in_src, const char *ans_src);
int problem_index_add(const char *root, const char *id);
int problem_index_remove(const char *root, const char *id);
int problem_list_add(problem_list_t *list, const problem_t *p);
void problem_list_remove(problem_list_t *list, int index);

#endif
