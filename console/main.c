#include <stdio.h>
#include <string.h>

#include "app.h"
#include "ui.h"

/* Menu điều khiển bằng bảng con trỏ hàm: thêm chức năng chỉ cần thêm 1 dòng. */
static const menu_item_t MENU[] = {
    {"Danh sach de bai", action_list_problems},
    {"Xem de bai", action_view_statement},
    {"Nop bai", action_submit},
    {"Lich su nop bai cua toi", action_history},
    {"Bang xep hang (luat ICPC)", action_scoreboard},
    {"Doi nguoi dung", action_switch_user},
};
static const int MENU_SIZE = (int)(sizeof MENU / sizeof MENU[0]);

static void print_menu(const app_t *app) {
    ui_clear();
    printf(C_BOLD C_CYAN "==============================================\n");
    printf("         MINIJUDGE - KY THUAT LAP TRINH C\n");
    printf("==============================================\n" C_RESET);
    printf("Nguoi dung: " C_BOLD "%s" C_RESET "   |   So de: %d   |   Bai da nop: %d\n\n",
           app->user, app->problems.count, app->submissions.count);
    for (int i = 0; i < MENU_SIZE; i++) printf("  %d. %s\n", i + 1, MENU[i].label);
    printf("  0. Thoat\n\n");
}

int main(int argc, char **argv) {
    const char *root = argc > 1 ? argv[1] : ".";
    app_t app;
    memset(&app, 0, sizeof app);
    snprintf(app.problems_root, sizeof app.problems_root, "%s/problems", root);
    snprintf(app.data_dir, sizeof app.data_dir, "%s/data", root);
    snprintf(app.store_path, sizeof app.store_path, "%s/submissions.dat", app.data_dir);
    snprintf(app.work_dir, sizeof app.work_dir, "%s/work", app.data_dir);

    ui_init();
    if (mj_make_dir(app.data_dir) != 0) {
        fprintf(stderr, "Khong tao duoc thu muc %s\n", app.data_dir);
        return 1;
    }
    if (problem_list_load(app.problems_root, &app.problems) != 0) {
        fprintf(stderr, "Khong doc duoc %s/index.txt\n", app.problems_root);
        return 1;
    }
    if (store_load(app.store_path, &app.submissions) != 0) {
        fprintf(stderr, "File %s bi hong hoac sai dinh dang\n", app.store_path);
        problem_list_free(&app.problems);
        return 1;
    }

    if (action_login(&app)) {
        for (;;) {
            print_menu(&app);
            int choice;
            if (ui_read_int("Chon chuc nang: ", 0, MENU_SIZE, &choice) != 0 || choice == 0) break;
            printf("\n");
            MENU[choice - 1].action(&app);
            ui_pause();
        }
    }

    printf("\nTam biet %s!\n", app.user);
    store_free(&app.submissions);
    problem_list_free(&app.problems);
    return 0;
}
