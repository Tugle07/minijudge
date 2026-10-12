#ifdef _WIN32

#include <stdio.h>
#include <windows.h>

#include "judge.h"

#define POLL_INTERVAL_MS 20

static HANDLE open_inheritable(const char *path, DWORD access, DWORD disposition) {
    SECURITY_ATTRIBUTES sa = {sizeof sa, NULL, TRUE};
    return CreateFileA(path, access, FILE_SHARE_READ | FILE_SHARE_WRITE, &sa, disposition,
                       FILE_ATTRIBUTE_NORMAL, NULL);
}

static int cpu_time_ms(HANDLE process) {
    FILETIME t_create, t_exit, t_kernel, t_user;
    if (!GetProcessTimes(process, &t_create, &t_exit, &t_kernel, &t_user)) return 0;
    ULONGLONG k = ((ULONGLONG)t_kernel.dwHighDateTime << 32) | t_kernel.dwLowDateTime;
    ULONGLONG u = ((ULONGLONG)t_user.dwHighDateTime << 32) | t_user.dwLowDateTime;
    return (int)((k + u) / 10000);
}

/* Job Object: giới hạn RAM, chỉ cho 1 tiến trình (chặn fork bomb), tự kill khi đóng job. */
static HANDLE create_limited_job(const judge_limits_t *lim, HANDLE port) {
    HANDLE job = CreateJobObjectA(NULL, NULL);
    if (!job) return NULL;

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION li;
    ZeroMemory(&li, sizeof li);
    li.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_PROCESS_MEMORY | JOB_OBJECT_LIMIT_ACTIVE_PROCESS |
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION;
    li.BasicLimitInformation.ActiveProcessLimit = 1;
    li.ProcessMemoryLimit = (SIZE_T)lim->memory_mb * 1024 * 1024;

    JOBOBJECT_ASSOCIATE_COMPLETION_PORT acp;
    acp.CompletionKey = job;
    acp.CompletionPort = port;

    if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, &li, sizeof li) ||
        !SetInformationJobObject(job, JobObjectAssociateCompletionPortInformation, &acp, sizeof acp)) {
        CloseHandle(job);
        return NULL;
    }
    return job;
}

/* Đọc các thông báo job gửi về: có JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT nghĩa là bài vượt RAM. */
static int memory_limit_hit(HANDLE port) {
    DWORD msg;
    ULONG_PTR key;
    LPOVERLAPPED ov;
    int hit = 0;
    while (GetQueuedCompletionStatus(port, &msg, &key, &ov, 50)) {
        if (msg == JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT) hit = 1;
        if (msg == JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO) break;
    }
    return hit;
}

static int build_command(const char *exe, char *app_path, size_t app_size, char *cmd, size_t cmd_size) {
    /* CreateProcess cần đường dẫn tuyệt đối dạng "C:\...\main.exe". */
    DWORD n = GetFullPathNameA(exe, (DWORD)app_size, app_path, NULL);
    if (n == 0 || n >= app_size) return -1;
    for (char *c = app_path; *c; c++) {
        if (*c == '/') *c = '\\';
    }
    snprintf(cmd, cmd_size, "\"%s\"", app_path);
    return 0;
}

int judge_run(const char *exe, const char *in_path, const char *out_path,
              const judge_limits_t *lim, run_result_t *r) {
    r->verdict = VERDICT_IE;
    r->time_ms = 0;
    r->memory_kb = 0;
    r->exit_code = -1;

    HANDLE hin = open_inheritable(in_path, GENERIC_READ, OPEN_EXISTING);
    HANDLE hout = open_inheritable(out_path, GENERIC_WRITE, CREATE_ALWAYS);
    HANDLE herr = open_inheritable("NUL", GENERIC_WRITE, OPEN_EXISTING);
    HANDLE port = CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 1);
    HANDLE job = port ? create_limited_job(lim, port) : NULL;
    PROCESS_INFORMATION pi = {0};
    char app_path[MJ_PATH_MAX], cmd[MJ_PATH_MAX + 4];
    int rc = -1;

    if (hin == INVALID_HANDLE_VALUE || hout == INVALID_HANDLE_VALUE ||
        herr == INVALID_HANDLE_VALUE || !job ||
        build_command(exe, app_path, sizeof app_path, cmd, sizeof cmd) != 0) {
        goto cleanup;
    }

    STARTUPINFOA si;
    ZeroMemory(&si, sizeof si);
    si.cb = sizeof si;
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = hin;
    si.hStdOutput = hout;
    si.hStdError = herr;

    /* Không bật hộp thoại "chương trình đã dừng hoạt động" khi bài bị crash. */
    UINT old_mode = SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX);
    BOOL ok = CreateProcessA(app_path, cmd, NULL, NULL, TRUE, CREATE_SUSPENDED | CREATE_NO_WINDOW,
                             NULL, NULL, &si, &pi);
    SetErrorMode(old_mode);
    if (!ok) goto cleanup;
    if (!AssignProcessToJobObject(job, pi.hProcess)) {
        TerminateProcess(pi.hProcess, 1);
        goto cleanup;
    }
    ResumeThread(pi.hThread);

    /* Kiểm tra CPU time định kỳ; giới hạn thời gian thực (wall) bắt bài treo chờ input. */
    ULONGLONG start = GetTickCount64();
    ULONGLONG wall_limit = (ULONGLONG)lim->time_ms * 2 + 1000;
    int tle = 0;
    for (;;) {
        DWORD w = WaitForSingleObject(pi.hProcess, POLL_INTERVAL_MS);
        if (w == WAIT_OBJECT_0) break;
        if (w != WAIT_TIMEOUT || cpu_time_ms(pi.hProcess) > lim->time_ms ||
            GetTickCount64() - start > wall_limit) {
            TerminateJobObject(job, 1);
            WaitForSingleObject(pi.hProcess, INFINITE);
            tle = (w == WAIT_TIMEOUT);
            break;
        }
    }

    DWORD code = 0;
    GetExitCodeProcess(pi.hProcess, &code);
    r->exit_code = (int)code;
    r->time_ms = cpu_time_ms(pi.hProcess);

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION q;
    ZeroMemory(&q, sizeof q);
    if (QueryInformationJobObject(job, JobObjectExtendedLimitInformation, &q, sizeof q, NULL)) {
        r->memory_kb = (long)(q.PeakProcessMemoryUsed / 1024);
    }

    if (tle) {
        r->verdict = VERDICT_TLE;
        r->time_ms = lim->time_ms;
    } else if (memory_limit_hit(port)) {
        r->verdict = VERDICT_MLE;
    } else if (code != 0) {
        r->verdict = VERDICT_RE;
    } else {
        r->verdict = VERDICT_AC;
    }
    rc = 0;

cleanup:
    if (rc != 0) fprintf(stderr, "judge_run: loi he thong Windows %lu\n", GetLastError());
    if (pi.hThread) CloseHandle(pi.hThread);
    if (pi.hProcess) CloseHandle(pi.hProcess);
    if (job) CloseHandle(job);
    if (port) CloseHandle(port);
    if (hin != INVALID_HANDLE_VALUE) CloseHandle(hin);
    if (hout != INVALID_HANDLE_VALUE) CloseHandle(hout);
    if (herr != INVALID_HANDLE_VALUE) CloseHandle(herr);
    return rc;
}

#else
typedef int mj_run_windows_unused;
#endif
