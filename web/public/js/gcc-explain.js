/* Giải thích lỗi/cảnh báo gcc bằng tiếng Việt cho người mới học C, kèm gợi ý cách sửa. */
const HEADER_OF = {
  'stdio.h': 'printf scanf puts gets fgets fputs putchar getchar fopen fclose fprintf fscanf fread fwrite sprintf sscanf',
  'string.h': 'strlen strcpy strncpy strcat strncat strcmp strncmp strchr strrchr strstr strtok strcspn memset memcpy memmove',
  'stdlib.h': 'malloc calloc realloc free qsort abs llabs atoi atoll atof exit rand srand',
  'math.h': 'sqrt pow fabs floor ceil round log log10 sin cos',
  'ctype.h': 'isalpha isdigit isalnum isspace isupper islower toupper tolower',
};
const headerFor = (fn) => Object.keys(HEADER_OF).find((h) => HEADER_OF[h].split(' ').includes(fn));
const CPP_WORDS = ['string', 'vector', 'cin', 'cout', 'bool', 'class', 'namespace', 'endl', 'iostream'];

const RULES = [
  [/expected (?:'[^']*' or )*';' before/, () => 'Thiếu dấu ; để kết thúc câu lệnh — xem cuối dòng này hoặc cuối dòng ngay phía trên.'],
  [/expected '\}' at end of input|expected declaration or statement at end of input/, () => 'Thiếu dấu } đóng khối: số dấu { và } chưa bằng nhau. Kiểm tra cuối hàm main và các vòng lặp, if.'],
  [/expected '\)' before|expected '\)'/, () => 'Thiếu dấu ) — kiểm tra các cặp ngoặc tròn trên dòng này.'],
  [/expected '\]'/, () => 'Thiếu dấu ] khi khai báo hoặc truy cập mảng.'],
  [/'else' without a previous 'if'/, () => 'else không đi với if nào: thường do có dấu ; thừa ngay sau if (...) hoặc thiếu { } bao khối lệnh của if.'],
  [/expected expression before/, () => 'Thiếu biểu thức ở đây: kiểm tra dấu phẩy, dấu ngoặc hoặc toán tử bị thừa/thiếu.'],
  [/stray '.*' in program/, () => 'Có ký tự lạ trong code (thường do copy từ Word/web: dấu nháy cong “ ”, dấu cách đặc biệt). Hãy gõ lại dòng này bằng bàn phím.'],
  [/missing terminating (["']) character/, (m) => `Thiếu dấu ${m[1]} đóng chuỗi/ký tự — mỗi chuỗi phải nằm trọn trên một dòng.`],
  [/'(\w+)' undeclared/, (m) => `\`${m[1]}\` chưa được khai báo. Kiểm tra: đã khai báo trước khi dùng chưa? Gõ sai chính tả hoặc sai hoa/thường? Hay biến được khai báo trong một khối { } khác?`],
  [/implicit declaration of function '(\w+)'/, (m) => {
    const h = headerFor(m[1]);
    return h ? `Quên \`#include <${h}>\` ở đầu file — hàm \`${m[1]}\` nằm trong thư viện này.` : `Hàm \`${m[1]}\` chưa được khai báo: gõ sai tên, hoặc hàm được viết bên dưới main — thêm nguyên mẫu (prototype) phía trên main.`;
  }],
  [/unknown type name '(\w+)'/, (m) => (m[1] === 'bool' ? 'Muốn dùng `bool` trong C cần `#include <stdbool.h>`.' : CPP_WORDS.includes(m[1]) ? `\`${m[1]}\` là của C++ — web chấm C11, hãy dùng mảng char / printf / scanf.` : `Kiểu \`${m[1]}\` chưa được định nghĩa — thiếu \`typedef struct\` hoặc gõ sai tên kiểu?`)],
  [/fatal error: (\S+): No such file/, (m) => `Không tìm thấy thư viện \`${m[1]}\`. Kiểm tra tên trong #include (vd <stdio.h>). Web chấm ngôn ngữ C, không có thư viện C++ như <iostream>, <bits/stdc++.h>.`],
  [/format '%(\w+)' expects argument of type '([^']+)', but argument \d+ has type '([^']+)'/, (m) => {
    const wantPtr = m[2].includes('*');
    const hasPtr = m[3].includes('*') || m[3].includes('[');
    if (wantPtr && !hasPtr) return 'scanf cần **địa chỉ** của biến: thêm dấu & trước tên biến (vd `scanf("%d", &n)`). Riêng chuỗi char s[] thì không cần &.';
    return `Đặc tả \`%${m[1]}\` không khớp kiểu biến (\`${m[3]}\`). Nhớ: int → %d, long long → %lld, double → %lf (scanf) / %f (printf), char → %c, chuỗi → %s.`;
  }],
  [/too few arguments for format|format '%\w+' expects a matching/, () => 'Số đặc tả % trong chuỗi định dạng nhiều hơn số biến truyền vào printf/scanf.'],
  [/too many arguments for format/, () => 'Truyền nhiều biến hơn số đặc tả % trong chuỗi định dạng.'],
  [/suggest parentheses around assignment used as truth value/, () => 'Dùng `=` (gán) trong điều kiện if/while — có lẽ bạn muốn `==` (so sánh).'],
  [/unused variable '(\w+)'/, (m) => `Biến \`${m[1]}\` được khai báo nhưng không dùng — có thể xóa đi.`],
  [/'(\w+)' is used uninitialized|'(\w+)' may be used uninitialized/, (m) => `Biến \`${m[1] || m[2]}\` được dùng khi chưa gán giá trị ban đầu — giá trị là rác. Nên khởi tạo, ví dụ \`= 0\`.`],
  [/control reaches end of non-void function/, () => 'Hàm có kiểu trả về nhưng thiếu `return` ở cuối hoặc ở một nhánh if/else.'],
  [/return type of 'main' is not 'int'/, () => 'Hàm main phải có kiểu int: `int main(void) { ... return 0; }`.'],
  [/conflicting types for '(\w+)'/, (m) => `Hàm \`${m[1]}\` được khai báo hai lần với kiểu khác nhau — nguyên mẫu (prototype) không khớp với phần định nghĩa.`],
  [/redefinition of '(\w+)'|redeclaration of '(\w+)'/, (m) => `\`${m[1] || m[2]}\` bị khai báo lại lần thứ hai trong cùng phạm vi — đổi tên hoặc bỏ bớt một lần khai báo.`],
  [/too (few|many) arguments to function '(\w+)'/, (m) => `Gọi hàm \`${m[2]}\` với ${m[1] === 'few' ? 'thiếu' : 'thừa'} tham số so với khai báo.`],
  [/incompatible pointer type|makes pointer from integer|makes integer from pointer/, () => 'Lẫn lộn giữa con trỏ và số: kiểm tra dấu & và * khi truyền/gán (vd truyền `a` thay vì `&a`).'],
  [/incompatible types when (assigning|initializing)/, () => 'Kiểu dữ liệu hai vế phép gán không khớp. Lưu ý: không gán chuỗi bằng `=`, hãy dùng `strcpy`.'],
  [/assignment to expression with array type/, () => 'Không thể gán cả mảng/chuỗi bằng `=` — dùng `strcpy(dich, nguon)` cho chuỗi hoặc gán từng phần tử.'],
  [/lvalue required/, () => 'Vế trái của phép gán phải là một biến (vd viết `a + 1 = b` là sai).'],
  [/statement with no effect/, () => 'Câu lệnh không có tác dụng — có thể bạn viết `a == 1;` thay vì `a = 1;`.'],
  [/comparison of integer expressions of different signedness/, () => 'So sánh số có dấu với số không dấu (vd `i < strlen(s)`). Ép kiểu `(int)strlen(s)` hoặc lưu độ dài vào biến int trước.'],
  [/array subscript .* (above|below) array bounds|is outside array bounds/, () => 'Truy cập ngoài phạm vi mảng — chỉ số hợp lệ của mảng n phần tử là 0 … n-1.'],
  [/division by zero/, () => 'Chia cho 0.'],
  [/overflow in (conversion|expression)|integer overflow/, () => 'Tràn số: giá trị vượt quá phạm vi của kiểu — dùng `long long` (và %lld).'],
  [/undefined reference to [`'](\w+)'/, (m) => (m[1] === 'WinMain' || m[1] === 'main' ? 'Không tìm thấy hàm main — kiểm tra đã viết đúng `int main(void)` chưa.' : `Có gọi hàm \`${m[1]}\` nhưng không tìm thấy phần định nghĩa — gõ sai tên hoặc quên viết thân hàm.`)],
];

/* Trả về câu giải thích tiếng Việt (markdown đơn giản với `code` và **đậm**) hoặc '' nếu chưa có quy tắc. */
export function explainGcc(message) {
  const msg = String(message).replace(/[‘’]/g, "'");
  for (const [re, fn] of RULES) {
    const m = msg.match(re);
    if (m) return fn(m);
  }
  return '';
}

/* Tách log gcc thành danh sách lỗi {line, col, severity, message, explain}. */
export function parseGccLog(log) {
  const out = [];
  const re = /^[^\n:]*:(\d+):(\d+): (error|warning|fatal error): (.+)$/gm;
  let m;
  while ((m = re.exec(String(log || '')))) {
    out.push({ line: Number(m[1]), col: Number(m[2]), severity: m[3] === 'warning' ? 'warning' : 'error', message: m[4], explain: explainGcc(m[4]) });
  }
  out.sort((a, b) => a.line - b.line || (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  const link = String(log || '').replace(/[‘’]/g, "'").match(/undefined reference to [`']\w+'/);
  if (link) out.push({ line: 0, col: 0, severity: 'error', message: link[0], explain: explainGcc(link[0]) });
  return out;
}

/* Định dạng câu giải thích: `code` → <code>, **x** → <b>. Đầu vào đã escape. */
export function explainHtml(text, esc) {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}
