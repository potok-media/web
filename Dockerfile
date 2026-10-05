# Multi-stage Dockerfile for Potok Web Client
# Supports both Debug (Development) and Release (Production) configurations

# ==============================================================================
# Stage 1: Base image with dependencies
# ==============================================================================
FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY wiki/package*.json ./wiki/
RUN npm ci
COPY . .

# ==============================================================================
# Stage 2: Debug / Development Environment
# ==============================================================================
FROM base AS debug
ENV NODE_ENV=development
EXPOSE 3000
# Run the Vite development server with external exposure and default debug port
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# ==============================================================================
# Stage 3: Build production assets
# ==============================================================================
FROM base AS builder
# Perform production compilation
RUN npm run build

# ==============================================================================
# Stage 4: Release / Production Nginx Server
# ==============================================================================
FROM nginx:alpine AS release
# Copy production bundle from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Generate an entrypoint script to dynamically inject environment variables at runtime
RUN echo -e '#!/bin/sh \n\
# Replace placeholders in index.html with the container environment values \n\
sed -i "s|__VITE_DEFAULT_BFF_URL__|${VITE_DEFAULT_BFF_URL}|g" /usr/share/nginx/html/index.html \n\
sed -i "s|__VITE_BLOCK_SETTINGS_INPUT__|${VITE_BLOCK_SETTINGS_INPUT:-false}|g" /usr/share/nginx/html/index.html \n\
\n\
# Start the Nginx web server \n\
exec nginx -g "daemon off;"' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
