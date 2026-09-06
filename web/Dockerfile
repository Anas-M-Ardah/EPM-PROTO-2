# syntax=docker/dockerfile:1
#
# Angular 19 app, built once and served as static files by nginx, which also
# proxies /api to the api container (see nginx.conf).

# ── build ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /src

# Lockfile first so npm ci is cached until a dependency actually changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration docker

# ── runtime ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
# The @angular-devkit application builder writes the browser bundle to
# dist/<project>/browser (angular.json outputPath is dist/web).
COPY --from=build /src/dist/web/browser /usr/share/nginx/html

EXPOSE 80
