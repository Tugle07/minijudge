#include "scoreboard.h"

#include <stdlib.h>
#include <string.h>

#define PENALTY_PER_WRONG 20

static score_row_t *find_or_add_row(scoreboard_t *sb, const char *user) {
    for (int i = 0; i < sb->count; i++) {
        if (strcmp(sb->rows[i].user, user) == 0) return &sb->rows[i];
    }
    if (sb->count == sb->capacity) {
        int cap = sb->capacity ? sb->capacity * 2 : 8;
        score_row_t *tmp = realloc(sb->rows, (size_t)cap * sizeof *tmp);
        if (!tmp) return NULL;
        sb->rows = tmp;
        sb->capacity = cap;
    }
    score_row_t *row = &sb->rows[sb->count];
    memset(row, 0, sizeof *row);
    row->cells = calloc((size_t)(sb->problem_count > 0 ? sb->problem_count : 1), sizeof *row->cells);
    if (!row->cells) return NULL;
    memcpy(row->user, user, sizeof row->user);
    row->user[sizeof row->user - 1] = '\0';
    sb->count++;
    return row;
}

static int compare_rows(const void *a, const void *b) {
    const score_row_t *x = a, *y = b;
    if (x->solved != y->solved) return y->solved - x->solved;
    if (x->penalty != y->penalty) return x->penalty < y->penalty ? -1 : 1;
    return strcmp(x->user, y->user);
}

int scoreboard_build(const submission_list_t *subs, const problem_list_t *problems,
                     scoreboard_t *sb) {
    memset(sb, 0, sizeof *sb);
    sb->problem_count = problems->count;

    long long start = 0;
    for (int i = 0; i < subs->count; i++) {
        if (i == 0 || subs->items[i].submitted_at < start) start = subs->items[i].submitted_at;
    }

    for (int i = 0; i < subs->count; i++) {
        const submission_t *s = &subs->items[i];
        int pi = problem_list_index(problems, s->problem_id);
        if (pi < 0 || s->verdict == VERDICT_CE || s->verdict == VERDICT_IE) continue;

        score_row_t *row = find_or_add_row(sb, s->user);
        if (!row) {
            scoreboard_free(sb);
            return -1;
        }
        score_cell_t *cell = &row->cells[pi];
        if (cell->solved) continue;
        if (s->verdict == VERDICT_AC) {
            cell->solved = 1;
            cell->ac_minute = (s->submitted_at - start) / 60;
            row->solved++;
            row->penalty += cell->ac_minute + (long long)PENALTY_PER_WRONG * cell->wrong;
        } else {
            cell->wrong++;
        }
    }

    if (sb->count > 1) qsort(sb->rows, (size_t)sb->count, sizeof *sb->rows, compare_rows);
    return 0;
}

void scoreboard_free(scoreboard_t *sb) {
    for (int i = 0; i < sb->count; i++) free(sb->rows[i].cells);
    free(sb->rows);
    sb->rows = NULL;
    sb->count = sb->capacity = 0;
}
