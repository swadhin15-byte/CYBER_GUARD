# One image: build the dashboard with Node, serve it and the API with Python.
# The frontend and backend share an origin, so there is no CORS to configure
# and the websocket needs no separate host.

FROM node:20-alpine AS ui
WORKDIR /ui
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CYBERGUARD_STATIC=/app/static

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY data/ ./data/
COPY --from=ui /ui/dist ./static

WORKDIR /app/backend

# One worker on purpose: incidents live in memory, so a second worker would
# serve a different board. Move the store to Redis or Postgres before scaling.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
