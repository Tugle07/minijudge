#ifndef _WIN32

#define _GNU_SOURCE
#include <fcntl.h>
#include <grp.h>
#include <signal.h>
#include <stdlib.h>
#include <sys/resource.h>
#include <sys/time.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#include "judge.h"

static long long now_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (long long)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

#define SANDBOX_UID 65534 /* user "nobody" */

static void set_limit(int resource, rlim_t value) {
    struct rlimit rl = {value, value};
    setrlimit(resource, &rl);
}

/* Khi judge chạy bằng root (container judge), hạ quyền bài nộp xuống "nobody" và cấm tạo
 * tiến trình con: bài nộp không đọc/sửa được file của judge và không để lại tiến trình ngầm. */
static int drop_privileges(void) {
    if (getuid() != 0) return 0;
    /* Mỗi luồng chấm song song dùng UID riêng (MJ_SANDBOX_UID) vì RLIMIT_NPROC tính theo UID. */
    const char *env = getenv("MJ_SANDBOX_UID");
    long uid = env ? strtol(env, NULL, 10) : SANDBOX_UID;
    if (uid <= 0 || uid > 65534) uid = SANDBOX_UID;
    set_limit(RLIMIT_NPROC, 1);
    if (setgroups(0, NULL) != 0 || setgid((gid_t)uid) != 0 || setuid((uid_t)uid) != 0) return -1;
    return getuid() == 0 ? -1 : 0;
}

/* Bản Linux (dùng cho web server trong Docker): fork + setrlimit + wait4. */
int judge_run(const char *exe, const char *in_path, const char *out_path,
              const judge_limits_t *lim, run_result_t *r) {
    r->verdict = VERDICT_IE;
    r->time_ms = 0;
    r->memory_kb = 0;
    r->exit_code = -1;

    pid_t pid = fork();
    if (pid < 0) return -1;
    if (pid == 0) {
        setpgid(0, 0);
        int fin = open(in_path, O_RDONLY);
        int fout = open(out_path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
        int ferr = open("/dev/null", O_WRONLY);
        if (fin < 0 || fout < 0 || ferr < 0) _exit(127);
        dup2(fin, 0);
        dup2(fout, 1);
        dup2(ferr, 2);

        rlim_t mem = (rlim_t)lim->memory_mb * 1024 * 1024;
        set_limit(RLIMIT_CPU, (rlim_t)(lim->time_ms + 999) / 1000 + 1);
        set_limit(RLIMIT_AS, mem + 16u * 1024 * 1024);
        set_limit(RLIMIT_STACK, mem);
        set_limit(RLIMIT_FSIZE, 64u * 1024 * 1024);
        set_limit(RLIMIT_CORE, 0);
        if (drop_privileges() != 0) _exit(126);
        execl(exe, exe, (char *)NULL);
        _exit(127);
    }

    long long start = now_ms();
    long long wall_limit = (long long)lim->time_ms * 2 + 1000;
    int status = 0, wall_tle = 0;
    struct rusage ru;
    for (;;) {
        pid_t w = wait4(pid, &status, WNOHANG, &ru);
        if (w == pid) break;
        if (w < 0) return -1;
        if (now_ms() - start > wall_limit) {
            kill(pid, SIGKILL);
            wait4(pid, &status, 0, &ru);
            wall_tle = 1;
            break;
        }
        struct timespec ts = {0, 5 * 1000000};
        nanosleep(&ts, NULL);
    }
    kill(-pid, SIGKILL); /* dọn mọi tiến trình còn sót trong nhóm của bài nộp */
    if (getuid() == 0 && WIFEXITED(status) && WEXITSTATUS(status) == 126) return -1;

    r->time_ms = (int)(ru.ru_utime.tv_sec * 1000 + ru.ru_utime.tv_usec / 1000 +
                       ru.ru_stime.tv_sec * 1000 + ru.ru_stime.tv_usec / 1000);
    r->memory_kb = ru.ru_maxrss;
    r->exit_code = WIFEXITED(status) ? WEXITSTATUS(status) : -WTERMSIG(status);

    long mem_limit_kb = (long)lim->memory_mb * 1024;
    int signaled = WIFSIGNALED(status);
    if (wall_tle || r->time_ms > lim->time_ms || (signaled && WTERMSIG(status) == SIGXCPU)) {
        r->verdict = VERDICT_TLE;
        r->time_ms = lim->time_ms;
    } else if (r->memory_kb >= mem_limit_kb * 95 / 100) {
        r->verdict = VERDICT_MLE;
    } else if (signaled || r->exit_code != 0) {
        r->verdict = VERDICT_RE;
    } else {
        r->verdict = VERDICT_AC;
    }
    return 0;
}

#else
typedef int mj_run_posix_unused;
#endif
