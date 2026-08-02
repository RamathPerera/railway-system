# ---- Stage 1: Build the React app ----
FROM node:20-alpine AS build

WORKDIR /app

# Vite bakes env vars in at build time. Default to a relative /api path so the
# Nginx proxy can forward requests to the backend service.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# ---- Stage 2: Serve static files with Nginx ----
FROM nginx:alpine

# Custom config: SPA fallback + /api proxy to the backend service
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built app from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
