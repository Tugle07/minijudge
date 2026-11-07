# BÀI KIỂM TRA THỰC HÀNH LẬP TRÌNH C
**Kỳ thi:** Kiểm tra giữa kỳ / Đánh giá quá trình K13 (Mảng một chiều)  
**Thời gian làm bài:** 68 phút  
**Hình thức:** Lập trình trực tiếp trên hệ thống MiniJudge  
**Ngôn ngữ cho phép:** C (GCC 13 / C11)  
**Tổng số bài:** 7 bài (Bài A đến Bài G) — Thang điểm 700 điểm (100 điểm/bài)

---

## Bài A: Báo cáo doanh thu thua lỗ cho sếp
- **Mã bài thi:** `K13_01`
- **Điểm tối đa:** 100 điểm
- **Giới hạn thời gian:** 1.0 giây / test
- **Giới hạn bộ nhớ:** 256 MB

### 1. Đề bài
Bạn cần phải báo cáo tình hình tài chính cho sếp sau chuỗi $n$ ngày kinh doanh liên tiếp. Trong danh sách doanh thu hàng ngày, số nguyên dương thể hiện ngày có lãi, còn số nguyên âm thể hiện ngày bị thua lỗ.

Sếp yêu cầu bạn tính **mức thua lỗ trung bình** của các ngày làm ăn thua lỗ (trung bình cộng các phần tử âm) và in ra làm tròn đúng 2 chữ số thập phân. Nếu trong đợt này công ty không có ngày nào bị lỗ, hãy in ra `NONE`.

### 2. Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### 3. Dữ liệu ra (Output)
In ra mức thua lỗ trung bình làm tròn đúng 2 chữ số thập phân (ví dụ `-3.00`) hoặc in `NONE` nếu mảng không có ngày nào bị lỗ.

### 4. Ví dụ mẫu (Sample Tests)
#### Ví dụ 1:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
10
4 -2 9 16 -5 1 3 7 -2 25
``` | ```
-3.00
``` |

*Giải thích:* Các ngày bị lỗ có doanh thu là: -2, -5, -2. Trung bình cộng = (-2 + -5 + -2) / 3 = -9 / 3 = -3.00.

#### Ví dụ 2:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
3
5 5 5
``` | ```
NONE
``` |

*Giải thích:* Tất cả các ngày đều có lãi, không có ngày nào bị lỗ.

### 5. Thang điểm Subtask
| Subtask | Điểm | Mô tả kiểm thử |
| :--- | :---: | :--- |
| Ví dụ trong đề | 10 điểm | Khớp dữ liệu ví dụ trong đề bài |
| Dữ liệu nhỏ | 30 điểm | Mảng kích thước nhỏ ($n \le 20$) |
| Trường hợp đặc biệt | 30 điểm | $n = 1$, toàn số dương hoặc toàn số âm |
| Dữ liệu lớn | 30 điểm | $n \le 100$ |

---

## Bài B: Phát hiện tệp tin chứa mã độc
- **Mã bài thi:** `K13_02`
- **Điểm tối đa:** 100 điểm
- **Giới hạn thời gian:** 1.0 giây / test
- **Giới hạn bộ nhớ:** 256 MB

### 1. Đề bài
Một đợt truyền tin gửi về hệ thống gồm $n$ gói tệp tin, mỗi gói được đại diện bởi một số nguyên $a_i$. 

Theo tình báo an ninh mạng biết được, các tệp tin chứa mã độc là các tệp tin được đại diện bởi một **số nguyên tố** (số nguyên lớn hơn 1 và chỉ chia hết cho 1 và chính nó). Bạn hãy lập trình đếm xem trong đợt truyền tin này có bao nhiêu tệp tin chứa mã độc để kịp thời cách ly và cảnh báo.

### 2. Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### 3. Dữ liệu ra (Output)
Một số nguyên duy nhất là số lượng phần tử là số nguyên tố.

### 4. Ví dụ mẫu (Sample Tests)
#### Ví dụ 1:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
10
4 -2 9 16 -5 1 3 7 -2 25
``` | ```
2
``` |

*Giải thích:* Trong mảng có 2 số nguyên tố là 3 và 7 (các số âm, 1, 4, 9, 16, 25 không phải số nguyên tố).

#### Ví dụ 2:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
3
5 5 5
``` | ```
3
``` |

*Giải thích:* Cả 3 phần tử đều là 5 (số nguyên tố).

### 5. Thang điểm Subtask
| Subtask | Điểm | Mô tả kiểm thử |
| :--- | :---: | :--- |
| Ví dụ trong đề | 10 điểm | Khớp dữ liệu ví dụ trong đề bài |
| Dữ liệu nhỏ | 30 điểm | Mảng nhỏ ($n \le 20$) |
| Trường hợp đặc biệt | 30 điểm | Số âm, số 0, số 1 hoặc không có số nguyên tố |
| Dữ liệu lớn | 30 điểm | $n \le 100$ |

---

## Bài C: Công suất tiêu thụ trạm sạc điện
- **Mã bài thi:** `K13_03`
- **Điểm tối đa:** 100 điểm
- **Giới hạn thời gian:** 1.0 giây / test
- **Giới hạn bộ nhớ:** 256 MB

### 1. Đề bài
Để tránh làm mất điện khi các xe đang sạc, ban quản lý trạm sạc điện cần giám sát công suất tiêu thụ điện tại $n$ mốc thời gian trong ngày (mỗi mốc được đánh số thứ tự từ $0$ đến $n-1$).

Ban quản lý cần biết **công suất tiêu thụ lớn nhất là bao nhiêu** để tránh làm quá tải đường dây điện, đồng thời cần biết **vị trí cuối cùng** đạt mức công suất đỉnh đó để lên phương án điều tiết tải. Hãy in ra công suất lớn nhất và chỉ số vị trí cuối cùng đạt công suất đó.

### 2. Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### 3. Dữ liệu ra (Output)
Gồm hai số nguyên cách nhau bởi dấu cách: giá trị lớn nhất và vị trí (chỉ số tính từ $0$) xuất hiện cuối cùng của giá trị đó.

### 4. Ví dụ mẫu (Sample Tests)
#### Ví dụ 1:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
10
4 -2 9 16 -5 1 3 7 -2 25
``` | ```
25 9
``` |

*Giải thích:* Giá trị lớn nhất trong mảng là 25, nằm tại chỉ số 9 (vị trí cuối cùng của mảng).

#### Ví dụ 2:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
3
5 5 5
``` | ```
5 2
``` |

*Giải thích:* Giá trị lớn nhất là 5, xuất hiện ở các chỉ số 0, 1, 2. Vị trí cuối cùng là 2.

### 5. Thang điểm Subtask
| Subtask | Điểm | Mô tả kiểm thử |
| :--- | :---: | :--- |
| Ví dụ trong đề | 10 điểm | Khớp dữ liệu ví dụ trong đề bài |
| Dữ liệu nhỏ | 30 điểm | Mảng nhỏ ($n \le 20$) |
| Trường hợp đặc biệt | 30 điểm | Toàn số âm, các phần tử bằng nhau |
| Dữ liệu lớn | 30 điểm | $n \le 100$ |

---

## Bài D: Giá thầu thiết bị trường học
- **Mã bài thi:** `K13_04`
- **Điểm tối đa:** 100 điểm
- **Giới hạn thời gian:** 1.0 giây / test
- **Giới hạn bộ nhớ:** 256 MB

### 1. Đề bài
Hội đồng thẩm định mở gói thầu mua sắm trang thiết bị cho phòng máy tính thực hành với $n$ báo giá từ các nhà cung cấp.

Để phòng tránh rủi ro nhà thầu chào giá thấp bất thường do tính thiếu linh kiện, hội đồng quyết định xem xét mức **giá chào thấp thứ hai** (tức là mức giá nhỏ nhất trong số các báo giá lớn hơn hẳn mức giá thấp nhất). Nếu tất cả các đơn vị tham gia đều chào một mức giá giống hệt nhau, gói thầu không chọn được mức giá thứ hai và cần hủy thầu để đấu giá lại (in `NONE`).

### 2. Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### 3. Dữ liệu ra (Output)
In ra giá trị nhỏ thứ hai trong mảng, hoặc in `NONE` nếu không tồn tại giá trị nhỏ thứ hai.

### 4. Ví dụ mẫu (Sample Tests)
#### Ví dụ 1:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
10
4 -2 9 16 -5 1 3 7 -2 25
``` | ```
-2
``` |

*Giải thích:* Giá trị nhỏ nhất là -5. Giá trị nhỏ thứ hai (nhỏ nhất trong các số > -5) là -2.

#### Ví dụ 2:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
3
5 5 5
``` | ```
NONE
``` |

*Giải thích:* Mọi phần tử đều bằng 5, không tồn tại phần tử nhỏ thứ hai.

### 5. Thang điểm Subtask
| Subtask | Điểm | Mô tả kiểm thử |
| :--- | :---: | :--- |
| Ví dụ trong đề | 10 điểm | Khớp dữ liệu ví dụ trong đề bài |
| Dữ liệu nhỏ | 30 điểm | Mảng nhỏ ($n \le 20$) |
| Trường hợp đặc biệt | 30 điểm | Mọi phần tử bằng nhau, mảng có số âm |
| Dữ liệu lớn | 30 điểm | $n \le 100$ |

---

## Bài E: Kiểm tra mảng đối xứng
- **Mã bài thi:** `K13_05`
- **Điểm tối đa:** 100 điểm
- **Giới hạn thời gian:** 1.0 giây / test
- **Giới hạn bộ nhớ:** 256 MB

### 1. Đề bài
Cho một mảng gồm $n$ số nguyên (đánh số chỉ số từ $0$ đến $n-1$).

Mảng được gọi là đối xứng nếu đọc xuôi hay đọc ngược đều có giá trị giống nhau (tức là $a_i = a_{n - 1 - i}$ với mọi $0 \le i < n$). Hãy viết chương trình kiểm tra xem mảng đã cho có đối xứng hay không: in ra `YES` nếu đối xứng, ngược lại in `NO`.

### 2. Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### 3. Dữ liệu ra (Output)
In ra `YES` nếu mảng đối xứng, `NO` nếu mảng không đối xứng.

### 4. Ví dụ mẫu (Sample Tests)
#### Ví dụ 1:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
10
4 -2 9 16 -5 1 3 7 -2 25
``` | ```
NO
``` |

*Giải thích:* Mảng đọc xuôi và đọc ngược không giống nhau (ví dụ $a[0] = 4 \neq a[9] = 25$).

#### Ví dụ 2:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
3
5 5 5
``` | ```
YES
``` |

*Giải thích:* Mảng [5, 5, 5] đối xứng hoàn hảo.

### 5. Thang điểm Subtask
| Subtask | Điểm | Mô tả kiểm thử |
| :--- | :---: | :--- |
| Ví dụ trong đề | 10 điểm | Khớp dữ liệu ví dụ trong đề bài |
| Dữ liệu nhỏ | 30 điểm | Mảng nhỏ ($n \le 20$) |
| Trường hợp đặc biệt | 30 điểm | $n = 1$ (luôn đối xứng), mảng chỉ có 2 phần tử |
| Dữ liệu lớn | 30 điểm | $n \le 100$ |

---

## Bài F: Xử lý tệp tin và lọc tín hiệu lỗi X
- **Mã bài thi:** `K13_06`
- **Điểm tối đa:** 100 điểm
- **Giới hạn thời gian:** 1.0 giây / test
- **Giới hạn bộ nhớ:** 256 MB

### 1. Đề bài
Hệ thống cần bạn xử lý tệp tin gồm $n$ giá trị số nguyên trước khi đưa vào phân tích. Vì bụi kẹt ở đầu đọc cảm biến nên làm cho đầu ghi thêm các tín hiệu bị sai có giá trị bằng $x$ vào trong chuỗi dữ liệu.

Việc của bạn là:
1. **Sắp xếp lại** chuỗi dữ liệu theo thứ tự tăng dần.
2. **Lọc ra** và loại bỏ toàn bộ các tín hiệu làm sai có giá trị bằng $x$ ra khỏi chuỗi dữ liệu.

In ra chuỗi dữ liệu còn lại sau khi xử lý (cách nhau bởi dấu cách). Nếu sau khi lọc mảng không còn phần tử nào, in ra `EMPTY`.

### 2. Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).
- Dòng 3: Số nguyên $x$ ($|x| \le 1000$).

### 3. Dữ liệu ra (Output)
In ra các phần tử còn lại sau khi sắp xếp tăng dần và xóa toàn bộ các phần tử có giá trị bằng $x$, cách nhau bởi dấu cách. Nếu không còn phần tử nào, in `EMPTY`.

### 4. Ví dụ mẫu (Sample Tests)
#### Ví dụ 1:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
10
4 -2 9 16 -5 1 3 7 -2 25
-2
``` | ```
-5 1 3 4 7 9 16 25
``` |

*Giải thích:* Sắp xếp mảng: -5, -2, -2, 1, 3, 4, 7, 9, 16, 25. Sau khi lọc bỏ các số bằng x = -2, mảng còn lại: -5 1 3 4 7 9 16 25.

#### Ví dụ 2:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
3
5 5 5
5
``` | ```
EMPTY
``` |

*Giải thích:* Tất cả các phần tử đều bằng 5, sau khi xóa sạch không còn phần tử nào.

### 5. Thang điểm Subtask
| Subtask | Điểm | Mô tả kiểm thử |
| :--- | :---: | :--- |
| Ví dụ trong đề | 10 điểm | Khớp dữ liệu ví dụ trong đề bài |
| Dữ liệu nhỏ | 30 điểm | Mảng nhỏ ($n \le 20$) |
| Trường hợp đặc biệt | 30 điểm | Tất cả phần tử đều bằng x, hoặc không có phần tử nào bằng x |
| Dữ liệu lớn | 30 điểm | $n \le 100$ |

---

## Bài G: Đoạn liên tiếp bằng nhau dài nhất
- **Mã bài thi:** `K13_07`
- **Điểm tối đa:** 100 điểm
- **Giới hạn thời gian:** 1.0 giây / test
- **Giới hạn bộ nhớ:** 256 MB

### 1. Đề bài
Cho mảng $a$ gồm $n$ số nguyên ban đầu (đánh số chỉ số từ $0$ đến $n-1$).

Hãy tìm đoạn con gồm các phần tử liên tiếp có giá trị bằng nhau có độ dài lớn nhất trong mảng ban đầu.

In ra hai số nguyên cách nhau bởi dấu cách: **vị trí bắt đầu** (chỉ số tính từ $0$) và **độ dài** của đoạn liên tiếp đó. Nếu có nhiều đoạn cùng đạt độ dài lớn nhất, hãy lấy đoạn xuất hiện đầu tiên (chỉ số bắt đầu nhỏ nhất).

### 2. Dữ liệu vào (Input)
- Dòng 1: Số nguyên $n$ ($1 \le n \le 100$).
- Dòng 2: $n$ số nguyên cách nhau bởi dấu cách ($|a_i| \le 1000$).

### 3. Dữ liệu ra (Output)
Hai số nguyên cách nhau bởi dấu cách: chỉ số bắt đầu (tính từ 0) và độ dài của đoạn con liên tiếp bằng nhau dài nhất.

### 4. Ví dụ mẫu (Sample Tests)
#### Ví dụ 1:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
10
4 -2 9 16 -5 1 3 7 -2 25
``` | ```
0 1
``` |

*Giải thích:* Không có hai phần tử kề nhau nào bằng nhau, độ dài đoạn bằng nhau dài nhất là 1. Đoạn đầu tiên bắt đầu tại chỉ số 0.

#### Ví dụ 2:
| Dữ liệu vào (Input) | Dữ liệu ra (Output) |
| :--- | :--- |
| ```
3
5 5 5
``` | ```
0 3
``` |

*Giải thích:* Toàn bộ 3 phần tử đều bằng nhau, bắt đầu từ chỉ số 0 và có độ dài bằng 3.

### 5. Thang điểm Subtask
| Subtask | Điểm | Mô tả kiểm thử |
| :--- | :---: | :--- |
| Ví dụ trong đề | 10 điểm | Khớp dữ liệu ví dụ trong đề bài |
| Dữ liệu nhỏ | 30 điểm | Mảng nhỏ ($n \le 20$) |
| Trường hợp đặc biệt | 30 điểm | $n = 1$, tất cả phần tử khác nhau, nhiều đoạn bằng nhau cùng độ dài |
| Dữ liệu lớn | 30 điểm | $n \le 100$ |

---

