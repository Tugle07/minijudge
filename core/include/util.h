#ifndef MJ_UTIL_H
#define MJ_UTIL_H

#include <stddef.h>

#define MJ_PATH_MAX 512
#define MJ_DIR_MAX 256

#ifdef _WIN32
#define MJ_EXE_EXT ".exe"
#else
#define MJ_EXE_EXT ""
#endif

/* Đọc toàn bộ file vào bộ nhớ động (kết thúc bằng '\0'). Người gọi phải free(). */
char *mj_read_file(const char *path, size_t *len);
/* Chỉ đọc tối đa max byte đầu (dùng cho output của bài nộp, có thể rất lớn). */
char *mj_read_prefix(const char *path, size_t max);
int mj_copy_file(const char *src, const char *dst);
int mj_file_exists(const char *path);
int mj_make_dir(const char *path);
void mj_path_join(char *out, size_t size, const char *a, const char *b);
void mj_trim(char *s);
int mj_is_valid_id(const char *id);

#endif
