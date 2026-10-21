#ifndef MJ_JUDGE_H
#define MJ_JUDGE_H

#include "problem.h"

typedef enum {
    VERDICT_AC,
    VERDICT_WA,
    VERDICT_TLE,
    VERDICT_MLE,
    VERDICT_RE,
    VERDICT_CE,
    VERDICT_IE,
    VERDICT_PENDING,
    VERDICT_COUNT
} verdict_t;

typedef struct {
    int time_ms;
    int memory_mb;
} judge_limits_t;

typedef struct {
    verdict_t verdict;
    int time_ms;
    long memory_kb;
    int exit_code;
} run_result_t;

typedef struct {
    verdict_t verdict;
    int test_count;      /* số test đã chạy */
    int tests_passed;
    int max_time_ms;
    long max_memory_kb;
    run_result_t *tests; /* mảng động test_count phần tử */
    char *compile_log;   /* chuỗi động, có thể NULL */
    char *fail_output;   /* output (cắt ngắn) của test đầu tiên bị WA, có thể NULL */
} judge_report_t;

#define JUDGE_OUTPUT_PREVIEW 4096

const char *verdict_code(verdict_t v);
const char *verdict_name(verdict_t v);

int judge_compile(const char *source, const char *exe, const char *log_path, char **log_out);

/* Cài đặt riêng cho từng hệ điều hành: run-windows.c / run-posix.c.
 * Trả về 0 nếu chạy được; r->verdict = AC nghĩa là chạy xong hợp lệ, chưa so output. */
int judge_run(const char *exe, const char *in_path, const char *out_path,
              const judge_limits_t *lim, run_result_t *r);

int judge_compare_files(const char *expected, const char *actual);

/* 0 (mặc định): dừng ở test sai đầu tiên. 1: chạy hết mọi test (chấm điểm theo subtask). */
extern int judge_run_all;

int judge_submission(const problem_t *p, const char *source, const char *work_dir,
                     judge_report_t *rep);
void judge_report_free(judge_report_t *rep);

/* Chạy thử với input tự nhập (không so đáp án). r->verdict = CE nếu biên dịch lỗi,
 * AC nghĩa là chạy xong bình thường. *output là JUDGE_OUTPUT_PREVIEW byte đầu của stdout. */
int judge_run_custom(const char *source, const char *in_path, const char *work_dir,
                     const judge_limits_t *lim, run_result_t *r, char **output, char **compile_log);

#endif
