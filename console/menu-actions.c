#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "app.h"
#include "scoreboard.h"
#include "ui.h"

#define HISTORY_LIMIT 20
#define COMPILE_LOG_PREVIEW 1500

static int is_valid_username(const char *s) {
    size_t n = strlen(s);
    if (n < 3 || n > 24) return 0;
    for (size_t i = 0; i < n; i++) {
        if (!isalnum((unsigned char)s[i]) && s[i] != '_') return 0;
    }
    return 1;
}

int action_login(app_t *app) {
    char name[64];
    for (;;) {
        if (ui_read_line("Nhap ten nguoi dung (3-24 ky tu, chu/so/_): ", name, sizeof name) < 0) {
            return 0;
        }
        if (is_valid_username(name)) break;
        printf(C_RED "  Ten khong hop le.\n" C_RESET);
    }
    snprintf(app->user, sizeof app->user, "%s", name);
    return 1;
}

void action_switch_user(app_t *app) {
    action_login(app);
}

void action_list_problems(app_t *app) {
    printf(C_BOLD "%-6s %-8s %-8s %-6s %s\n" C_RESET, "Ma", "Time", "Memory", "Test", "Ten de");
    for (int i = 0; i < app->problems.count; i++) {
        const problem_t *p = &app->problems.items[i];
        printf("%-6s %5d ms %5d MB %-6d %s\n", p->id, p->time_ms, p->memory_mb, p->test_count,
               p->title);
    }
}

/* So khớp không phân biệt hoa thường với chữ ASCII, chữ có dấu phải gõ đúng dấu. */
static int contains_nocase(const char *text, const char *word) {
    size_t n = strlen(word);
    for (; *text; text++) {
        size_t i = 0;
        while (i < n && text[i] &&
               tolower((unsigned char)text[i]) == tolower((unsigned char)word[i])) {
            i++;
        }
        if (i == n) return 1;
    }
    return 0;
}

void action_search_problems(app_t *app) {
    char word[128];
    if (ui_read_line("Tu khoa (ma hoac ten de): ", word, sizeof word) <= 0) return;
    int found = 0;
    for (int i = 0; i < app->problems.count; i++) {
        const problem_t *p = &app->problems.items[i];
        if (contains_nocase(p->id, word) || contains_nocase(p->title, word)) {
            printf("%-8s %5d ms %5d MB %-6d %s\n", p->id, p->time_ms, p->memory_mb, p->test_count,
                   p->title);
            found++;
        }
    }
    if (found) printf(C_GRAY "\nTim thay %d de.\n" C_RESET, found);
    else printf(C_RED "Khong tim thay de nao.\n" C_RESET);
}

static const problem_t *ask_problem(app_t *app) {
    char id[16];
    if (ui_read_line("Ma de (vd P01): ", id, sizeof id) <= 0) return NULL;
    for (char *c = id; *c; c++) *c = (char)toupper((unsigned char)*c);
    const problem_t *p = problem_list_find(&app->problems, id);
    if (!p) printf(C_RED "Khong tim thay de %s\n" C_RESET, id);
    return p;
}

void action_view_statement(app_t *app) {
    const problem_t *p = ask_problem(app);
    if (!p) return;
    char path[MJ_PATH_MAX];
    mj_path_join(path, sizeof path, p->dir, "statement.md");
    char *text = mj_read_file(path, NULL);
    if (!text) {
        printf(C_RED "De %s chua co statement.md\n" C_RESET, p->id);
        return;
    }
    printf(C_BOLD "[%s] %s" C_RESET "  (%d ms, %d MB)\n\n%s\n", p->id, p->title, p->time_ms,
           p->memory_mb, text);
    free(text);
}

static void print_report(const judge_report_t *rep) {
    if (rep->verdict == VERDICT_CE) {
        printf(C_BLUE C_BOLD "Compilation Error\n" C_RESET);
        if (rep->compile_log) printf("%.*s\n", COMPILE_LOG_PREVIEW, rep->compile_log);
        return;
    }
    for (int i = 0; i < rep->test_count; i++) {
        const run_result_t *r = &rep->tests[i];
        printf("  Test %-3d %s%-4s" C_RESET " %5d ms %8ld KB\n", i + 1, ui_verdict_color(r->verdict),
               verdict_code(r->verdict), r->time_ms, r->memory_kb);
    }
    printf("\nKet qua: %s" C_BOLD "%s" C_RESET " (%d/%d test, %d ms, %ld KB)\n",
           ui_verdict_color(rep->verdict), verdict_name(rep->verdict), rep->tests_passed,
           rep->test_count, rep->max_time_ms, rep->max_memory_kb);
}

void action_submit(app_t *app) {
    const problem_t *p = ask_problem(app);
    if (!p) return;

    char path[MJ_PATH_MAX];
    if (ui_read_path("Duong dan file .c (co the keo tha file vao): ", path, sizeof path) <= 0) return;
    if (!mj_file_exists(path)) {
        printf(C_RED "Khong mo duoc file: %s\n" C_RESET, path);
        return;
    }

    printf(C_GRAY "Dang bien dich va cham %d test...\n" C_RESET, p->test_count);
    fflush(stdout);
    judge_report_t rep;
    if (judge_submission(p, path, app->work_dir, &rep) != 0) rep.verdict = VERDICT_IE;
    print_report(&rep);

    submission_t s;
    memset(&s, 0, sizeof s);
    snprintf(s.user, sizeof s.user, "%s", app->user);
    snprintf(s.problem_id, sizeof s.problem_id, "%s", p->id);
    s.verdict = rep.verdict;
    s.time_ms = rep.max_time_ms;
    s.memory_kb = rep.max_memory_kb;
    s.tests_passed = rep.tests_passed;
    s.test_count = p->test_count;
    s.submitted_at = (long long)time(NULL);
    if (store_append(app->store_path, &app->submissions, &s) != 0) {
        printf(C_RED "Canh bao: khong luu duoc bai nop vao file!\n" C_RESET);
    } else {
        printf(C_GRAY "Da luu bai nop #%d\n" C_RESET, s.id);
    }
    judge_report_free(&rep);
}

void action_history(app_t *app) {
    printf(C_BOLD "%-5s %-19s %-6s %-22s %-7s %8s %10s\n" C_RESET, "#", "Thoi gian", "De",
           "Ket qua", "Test", "Time", "Memory");
    int shown = 0;
    for (int i = app->submissions.count - 1; i >= 0 && shown < HISTORY_LIMIT; i--) {
        const submission_t *s = &app->submissions.items[i];
        if (strcmp(s->user, app->user) != 0) continue;
        char when[32];
        time_t t = (time_t)s->submitted_at;
        struct tm *tm = localtime(&t);
        if (!tm || !strftime(when, sizeof when, "%d/%m/%Y %H:%M:%S", tm)) strcpy(when, "?");
        printf("%-5d %-19s %-6s %s%-22s" C_RESET " %3d/%-3d %5d ms %7ld KB\n", s->id, when,
               s->problem_id, ui_verdict_color((verdict_t)s->verdict),
               verdict_name((verdict_t)s->verdict), s->tests_passed, s->test_count, s->time_ms,
               (long)s->memory_kb);
        shown++;
    }
    if (shown == 0) printf(C_GRAY "Ban chua nop bai nao.\n" C_RESET);
}

void action_scoreboard(app_t *app) {
    scoreboard_t sb;
    if (scoreboard_build(&app->submissions, &app->problems, &sb) != 0) {
        printf(C_RED "Khong du bo nho de tao bang xep hang.\n" C_RESET);
        return;
    }
    printf(C_BOLD "%-4s %-24s %-6s %-8s", "Hang", "Nguoi dung", "Giai", "Penalty");
    for (int j = 0; j < sb.problem_count; j++) printf(" %-6s", app->problems.items[j].id);
    printf("\n" C_RESET);

    for (int i = 0; i < sb.count; i++) {
        const score_row_t *row = &sb.rows[i];
        const char *mark = strcmp(row->user, app->user) == 0 ? C_BOLD : "";
        printf("%s%-4d %-24s %-6d %-8lld" C_RESET, mark, i + 1, row->user, row->solved, row->penalty);
        for (int j = 0; j < sb.problem_count; j++) {
            const score_cell_t *c = &row->cells[j];
            char cell[16];
            if (c->solved) {
                if (c->wrong) snprintf(cell, sizeof cell, "+%d", c->wrong);
                else snprintf(cell, sizeof cell, "+");
                printf(" " C_GREEN "%-6s" C_RESET, cell);
            } else if (c->wrong) {
                snprintf(cell, sizeof cell, "-%d", c->wrong);
                printf(" " C_RED "%-6s" C_RESET, cell);
            } else {
                printf(" " C_GRAY "%-6s" C_RESET, ".");
            }
        }
        printf("\n");
    }
    if (sb.count == 0) printf(C_GRAY "Chua co bai nop nao.\n" C_RESET);
    scoreboard_free(&sb);
}
