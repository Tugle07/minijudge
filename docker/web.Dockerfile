# Container web: chỉ phục vụ giao diện + database, KHÔNG chạy code của người dùng.
FROM node:24-bookworm-slim

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci --omit=dev

COPY web/server.js ./
COPY web/lib lib
COPY web/routes routes
COPY web/public public
COPY problems /app/problems

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data \
    PROBLEMS_DIR=/app/problems
RUN mkdir -p /data /problems-custom && chown node:node /data /problems-custom
USER node

EXPOSE 3000
CMD ["node", "server.js"]
