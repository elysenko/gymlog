# syntax=docker/dockerfile:1
# Combined nginx + supervisord container: React/Vite SPA served by nginx,
# FastAPI backend on 127.0.0.1:3000, nginx proxies /api/ → backend.

# ---- Stage 1: build the React/Vite frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --loglevel=error \
 || npm install --no-audit --no-fund --loglevel=error
COPY web/ ./
RUN npx vite build

# ---- Stage 2: runtime image with nginx + python backend + supervisord ----
FROM python:3.12-slim AS runtime

# Install nginx and supervisord
RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx supervisor \
 && rm -rf /var/lib/apt/lists/*

# ---- Backend: install Python deps and copy source ----
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# ---- Frontend: copy built assets ----
COPY --from=frontend-builder /app/web/dist /usr/share/nginx/html

# ---- nginx config ----
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# ---- supervisord config ----
COPY supervisord.conf /etc/supervisord.conf

ENV PYTHONUNBUFFERED=1 \
    PORT=3000 \
    ENV=production

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
