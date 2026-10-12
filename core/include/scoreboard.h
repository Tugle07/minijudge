#ifndef MJ_SCOREBOARD_H
#define MJ_SCOREBOARD_H

#include "problem.h"
#include "submission-store.h"

typedef struct {
    int solved;
    int wrong;           /* số lần sai trước khi AC */
    long long ac_minute; /* phút AC tính từ lúc bắt đầu */
} score_cell_t;

typedef struct {
    char user[32];
    int solved;
    long long penalty;
    score_cell_t *cells; /* problem_count phần tử */
} score_row_t;

typedef struct {
    score_row_t *rows;
    int count;
    int capacity;
    int problem_count;
} scoreboard_t;

/* Luật ICPC: xếp theo số bài giải được giảm dần, rồi penalty tăng dần.
 * penalty = phút AC + 20 * số lần sai trước đó (không tính CE/IE). */
int scoreboard_build(const submission_list_t *subs, const problem_list_t *problems,
                     scoreboard_t *sb);
void scoreboard_free(scoreboard_t *sb);

#endif
