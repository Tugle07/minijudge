#ifndef MJ_SUBMISSION_STORE_H
#define MJ_SUBMISSION_STORE_H

#include "judge.h"

typedef struct {
    int id;
    char user[32];
    char problem_id[16];
    int verdict; /* verdict_t */
    int time_ms;
    long memory_kb;
    int tests_passed;
    int test_count;
    long long submitted_at; /* Unix time (giây) */
} submission_t;

typedef struct {
    submission_t *items;
    int count;
    int capacity;
} submission_list_t;

/* File nhị phân: 4 byte magic "MJS1" + dãy bản ghi submission_t (fread/fwrite). */
int store_load(const char *path, submission_list_t *list);
int store_append(const char *path, submission_list_t *list, submission_t *s);
void store_free(submission_list_t *list);

#endif
