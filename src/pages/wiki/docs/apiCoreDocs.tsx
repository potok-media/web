import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";

export const ManifestDoc = {
  title: "Спецификация Манифеста",
  category: "API",
  toc: [
    { id: "fields", text: "Обязательные и опциональные поля" },
    { id: "permissions", text: "Управление правами доступа" },
    { id: "manifest-example", text: "Полный пример" }
  ],
  render: () => {
    const manifestCode = `{
  "id": "potok-torrents",
  "name": "Поиск торрентов",
  "version": "1.0.0",
  "description": "Поиск и стриминг раздач из базы торрент-трекеров",
  "author": "Potok Team",
  "category": "sources",
  "entrypoint": "index.js",
  "permissions": [
    "storage",
    "http-proxy",
    "ui-notifications"
  ],
  "slots": [
    {
      "id": "torrents-media-actions",
      "slotName": "media-actions",
      "title": "Смотреть торренты"
    }
  ],
  "config": {
    "torrentGoURL": {
      "type": "string",
      "default": "https://torrent.potok.rip",
      "label": "Адрес TorrentGo"
    }
  }
}`;
    return (
      <div>
        <h1 className="wiki-doc-title" id="fields">Манифест плагина</h1>
        <p className="doc-body-text">
          Каждое расширение Potok обязано содержать файл <code>manifest.json</code> в корневой директории. Этот файл считывается хостом для первичной инициализации, настройки интерфейсных слотов и выделения прав доступа.
        </p>

        <h2 className="doc-section-h2">Поля манифеста</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Поле</th>
              <th>Тип</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>id</code></td>
              <td>string (required)</td>
              <td>Уникальный строковый идентификатор плагина (например, <code>potok-torrents</code>).</td>
            </tr>
            <tr>
              <td><code>name</code></td>
              <td>string (required)</td>
              <td>Название плагина для показа пользователю в интерфейсе.</td>
            </tr>
            <tr>
              <td><code>version</code></td>
              <td>string (optional)</td>
              <td>Версия плагина в формате SemVer (например, <code>1.0.0</code>).</td>
            </tr>
            <tr>
              <td><code>description</code></td>
              <td>string (optional)</td>
              <td>Краткое описание назначения и возможностей расширения.</td>
            </tr>
            <tr>
              <td><code>author</code></td>
              <td>string (optional)</td>
              <td>Автор или команда разработчиков расширения.</td>
            </tr>
            <tr>
              <td><code>entrypoint</code></td>
              <td>string (required)</td>
              <td>Путь к скомпилированному JS-файлу относительно папки плагина (обычно <code>index.js</code>).</td>
            </tr>
            <tr>
              <td><code>category</code></td>
              <td>string (optional)</td>
              <td>Категория расширения (например: <code>sources</code> для источников медиа, <code>visual</code> для тем оформления, <code>other</code> для прочего).</td>
            </tr>
            <tr>
              <td><code>permissions</code></td>
              <td>string[] (optional)</td>
              <td>Список запрашиваемых разрешений безопасности (<code>storage</code>, <code>http-proxy</code>, <code>ui-notifications</code>).</td>
            </tr>
            <tr>
              <td><code>slots</code></td>
              <td>object[] (optional)</td>
              <td>Список точек встраивания UI плагина. Каждый объект описывает <code>id</code> вклада, <code>slotName</code> целевого слота и <code>title</code>.</td>
            </tr>
            <tr>
              <td><code>config</code></td>
              <td>object (optional)</td>
              <td>Набор настраиваемых параметров расширения, доступных для редактирования в панели настроек.</td>
            </tr>
          </tbody>
        </table>

        <h2 className="doc-section-h2" id="permissions">Разрешения (Permissions)</h2>
        <p className="doc-body-text">
          Если плагин пытается вызвать API, на которое у него нет прав в манифесте, рантайм заблокирует выполнение операции:
        </p>
        <ul className="doc-bullet-list">
          <li><code>storage</code> — открывает доступ к локальной БД и хранилищу ключей через методы <code>storage.local</code>.</li>
          <li><code>http-proxy</code> — открывает доступ к сетевым запросам через <code>http</code> прокси-клиент хоста (для обхода CORS).</li>
          <li><code>ui-notifications</code> — открывает доступ к системным уведомлениям и HUD-подсказкам (например, <code>ui.showHUD()</code>).</li>
        </ul>

        <h2 className="doc-section-h2" id="manifest-example">Пример файла manifest.json</h2>
        <CodeBlock language="json" code={manifestCode} />
      </div>
    );
  }
};

export const StateDoc = {
  title: "Реактивность и State",
  category: "API",
  toc: [
    { id: "state-api", text: "createState API" },
    { id: "subscription", text: "Подписка на обновления" },
    { id: "reactive-example", text: "Интерактивный пример" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="state-api">Управление состоянием</h1>
      <p className="doc-body-text">
        Для динамического обновления интерфейса SDK предоставляет функцию <code>createState</code>. Она оборачивает переданный объект в Proxy, перехватывающий любые мутации полей и уведомняющий подписчиков.
      </p>

      <h2 className="doc-section-h2" id="subscription">Метод $subscribe</h2>
      <p className="doc-body-text">
        Реактивное состояние имеет встроенный метод подписки <code>$subscribe(callback)</code>. Обычно в качестве коллбека передается функция рендеринга плагина:
      </p>
      
      <CodeBlock 
        language="javascript"
        code={`const state = createState({ title: "Привет" });

function render() {
  ui.render(Text(state.title));
}

state.$subscribe(render); // Авторендер при любых изменениях state`}
      />

      <h2 className="doc-section-h2" id="reactive-example">Код реактивного счетчика</h2>
      <p className="doc-body-text">
        При изменении состояния через события компонентов, рантайм мгновенно перекомпилирует схему:
      </p>
      
      <CodeBlock 
        language="javascript"
        code={`const state = createState({ clicks: 0 });

function render() {
  ui.render(
    VStack()
      .child(Text("Кликов: " + state.clicks))
      .child(Button("Кликнуть").onClick(() => state.clicks++))
  );
}`}
      />

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Интерактивный пример реактивности
const { ui, createState } = PotokSDK;

const state = createState({
  clicks: 0,
  lastClicked: "Никогда"
});

function draw() {
  ui.render(
    Card()
      .title("Счетчик кликов")
      .child(
        VStack()
          .spacing(12)
          .child(Text("Кликов зафиксировано: " + state.clicks).bold(true).size("lg"))
          .child(Text("Последнее нажатие: " + state.lastClicked).variant("secondary"))
          .child(
            Button("Клик!")
              .variant("primary")
              .onClick(() => {
                state.clicks++;
                state.lastClicked = new Date().toLocaleTimeString();
              })
          )
      )
  );
}

state.$subscribe(draw);
draw();`)}>
        <Play size={12} />
        <span>Запустить пример с реактивностью в Sandbox</span>
      </button>
    </div>
  )
};
