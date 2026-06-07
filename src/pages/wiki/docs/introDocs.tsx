import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";

export const IntroDoc = {
  title: "О проекте Potok",
  category: "Введение",
  toc: [
    { id: "overview", text: "Описание архитектуры" },
    { id: "declarative", text: "Декларативный UI" },
    { id: "sandbox-details", text: "Безопасность и песочница" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="overview">О проекте Potok</h1>
      <p className="doc-body-text">
        <strong>Potok</strong> — это расширяемая платформа для создания децентрализованных плагинов и интерфейсных модулей медиа-экосистемы Potok. Её архитектура построена на принципах строгой безопасности, декларативного проектирования интерфейсов и изолированного выполнения кода в клиентской песочнице.
      </p>
      <p className="doc-body-text">
        В отличие от традиционных плагинов, которые могут нарушить стабильность работы или безопасность клиентского приложения, Potok гарантирует полную изоляцию расширений и предоставляет высокопроизводительный декларативный движок рендеринга.
      </p>

      <div style={{ margin: "var(--space-m) 0", padding: "var(--space-m)", background: "rgba(56, 229, 255, 0.04)", border: "1px solid rgba(56, 229, 255, 0.12)", borderRadius: "var(--radius-m)" }}>
        <h4 style={{ margin: "0 0 var(--space-xs) 0", color: "#38E5FF", fontSize: "0.95rem" }}>Ключевые архитектурные решения:</h4>
        <ul className="doc-bullet-list" style={{ margin: 0, paddingLeft: "var(--space-m)" }}>
          <li><strong>Декларативное описание интерфейсов:</strong> Разметка собирается на базе JS-билдеров и компилируется в защищенную JSON-схему, которая нативно отрисовывается основным приложением.</li>
          <li><strong>Изолированная песочница:</strong> Код плагина выполняется в изолированном контексте, предотвращая несанкционированный доступ к глобальным объектам браузера.</li>
          <li><strong>Глобальный реестр слотов:</strong> Плагины динамически проецируются через React Portals по CSS-селекторам из единого реестра, не засоряя разметку.</li>
          <li><strong>Инспектор слотов:</strong> Встроенный визуальный отладчик для быстрого тестирования кода на лету.</li>
        </ul>
      </div>

      <hr className="wiki-divider" />

      <h2 className="doc-section-h2" id="declarative">Декларативный UI</h2>
      <p className="doc-body-text">
        Вместо прямого манипулирования DOM-деревом или выполнения недоверенного HTML, плагины описывают свой интерфейс с помощью цепочек билдеров (SwiftUI-like синтаксис).
        По завершении сборки объект компилируется в защищенную JSON-схему, передается основному приложению и отрисовывается нативным движком:
      </p>
      
      <CodeBlock 
        language="javascript"
        code={`ui.render(
  VStack()
    .spacing(10)
    .child(Heading("Привет, мир!"))
    .child(Button("Нажми меня").onClick(() => {
      ui.showHUD("success", "Готово!");
    }))
);`}
      />

      <h2 className="doc-section-h2" id="sandbox-details">Безопасность и Песочница</h2>
      <p className="doc-body-text">
        Каждый плагин выполняется внутри изолированного контекста JS-песочницы:
      </p>
      <ul className="doc-bullet-list">
        <li>Глобальные объекты <code>window</code>, <code>document</code>, <code>localStorage</code> затенены значением <code>undefined</code>.</li>
        <li>Любое сетевое взаимодействие осуществляется строго через прокси-клиент <code>Potok.http</code>.</li>
        <li>Локальное хранилище данных изолировано и шифруется персонально для каждого плагина.</li>
      </ul>

      <div style={{ marginTop: "var(--space-l)" }}>
        <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Быстрый пример запуска интерфейса
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(12)
    .child(Heading("Введение").level(2))
    .child(Text("Добро пожаловать в Sandbox! Измените этот текст и запустите заново."))
    .child(Button("Уведомление").onClick(() => ui.showHUD("info", "Клик!")))
);`)}>
          <Play size={12} />
          <span>Запустить этот пример в Sandbox</span>
        </button>
      </div>
    </div>
  )
};

export const InstallDoc = {
  title: "Установка и Docker Compose",
  category: "Введение",
  toc: [
    { id: "compose", text: "Конфигурация Docker Compose" },
    { id: "variables", text: "Переменные окружения" },
    { id: "nginx", text: "Настройка Nginx Proxy" }
  ],
  render: () => {
    const composeCode = `services:
  # 🔍 Поисковый движок по трекерам (SearchEngine)
  potok-searchengine:
    image: ghcr.io/potok-media/potok-searchengine:main
    container_name: potok-searchengine
    restart: unless-stopped
    ports:
      - "6000:6000"
    environment:
      - PORT=6000
      - ConnectionStrings__DefaultConnection=Host=db;Port=5432;Database=potok;Username=potok;Password=potok_password
    volumes:
      - ./config.yml:/app/config.local.yml

  # 🌐 BFF (Gateway / Шлюз)
  potok-gateway:
    image: ghcr.io/potok-media/potok-gateway:main
    container_name: potok-gateway
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - ConnectionStrings__DefaultConnection=Host=db;Port=5432;Database=potok;Username=potok;Password=potok_password
      - Gateway__TmdbApiKey=ВАШ_TMDB_API_KEY
      - Gateway__DefaultSearchEngineUrl=http://potok-searchengine:6000
      - Gateway__DefaultTorrServerUrl=http://potok-torrentgo:5282
      - Gateway__MultiUserMode=false
      - Gateway__JwtSecret=ВАШ_СЕКРЕТНЫЙ_КЛЮЧ_JWT_МИН_32_СИМВОЛА

  # 🌊 Стриминговый движок BitTorrent (TorrentGo)
  potok-torrentgo:
    image: ghcr.io/potok-media/potok-torrentgo:latest
    container_name: potok-torrentgo
    restart: unless-stopped
    ports:
      - "\${TORRENTGO_PORT:-5282}:\${TORRENTGO_PORT:-5282}"
      # ------------------------------------------------------------------------
      # Входящие BitTorrent подключения (DHT/Peer listen port)
      # ------------------------------------------------------------------------
      # - "55123:55123/udp"
      #
      # 💡 ПРИМЕЧАНИЕ ДЛЯ ТЕХ, КТО ЗА NAT / TAILSCALE:
      # Если ваш сервер находится за NAT без проброса портов или подключен через Tailscale,
      # входящие UDP-подключения из внешней сети BitTorrent не смогут дойти напрямую до контейнера.
      # В таком случае этот маппинг бесполезен и должен быть ЗАКОММЕНТИРОВАН.
      # Клиент TorrentGo автоматически перейдет в режим исходящих соединений (outbound-only),
      # чего абсолютно достаточно для стабильного скачивания и стриминга медиафайлов.
      # ------------------------------------------------------------------------
    environment:
      - PORT=\${TORRENTGO_PORT:-5282}

  # 💻 Веб-клиент Potok (Frontend + Wiki)
  potok-web:
    image: ghcr.io/potok-media/potok-web:main
    container_name: potok-web
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      - VITE_DEFAULT_BFF_URL=http://localhost:5000
      - VITE_BLOCK_SETTINGS_INPUT=false
    depends_on:
      - potok-gateway

  # 🗄 База данных PostgreSQL
  db:
    image: postgres:16-alpine
    container_name: potok-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: potok
      POSTGRES_USER: potok
      POSTGRES_PASSWORD: potok_password
    ports:
      - 5432:5432
    volumes:
      - potok-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U potok -d potok"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  potok-db:`;

    const nginxCode = `server {
    listen 80;
    server_name wiki.potok.rip;

    location / {
        proxy_pass http://localhost:3000/wiki;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name app.potok.rip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}`;

    return (
      <div>
        <h1 className="wiki-doc-title" id="compose">Развертывание Potok 2.0</h1>
        <p className="doc-body-text">
          Полный стек Potok состоит из 5 контейнеров: базы данных, поискового движка по торрент-трекерам, стримингового движка BitTorrent (TorrentGo), API шлюза (BFF) и веб-интерфейса.
        </p>

        <h2 className="doc-section-h2">Файл docker-compose.yml</h2>
        <p className="doc-body-text">
          Ниже представлена актуальная производственная сборка docker-compose с подсветкой для локальной установки и деплоя:
        </p>

        <CodeBlock language="yaml" code={composeCode} />

        <p className="doc-body-text">
          Для запуска всех контейнеров выполните следующую команду в директории с compose-файлом:
        </p>
        <CodeBlock language="bash" code="docker compose up -d" />

        <h2 className="doc-section-h2" id="variables">Переменные окружения</h2>
        <p className="doc-body-text">
          Настройте параметры конфигурации в файле <code>.env</code> рядом с compose-файлом:
        </p>

        <table className="doc-table">
          <thead>
            <tr>
              <th>Переменная</th>
              <th>Сервис</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            {/* --- КЛИЕНТЫ --- */}
            <tr>
              <td><code>VITE_DEFAULT_BFF_URL</code></td>
              <td>web</td>
              <td>Публичный URL-адрес шлюза <code>potok-gateway</code> для обращений клиента из браузера.</td>
            </tr>
            <tr>
              <td><code>VITE_BLOCK_SETTINGS_INPUT</code></td>
              <td>web</td>
              <td>Если установлено в <code>true</code>, пользователи не смогут менять URL шлюза вручную.</td>
            </tr>

            {/* --- BFF (Gateway / Шлюз) --- */}
            <tr>
              <td><code>Gateway__TmdbApiKey</code></td>
              <td>gateway</td>
              <td>Ключ API TheMovieDB для загрузки метаданных фильмов и сериалов.</td>
            </tr>
            <tr>
              <td><code>Gateway__JwtSecret</code></td>
              <td>gateway</td>
              <td>Секретный ключ JWT (минимум 32 символа) для шифрования и подписи токенов авторизации в многопользовательском режиме.</td>
            </tr>
            <tr>
              <td><code>Gateway__MultiUserMode</code></td>
              <td>gateway</td>
              <td>Включение многопользовательского режима с авторизацией (true/false).</td>
            </tr>
            <tr>
              <td><code>Gateway__DefaultSearchEngineUrl</code></td>
              <td>gateway</td>
              <td>Внутренний или внешний URL-адрес поискового движка по трекерам (по умолчанию <code>http://potok-searchengine:6000</code>).</td>
            </tr>
            <tr>
              <td><code>Gateway__DefaultTorrServerUrl</code></td>
              <td>gateway</td>
              <td>Внутренний или внешний URL-адрес торрент-движка TorrentGo (по умолчанию <code>http://potok-torrentgo:5282</code>).</td>
            </tr>

            {/* --- ОСТАЛЬНЫЕ --- */}
            <tr>
              <td><code>ConnectionStrings__DefaultConnection</code></td>
              <td>gateway, searchengine</td>
              <td>Строка подключения к базе данных PostgreSQL.</td>
            </tr>
            <tr>
              <td><code>TORRENTGO_PORT</code></td>
              <td>torrentgo</td>
              <td>Порт для стримингового движка TorrentGo (по умолчанию 5282).</td>
            </tr>
          </tbody>
        </table>

        <h2 className="doc-section-h2" id="nginx">Настройка Nginx Reverse Proxy</h2>
        <p className="doc-body-text">
          При развертывании в продакшене рекомендуется использовать Nginx для проксирования запросов к веб-клиенту и шлюзу:
        </p>

        <CodeBlock language="nginx" code={nginxCode} />
      </div>
    );
  }
};
