#ifndef MJ_APP_H
#define MJ_APP_H

#include "problem.h"
#include "submission-store.h"

typedef struct {
    char user[32];
    char problems_root[MJ_DIR_MAX];
    char data_dir[MJ_DIR_MAX];
    char store_path[MJ_PATH_MAX];
    char work_dir[MJ_PATH_MAX];
    problem_list_t problems;
    submission_list_t submissions;
} app_t;

typedef void (*menu_action_fn)(app_t *app);

typedef struct {
    const char *label;
    menu_action_fn action;
} menu_item_t;

int action_login(app_t *app);
void action_switch_user(app_t *app);
void action_list_problems(app_t *app);
void action_view_statement(app_t *app);
void action_submit(app_t *app);
void action_history(app_t *app);
void action_scoreboard(app_t *app);

#endif
