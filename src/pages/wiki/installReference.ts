/** Full-stack .env for docker-compose.yml (web + gateway + db + optional torrents). */
export const FULL_STACK_DOT_ENV = `# web
WEB_PORT=3000
VITE_DEFAULT_BFF_URL=http://localhost:5000
VITE_BLOCK_SETTINGS_INPUT=false

# gateway — https://www.themoviedb.org/
GATEWAY_PORT=5000
GATEWAY_TMDB_API_KEY=
GATEWAY_MULTI_USER_MODE=false
GATEWAY_JWT_SECRET=change-me-in-production-32chars-min

# database (bundled db service)
DB_HOST=db
DB_PORT=5432
DB_NAME=potok
DB_USER=potok
DB_PASSWORD=changeme

# torrents (optional)
SEARCH_ENGINE_PORT=6000
TORRENTGO_PORT=5282
# GPU_DEVICE=/dev/dri:/dev/dri`;

/** Web container only — gateway runs elsewhere. */
export const WEB_ONLY_DOT_ENV = `WEB_PORT=3000
VITE_DEFAULT_BFF_URL=http://localhost:5000
VITE_BLOCK_SETTINGS_INPUT=false`;