# Container judge: biên dịch + chạy bài nộp. Không có database, không ra Internet.
# Chạy bằng root (đã bị docker-compose tước gần hết quyền) để hạ quyền bài nộp xuống "nobody".
FROM node:24-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libc6-dev make \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY Makefile ./
COPY core core
COPY cli cli
COPY console console
RUN make && chmod -R a+rX /app/build

COPY problems /app/problems
COPY judge/package.json judge/worker.js judge/judge-runner.js judge/
RUN chmod -R a+rX /app/problems

ENV PORT=4000 \
    PROBLEMS_DIR=/app/problems \
    JUDGE_BIN=/app/build/judge-cli \
    WORK_ROOT=/work

EXPOSE 4000
CMD ["node", "judge/worker.js"]
