#include <ctype.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "app.h"
#include "ui.h"

#define MAX_TIME_MS 10000
#define MAX_MEMORY_MB 1024

static void read_id(const char *prompt, char *id, size_t size) {
    id[0] = '\0';
    if (ui_read_line(prompt, id, size) <= 0) return;
    for (char *c = id; *c; c++) *c = (char)toupper((unsigned char)*c);
}

static int ask_index(app_t *app) {
    char id[16];
    read_id("Ma de: ", id, sizeof id);
    int i = problem_list_index(&app->problems, id);
    if (i < 0) printf(C_RED "Khong tim thay de %s\n" C_RESET, id);
    return i;
}

/* Enter để giữ giá trị cũ. */
static void read_optional_int(const char *prompt, int min, int max, int *value) {
    char buf[32];
    for (;;) {
        if (ui_read_line(prompt, buf, sizeof buf) <= 0) return;
        char *end;
        errno = 0;
        long v = strtol(buf, &end, 10);
        if (*end == '\0' && errno == 0 && v >= min && v <= max) {
            *value = (int)v;
            return;
        }
        printf(C_RED "  Vui long nhap so nguyen tu %d den %d.\n" C_RESET, min, max);
    }
}

static int ask_test_files(char *in, char *ans, size_t size) {
    if (ui_read_path("File input: ", in, size) <= 0) return -1;
    if (ui_read_path("File dap an: ", ans, size) <= 0) return -1;
    if (!mj_file_exists(in) || !mj_file_exists(ans)) {
        printf(C_RED "Khong mo duoc file test.\n" C_RESET);
        return -1;
    }
    return 0;
}

static void admin_add(app_t *app) {
    problem_t p;
    char in[MJ_PATH_MAX], ans[MJ_PATH_MAX], statement[MJ_PATH_MAX];
    memset(&p, 0, sizeof p);
    read_id("Ma de moi (chu, so, _): ", p.id, sizeof p.id);
    if (!mj_is_valid_id(p.id)) {
        printf(C_RED "Ma de khong hop le.\n" C_RESET);
        return;
    }
    if (problem_list_index(&app->problems, p.id) >= 0) {
        printf(C_RED "Ma de %s da ton tai.\n" C_RESET, p.id);
        return;
    }
    if (ui_read_line("Ten de: ", p.title, sizeof p.title) <= 0) return;
    if (ui_read_int("Gioi han thoi gian (ms): ", 1, MAX_TIME_MS, &p.time_ms) != 0) return;
    if (ui_read_int("Gioi han bo nho (MB): ", 1, MAX_MEMORY_MB, &p.memory_mb) != 0) return;
    if (ask_test_files(in, ans, sizeof in) != 0) return;

    mj_path_join(p.dir, sizeof p.dir, app->problems_root, p.id);
    if (mj_make_dir(p.dir) != 0 || problem_add_test(&p, in, ans) != 0) {
        printf(C_RED "Khong tao duoc de.\n" C_RESET);
        return;
    }
    if (ui_read_path("File noi dung de .md (Enter de bo qua): ", statement, sizeof statement) > 0) {
        char dst[MJ_PATH_MAX];
        mj_path_join(dst, sizeof dst, p.dir, "statement.md");
        if (mj_copy_file(statement, dst) != 0) printf(C_RED "Khong chep duoc noi dung de.\n" C_RESET);
    }
    if (problem_index_add(app->problems_root, p.id) != 0 || problem_list_add(&app->problems, &p) != 0) {
        printf(C_RED "Khong cap nhat duoc danh sach de.\n" C_RESET);
        return;
    }
    printf(C_GREEN "Da them de %s.\n" C_RESET, p.id);
}

static void admin_edit(app_t *app) {
    int i = ask_index(app);
    if (i < 0) return;
    problem_t p = app->problems.items[i];
    char title[sizeof p.title];
    printf("Ten hien tai: %s\n", p.title);
    if (ui_read_line("Ten moi (Enter de giu nguyen): ", title, sizeof title) > 0) {
        memcpy(p.title, title, sizeof p.title);
    }
    printf("Gioi han hien tai: %d ms, %d MB\n", p.time_ms, p.memory_mb);
    read_optional_int("Thoi gian moi (Enter de giu nguyen): ", 1, MAX_TIME_MS, &p.time_ms);
    read_optional_int("Bo nho moi (Enter de giu nguyen): ", 1, MAX_MEMORY_MB, &p.memory_mb);
    if (problem_save(&p) != 0) {
        printf(C_RED "Khong ghi duoc problem.txt\n" C_RESET);
        return;
    }
    app->problems.items[i] = p;
    printf(C_GREEN "Da cap nhat de %s.\n" C_RESET, p.id);
}

static void admin_add_test(app_t *app) {
    int i = ask_index(app);
    if (i < 0) return;
    char in[MJ_PATH_MAX], ans[MJ_PATH_MAX];
    if (ask_test_files(in, ans, sizeof in) != 0) return;
    if (problem_add_test(&app->problems.items[i], in, ans) != 0) {
        printf(C_RED "Khong them duoc test.\n" C_RESET);
        return;
    }
    printf(C_GREEN "De %s hien co %d test.\n" C_RESET, app->problems.items[i].id,
           app->problems.items[i].test_count);
}

static void admin_delete(app_t *app) {
    int i = ask_index(app);
    if (i < 0) return;
    char id[16], again[16];
    snprintf(id, sizeof id, "%s", app->problems.items[i].id);
    read_id("Nhap lai ma de de xac nhan xoa: ", again, sizeof again);
    if (strcmp(id, again) != 0) {
        printf("Da huy.\n");
        return;
    }
    if (problem_index_remove(app->problems_root, id) != 0) {
        printf(C_RED "Khong cap nhat duoc index.txt\n" C_RESET);
        return;
    }
    problem_list_remove(&app->problems, i);
    printf(C_GREEN "Da xoa de %s khoi danh sach, thu muc de van con tren dia.\n" C_RESET, id);
}

typedef void (*admin_action_fn)(app_t *app);

static const struct {
    const char *label;
    admin_action_fn action;
} ADMIN_MENU[] = {
    {"Them de moi", admin_add},
    {"Sua ten va gioi han", admin_edit},
    {"Them test", admin_add_test},
    {"Xoa de", admin_delete},
};

void action_manage_problems(app_t *app) {
    int size = (int)(sizeof ADMIN_MENU / sizeof ADMIN_MENU[0]);
    for (int i = 0; i < size; i++) printf("  %d. %s\n", i + 1, ADMIN_MENU[i].label);
    printf("  0. Quay lai\n\n");
    int choice;
    if (ui_read_int("Chon: ", 0, size, &choice) != 0 || choice == 0) return;
    ADMIN_MENU[choice - 1].action(app);
}
