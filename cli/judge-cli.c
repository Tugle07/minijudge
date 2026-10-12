#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "judge.h"

#define LOG_LIMIT 8192

static void json_string(const char *s, size_t limit) {
    if (!s) {
        fputs("null", stdout);
        return;
    }
    putchar('"');
    for (size_t i = 0; s[i] && i < limit; i++) {
        unsigned char c = (unsigned char)s[i];
        switch (c) {
        case '"': fputs("\\\"", stdout); break;
        case '\\': fputs("\\\\", stdout); break;
        case '\n': fputs("\\n", stdout); break;
        case '\r': fputs("\\r", stdout); break;
        case '\t': fputs("\\t", stdout); break;
        default:
            if (c < 0x20) printf("\\u%04x", c);
            else putchar(c);
        }
    }
    putchar('"');
}

static int usage(void) {
    fprintf(stderr,
            "Cach dung:\n"
            "  judge-cli <problems_dir> <problem_id> <source.c> [work_dir]\n"
            "  judge-cli --run <source.c> <input.txt> <work_dir> [time_ms] [memory_mb]\n");
    return 2;
}

/* Chạy thử với input tự nhập: in verdict OK/TLE/MLE/RE/CE kèm stdout (cắt ngắn). */
static int run_custom(int argc, char **argv) {
    if (argc < 5) return usage();
    judge_limits_t lim = {argc > 5 ? atoi(argv[5]) : 2000, argc > 6 ? atoi(argv[6]) : 256};
    if (lim.time_ms <= 0 || lim.time_ms > 10000) lim.time_ms = 2000;
    if (lim.memory_mb <= 0 || lim.memory_mb > 1024) lim.memory_mb = 256;

    run_result_t r;
    char *output = NULL, *log = NULL;
    int rc = judge_run_custom(argv[2], argv[3], argv[4], &lim, &r, &output, &log);
    const char *code = rc != 0 ? "IE" : r.verdict == VERDICT_AC ? "OK" : verdict_code(r.verdict);
    printf("{\"verdict\":\"%s\",\"time_ms\":%d,\"memory_kb\":%ld,\"exit_code\":%d,\"output\":", code,
           r.time_ms, r.memory_kb, r.exit_code);
    json_string(output ? output : "", JUDGE_OUTPUT_PREVIEW);
    printf(",\"truncated\":%s,\"compile_log\":", output && strlen(output) >= JUDGE_OUTPUT_PREVIEW ? "true" : "false");
    json_string(log ? log : "", LOG_LIMIT);
    printf("}\n");
    free(output);
    free(log);
    return rc == 0 ? 0 : 1;
}

/* Cầu nối cho web server: chấm 1 bài và in kết quả dạng JSON ra stdout. */
int main(int argc, char **argv) {
    if (argc >= 2 && strcmp(argv[1], "--run") == 0) return run_custom(argc, argv);
    if (argc < 4) return usage();
    const char *root = argv[1], *id = argv[2], *source = argv[3];
    const char *work = argc > 4 ? argv[4] : "judge-work";

    problem_t p;
    if (problem_load(root, id, &p) != 0) {
        printf("{\"verdict\":\"IE\",\"error\":\"problem not found\"}\n");
        return 2;
    }

    judge_report_t rep;
    int rc = judge_submission(&p, source, work, &rep);
    printf("{\"verdict\":\"%s\",\"time_ms\":%d,\"memory_kb\":%ld,\"tests_passed\":%d,"
           "\"test_count\":%d,\"tests\":[",
           verdict_code(rep.verdict), rep.max_time_ms, rep.max_memory_kb, rep.tests_passed,
           p.test_count);
    for (int i = 0; i < rep.test_count; i++) {
        const run_result_t *r = &rep.tests[i];
        printf("%s{\"verdict\":\"%s\",\"time_ms\":%d,\"memory_kb\":%ld}", i ? "," : "",
               verdict_code(r->verdict), r->time_ms, r->memory_kb);
    }
    printf("],\"compile_log\":");
    json_string(rep.compile_log ? rep.compile_log : "", LOG_LIMIT);
    printf(",\"fail_output\":");
    json_string(rep.fail_output, JUDGE_OUTPUT_PREVIEW);
    printf("}\n");

    judge_report_free(&rep);
    return rc == 0 ? 0 : 1;
}
