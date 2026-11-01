#ifndef MJ_SUBMISSION_STORE_H
#define MJ_SUBMISSION_STORE_H

#include <stdint.h>

#include "judge.h"

/* Bản ghi 88 byte, không có byte đệm, giống nhau trên Windows và Linux. */
typedef struct {
    int32_t id;
    char user[32];
    char problem_id[16];
    int32_t verdict; /* verdict_t */
    int32_t time_ms;
    int32_t tests_passed;
    int32_t test_count;
    int32_t reserved;
    int64_t memory_kb;
    int64_t submitted_at; /* Unix time (giây) */
} submission_t;

typedef struct {
    submission_t *items;
    int count;
    int capacity;
} submission_list_t;

/* File nhị phân: 4 byte magic "MJS2" + dãy bản ghi submission_t (fread/fwrite). */
int store_load(const char *path, submission_list_t *list);
int store_append(const char *path, submission_list_t *list, submission_t *s);
void store_free(submission_list_t *list);

#endif
