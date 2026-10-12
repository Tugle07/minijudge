# Triển khai MiniJudge cho cả lớp (máy cá nhân + Cloudflare Tunnel)

```
git push main ──► GitHub Actions (máy GitHub): build C + chấm 8 bài mẫu
                      │ đạt
                      ▼
              Runner trên máy mình (WSL Ubuntu) ──► docker compose up
                                                     ├─ web    : giao diện + database (volume minijudge-data)
                                                     ├─ judge  : chạy bài nộp, KHÔNG có Internet/database, user nobody
                                                     └─ tunnel : Cloudflare ──► https://xxx.trycloudflare.com
```

Làm 1 lần, mất khoảng 30–45 phút. Sau đó mỗi lần `git push` lên `main` là web tự cập nhật.

---

## Bước 1. Cài Git trên Windows và đẩy code lên GitHub

```bash
winget install Git.Git
```

Mở terminal mới, trong thư mục `BTL-KTLT-MiniJudge`:

```bash
git init -b main
```

```bash
git add . && git commit -m "feat: MiniJudge console + web"
```

Trên github.com tạo repo mới tên `minijudge`, chọn **Private**. Repo **bắt buộc Private** vì runner chạy trên máy mình. Không tick tạo README. Sau đó:

```bash
git remote add origin https://github.com/Tugle07/minijudge.git
```

```bash
git push -u origin main
```

Vào **Settings → Collaborators** để mời các thành viên trong nhóm (YC01: mỗi người commit bằng tài khoản riêng).

## Bước 2. Cài Docker trong WSL Ubuntu

Mở **Ubuntu** (WSL). Kiểm tra systemd đã bật chưa:

```bash
cat /etc/wsl.conf
```

Nếu chưa có dòng `systemd=true`, thêm vào rồi khởi động lại WSL:

```bash
printf '[boot]\nsystemd=true\n' | sudo tee -a /etc/wsl.conf
```

Chạy lệnh này trong PowerShell Windows, rồi mở lại Ubuntu:

```bash
wsl --shutdown
```

Cài Docker Engine (script chính thức của Docker):

```bash
curl -fsSL https://get.docker.com | sudo sh
```

Cho user hiện tại dùng docker không cần sudo (đóng và mở lại Ubuntu sau lệnh này):

```bash
sudo usermod -aG docker $USER
```

Kiểm tra:

```bash
docker run --rm hello-world
```

## Bước 3. Tạo file cấu hình bí mật trên máy

Trong Ubuntu:

```bash
nano ~/minijudge.env
```

Nội dung (xem mẫu ở `minijudge.env.example`):

```
REGISTER_CODE=ma-lop-cua-sep
ADMIN_USERS=ten-tai-khoan-cua-sep
```

Mã lớp này sếp gửi riêng cho lớp (sau đó đổi được trong Admin › Cài đặt). Tài khoản trong `ADMIN_USERS` luôn có quyền Admin: deploy xong, sếp đăng ký đúng tên đó rồi vào `/admin.html`. Không commit file này lên GitHub.

## Bước 4. Cài GitHub Actions runner trong WSL

1. Trên GitHub: repo `minijudge` → **Settings → Actions → Runners → New self-hosted runner**.
2. Chọn **Linux**, **x64**. GitHub hiện sẵn các lệnh `mkdir actions-runner…`, `curl…`, `tar…`, `./config.sh …`. Copy chạy lần lượt trong Ubuntu.
3. Khi `./config.sh` hỏi:
   - *Enter the name of runner group*: Enter
   - *Enter the name of runner*: `may-cua-sep`
   - *Enter any additional labels*: **`minijudge`** ← bắt buộc, workflow tìm runner theo nhãn này
   - *Enter name of work folder*: Enter
4. Cài runner thành dịch vụ để tự chạy khi WSL khởi động:

```bash
sudo ./svc.sh install && sudo ./svc.sh start
```

## Bước 5. Deploy lần đầu

Trên GitHub → tab **Actions** → **Test & Deploy** → **Run workflow**. Hoặc push một commit bất kỳ lên `main`.

Khi cả 2 job `test` và `deploy` có dấu ✅, lấy link công khai trong Ubuntu (tại thư mục làm việc của runner, hoặc bất kỳ đâu):

```bash
docker compose -p minijudge logs tunnel | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -n 1
```

Gửi link đó cho lớp. Trên máy mình có thể mở thẳng http://127.0.0.1:8080.

## Bước 6. Giữ server chạy

- **Không cho máy ngủ** khi cắm sạc: Settings → System → Power → Screen and sleep → *When plugged in, put my device to sleep after*: **Never**.
- **Giữ WSL luôn chạy:** Windows có thể tắt WSL khi không mở cửa sổ Ubuntu nào. Chạy lệnh sau một lần trong PowerShell (tạo tác vụ tự bật WSL khi đăng nhập):

```bash
Register-ScheduledTask -TaskName "MiniJudge-WSL" -Trigger (New-ScheduledTaskTrigger -AtLogOn) -Action (New-ScheduledTaskAction -Execute "wsl.exe" -Argument "-d Ubuntu --exec sleep infinity") -Settings (New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries)
```

- Container có `restart: unless-stopped` nên tự bật lại khi Docker khởi động.

## Link cố định (nên làm khi lớp dùng thường xuyên)

Link `*.trycloudflare.com` **đổi mỗi khi container tunnel khởi động lại** (tắt máy, restart WSL). Muốn link cố định:

1. Có một tên miền. Sinh viên 18–23 tuổi có thể đăng ký tên miền `.id.vn` miễn phí theo chương trình của VNNIC; kiểm tra điều kiện tại nhà đăng ký.
2. Thêm tên miền vào Cloudflare (gói Free) → **Zero Trust → Networks → Tunnels → Create tunnel** → chọn Cloudflared → copy **token**.
3. Trong tunnel, thêm *Public hostname*, ví dụ `judge.ten-mien.id.vn`, trỏ tới service `http://web:3000`.
4. Thêm vào `~/minijudge.env`:

```
TUNNEL_COMMAND=tunnel --no-autoupdate run
TUNNEL_TOKEN=token-vua-copy
```

5. Chạy lại workflow deploy.

## Vận hành hằng ngày

| Việc | Cách làm |
|---|---|
| Sửa code / thêm đề | Sửa trong repo → `git push` → Actions tự test và deploy |
| Thêm đề mới | Tạo `problems/P03/...` + thêm `P03` vào `problems/index.txt` → push |
| Xem log | `docker compose -p minijudge logs -f web judge` |
| Sao lưu database | `docker run --rm -v minijudge_minijudge-data:/data -v $HOME:/backup alpine tar czf /backup/minijudge-$(date +%F).tgz -C /data .` |
| Tạm dừng web | `docker compose -p minijudge stop` |

## An toàn

- Bài nộp chạy trong container `judge`: không có mạng ra ngoài, hệ thống file chỉ đọc, chạy dưới user `nobody`, không tạo được tiến trình con, giới hạn 1 CPU / 1 GB RAM.
- Database nằm ở container `web`. Container `judge` không truy cập được.
- Đăng nhập/đăng ký: tối đa 20 lần / 15 phút mỗi IP. Nộp bài: tối đa 6 lần / phút.
- Repo phải **Private**: workflow chỉ deploy khi push vào `main`, không chạy code từ pull request của người ngoài trên máy mình.
