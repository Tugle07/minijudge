#ifndef MJ_UI_H
#define MJ_UI_H

#include <stddef.h>

#include "judge.h"

#define C_RESET "\033[0m"
#define C_BOLD "\033[1m"
#define C_RED "\033[31m"
#define C_GREEN "\033[32m"
#define C_YELLOW "\033[33m"
#define C_BLUE "\033[34m"
#define C_CYAN "\033[36m"
#define C_GRAY "\033[90m"

void ui_init(void);
void ui_clear(void);
void ui_pause(void);
int ui_read_line(const char *prompt, char *buf, size_t size);
int ui_read_int(const char *prompt, int min, int max, int *out);
const char *ui_verdict_color(verdict_t v);

#endif
