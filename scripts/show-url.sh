#!/usr/bin/env bash
# In ra link công khai của Quick Tunnel (đổi mỗi lần container tunnel khởi động lại).
docker compose -p minijudge logs tunnel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -n 1
