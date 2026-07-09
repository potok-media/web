/** Canonical SearchEngine config.yml sample — keep in sync with backend/Potok.Backend.SearchEngine/config.yml */
export const SEARCH_ENGINE_CONFIG_YAML = `# ./config.yml next to docker-compose.yml → mounted as config.local.yml

cache:
  enable: true
  expiry: 15
  auth-expiry: 1

refresh:
  enable: false
  timeout: 1440
  older-than-min: 180
  limit: 50

ffprobe:
  enable: false
  timeout: 60
  tsuri: ''
  batch-size: 20
  attempts: 3
  authorization:
    login: ''
    password: ''

# Прокси для HTTP-запросов SearchEngine к трекерам. list: [] — без прокси.
# Элемент: url (обязательно), username/password — если прокси с авторизацией.
proxy:
  bypass-on-local: false
  list:
    - url: 'http://proxy.example.com:8080'
      username: ''
      password: ''

rutracker:
  enable-search: true
  authorization:
    login: ''
    password: ''
  popular:
    enable: false
    timeout: 600
    max-pages: 3
    categories: [1106, 1105, 2491, 1389]

animelayer:
  enable-search: true
  authorization:
    login: ''
    password: ''

nnmclub:
  enable-search: true

rutor:
  enable-search: true

aniliberty:
  enable-search: true

kinozal:
  enable-search: true
  authorization:
    login: ''
    password: ''

megapeer:
  enable-search: true`;