Định nghĩa struct Patient { char id[15]; int p, t, age; }. Dùng qsort với hàm so sánh: nếu p khác nhau return a.p - b.p; nếu t khác return a.t - b.t; return b.age - a.age.
