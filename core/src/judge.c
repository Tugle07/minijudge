#include "judge.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef _WIN32
#include <sys/stat.h>
#endif

typedef enum {
    LANG_C,
    LANG_CPP,
    LANG_PYTHON
} lang_t;

static lang_t detect_lang(const char *path) {
    if (!path) return LANG_C;
    const char *dot = strrchr(path, '.');
    if (!dot) return LANG_C;
    if (strcmp(dot, ".cpp") == 0 || strcmp(dot, ".cc") == 0 || strcmp(dot, ".cxx") == 0) return LANG_CPP;
    if (strcmp(dot, ".py") == 0) return LANG_PYTHON;
    return LANG_C;
}

static const char *CODES[VERDICT_COUNT] = {"AC", "WA", "TLE", "MLE", "RE", "CE", "IE", "PENDING"};

static const char *NAMES[VERDICT_COUNT] = {
    "Accepted",        "Wrong Answer",      "Time Limit Exceeded", "Memory Limit Exceeded",
    "Runtime Error",   "Compilation Error", "Internal Error",      "Pending"};

int judge_run_all = 0;

const char *verdict_code(verdict_t v) {
    return (unsigned)v < VERDICT_COUNT ? CODES[v] : "IE";
}

const char *verdict_name(verdict_t v) {
    return (unsigned)v < VERDICT_COUNT ? NAMES[v] : "Internal Error";
}

int judge_compile(const char *source, const char *exe, const char *log_path, char **log_out) {
    char cmd[MJ_PATH_MAX * 4];
    lang_t lang = detect_lang(source);
    remove(exe);

    if (lang == LANG_CPP) {
#ifdef _WIN32
        const char *extra = "-Wl,--stack,268435456";
#else
        const char *extra = "";
#endif
        snprintf(cmd, sizeof cmd, "g++ -std=c++17 -O2 -Wall %s -o \"%s\" \"%s\" -lm 2> \"%s\"", extra, exe,
                 source, log_path);
        int rc = system(cmd);
        if (log_out) *log_out = mj_read_file(log_path, NULL);
        return (rc == 0 && mj_file_exists(exe)) ? 0 : -1;
    } else if (lang == LANG_PYTHON) {
        snprintf(cmd, sizeof cmd, "python3 -m py_compile \"%s\" 2> \"%s\"", source, log_path);
        int rc = system(cmd);
        if (rc != 0) {
            if (log_out) *log_out = mj_read_file(log_path, NULL);
            return -1;
        }
#ifdef _WIN32
        FILE *f = fopen(exe, "w");
        if (!f) return -1;
        fprintf(f, "@python \"%s\" %%*\n", source);
        fclose(f);
#else
        FILE *f = fopen(exe, "w");
        if (!f) return -1;
        fprintf(f, "#!/usr/bin/python3 -u\n");
        char *code = mj_read_file(source, NULL);
        if (code) {
            fputs(code, f);
            free(code);
        }
        fclose(f);
        chmod(exe, 0755);
#endif
        if (log_out) *log_out = mj_read_file(log_path, NULL);
        return mj_file_exists(exe) ? 0 : -1;
    } else {
#ifdef _WIN32
        const char *extra = "-Wl,--stack,268435456";
#else
        const char *extra = "";
#endif
        snprintf(cmd, sizeof cmd, "gcc -std=c11 -O2 -Wall %s -o \"%s\" \"%s\" -lm 2> \"%s\"", extra, exe,
                 source, log_path);
        int rc = system(cmd);
        if (log_out) *log_out = mj_read_file(log_path, NULL);
        return (rc == 0 && mj_file_exists(exe)) ? 0 : -1;
    }
}

/* Chép mã nguồn vào work_dir/main.<ext> rồi biên dịch / chuẩn bị file chạy.
 * Trả về 0 nếu thành công, 1 nếu lỗi biên dịch, -1 nếu lỗi hệ thống. */
static int prepare_executable(const char *source, const char *work_dir, char *exe, size_t exe_size,
                              char **compile_log) {
    if (mj_make_dir(work_dir) != 0) return -1;
    char src[MJ_PATH_MAX], log[MJ_PATH_MAX];
    lang_t lang = detect_lang(source);
    const char *ext = (lang == LANG_CPP) ? ".cpp" : (lang == LANG_PYTHON) ? ".py" : ".c";
    snprintf(src, sizeof src, "%s/main%s", work_dir, ext);
    snprintf(exe, exe_size, "%s/main%s", work_dir, MJ_EXE_EXT);
    snprintf(log, sizeof log, "%s/compile.log", work_dir);
    if (mj_copy_file(source, src) != 0) return -1;
    return judge_compile(src, exe, log, compile_log) == 0 ? 0 : 1;
}

int judge_submission(const problem_t *p, const char *source, const char *work_dir,
                     judge_report_t *rep) {
    memset(rep, 0, sizeof *rep);
    rep->verdict = VERDICT_IE;

    char exe[MJ_PATH_MAX];
    int rc = prepare_executable(source, work_dir, exe, sizeof exe, &rep->compile_log);
    if (rc < 0) return -1;
    if (rc > 0) {
        rep->verdict = VERDICT_CE;
        return 0;
    }

    rep->tests = calloc((size_t)p->test_count, sizeof *rep->tests);
    if (!rep->tests) return -1;

    lang_t lang = detect_lang(source);
    judge_limits_t lim = {p->time_ms, p->memory_mb};
    if (lang == LANG_PYTHON) {
        lim.time_ms = p->time_ms * 2 + 500;
        lim.memory_mb = p->memory_mb < 128 ? 128 : p->memory_mb * 2;
    }
    rep->verdict = VERDICT_AC;
    for (int i = 1; i <= p->test_count; i++) {
        char in[MJ_PATH_MAX], ans[MJ_PATH_MAX], out[MJ_PATH_MAX];
        problem_test_paths(p, i, in, ans, sizeof in);
        snprintf(out, sizeof out, "%s/out-%d.txt", work_dir, i);

        run_result_t *r = &rep->tests[i - 1];
        if (judge_run(exe, in, out, &lim, r) != 0) {
            r->verdict = VERDICT_IE;
        } else if (r->verdict == VERDICT_AC && !judge_compare_files(ans, out)) {
            r->verdict = VERDICT_WA;
            if (!rep->fail_output) rep->fail_output = mj_read_prefix(out, JUDGE_OUTPUT_PREVIEW);
        }
        remove(out);

        rep->test_count = i;
        if (r->time_ms > rep->max_time_ms) rep->max_time_ms = r->time_ms;
        if (r->memory_kb > rep->max_memory_kb) rep->max_memory_kb = r->memory_kb;
        if (r->verdict != VERDICT_AC) {
            if (rep->verdict == VERDICT_AC) rep->verdict = r->verdict;
            if (!judge_run_all) break;
            continue;
        }
        rep->tests_passed++;
    }
    remove(exe);
    return 0;
}

void judge_report_free(judge_report_t *rep) {
    free(rep->tests);
    free(rep->compile_log);
    free(rep->fail_output);
    rep->tests = NULL;
    rep->compile_log = NULL;
    rep->fail_output = NULL;
}

int judge_run_custom(const char *source, const char *in_path, const char *work_dir,
                     const judge_limits_t *lim, run_result_t *r, char **output, char **compile_log) {
    memset(r, 0, sizeof *r);
    r->verdict = VERDICT_IE;
    *output = NULL;

    char exe[MJ_PATH_MAX], out[MJ_PATH_MAX];
    int rc = prepare_executable(source, work_dir, exe, sizeof exe, compile_log);
    if (rc < 0) return -1;
    if (rc > 0) {
        r->verdict = VERDICT_CE;
        return 0;
    }
    snprintf(out, sizeof out, "%s/custom-out.txt", work_dir);
    lang_t lang = detect_lang(source);
    judge_limits_t custom_lim = *lim;
    if (lang == LANG_PYTHON) {
        custom_lim.time_ms = lim->time_ms * 2 + 500;
        custom_lim.memory_mb = lim->memory_mb < 128 ? 128 : lim->memory_mb * 2;
    }
    rc = judge_run(exe, in_path, out, &custom_lim, r);
    if (rc == 0) *output = mj_read_prefix(out, JUDGE_OUTPUT_PREVIEW);
    remove(out);
    remove(exe);
    return rc;
}
