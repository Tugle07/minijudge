#!/usr/bin/env bash
# Build lõi C rồi chấm toàn bộ bài mẫu, so với kết quả mong đợi. Dùng trong CI và khi test tay trên Linux.
set -euo pipefail
cd "$(dirname "$0")/.."

make
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

fail=0
while read -r pid file expect; do
  [ -z "$pid" ] && continue
  out="$(./build/judge-cli problems "$pid" "samples/$file" "$WORK/run" || true)"
  got="$(printf '%s' "$out" | sed -n 's/^{"verdict":"\([A-Z]*\)".*/\1/p')"
  if [ "$got" = "$expect" ]; then
    echo "PASS  $file -> $got"
  else
    echo "FAIL  $file: expected $expect, got '${got:-?}'"
    echo "      $out"
    fail=1
  fi
done <<'EOF'
P01 p01-ac.c AC
P01 p01-wa-overflow.c WA
P01 p01-ce.c CE
P01 p01-re.c RE
P01 p01-tle.c TLE
P01 p01-mle.c MLE
P02 p02-ac-sliding-window.c AC
P02 p02-tle-brute-force.c TLE
EOF

exit "$fail"
