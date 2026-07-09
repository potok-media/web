import { Play } from "lucide-react";
import { Button } from "../../../components/ui";
import { CodeBlock } from "../../../components/wiki/CodeBlock";

export const ManifestDoc = {
  title: "Спецификация Манифеста",
  category: "API",
  toc: [
    { id: "fields", text: "Обязательные и опциональные поля" },
    { id: "permissions", text: "Управление правами доступа" },
    { id: "slots-section", text: "Слоты интерфейса (Slots)" },
    { id: "config-section", text: "Конфигурация плагина (Config)" },
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
      "title": "Смотреть"
    },
    {
      "id": "torrents-sidebar-status",
      "slotName": "sidebar-status",
      "title": "Статус Торрентов"
    }
  ],
  "config": {
    "torrentGoURL": {
      "type": "string",
      "default": "https://torrent.potok.rip",
      "label": "Адрес TorrentGo"
    },
    "searchEngineURL": {
      "type": "string",
      "default": "https://search.potok.rip",
      "label": "Адрес SearchEngine"
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
              <td>Категория расширения: <code>sources</code> для источников медиа, <code>visual</code> для тем оформления, <code>other</code> для прочего.</td>
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

        <h2 className="doc-section-h2" id="slots-section">Слоты интерфейса (Slots)</h2>
        <p className="doc-body-text">
          Каждый элемент массива <code>slots</code> описывает точку встраивания плагина в интерфейс хоста. Поддерживаются следующие значения для поля <code>slotName</code>:
        </p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Слот (slotName)</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sidebar-menu</code></td>
              <td>Верхняя секция меню боковой панели (самый верхний уровень навигации).</td>
            </tr>
            <tr>
              <td><code>sidebar-menu-home</code></td>
              <td>Дополнительные пункты меню рядом с разделом «Главная».</td>
            </tr>
            <tr>
              <td><code>sidebar-menu-library</code></td>
              <td>Дополнительные пункты меню в разделе «Медиатека».</td>
            </tr>
            <tr>
              <td><code>sidebar-status</code></td>
              <td>Нижняя часть боковой панели (для отображения статуса/сервисных кнопок).</td>
            </tr>
            <tr>
              <td><code>media-actions</code></td>
              <td>Блок действий на странице фильма или сериала (например, кнопки запуска просмотра).</td>
            </tr>
            <tr>
              <td><code>details-bottom</code></td>
              <td>Панель под основной информацией о медиафайле в деталях.</td>
            </tr>
            <tr>
              <td><code>settings-color-accent</code></td>
              <td>Слот настроек для управления цветовой палитрой и оформлениями.</td>
            </tr>
            <tr>
              <td><code>settings-tabs</code></td>
              <td>Добавление кастомных вкладок в панель настроек хост-приложения.</td>
            </tr>
            <tr>
              <td><code>extension-page</code></td>
              <td>Страница расширения, открывающаяся во весь экран.</td>
            </tr>
          </tbody>
        </table>

        <h2 className="doc-section-h2" id="config-section">Конфигурация плагина (Config)</h2>
        <p className="doc-body-text">
          Поле <code>config</code> позволяет объявлять настройки плагина, которые автоматически отрисуются хостом в панели настроек. Объект <code>config</code> состоит из пар <code>ключ: описание_параметра</code>, где описание параметра имеет следующую структуру:
        </p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Поле свойства</th>
              <th>Тип</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>type</code></td>
              <td>string (required)</td>
              <td>Тип значения настройки. Поддерживаемые типы: <code>"string"</code>, <code>"boolean"</code> (рендерится как тумблер), <code>"number"</code>, <code>"select"</code> (выпадающий список опций) и <code>"notice"</code> (подсвечиваемая оранжевая инфо-плашка для вывода предупреждений).</td>
            </tr>
            <tr>
              <td><code>default</code></td>
              <td>any (required)</td>
              <td>Значение по умолчанию для настройки. Тип должен соответствовать указанному в поле <code>type</code>.</td>
            </tr>
            <tr>
              <td><code>label</code></td>
              <td>string (required)</td>
              <td>Текстовая метка (заголовок), которая будет отображаться пользователю в панели настроек.</td>
            </tr>
            <tr>
              <td><code>dependsOn</code></td>
              <td>string (optional)</td>
              <td>Имя другого параметра из <code>config</code>, от включения или значения которого зависит видимость текущей настройки.</td>
            </tr>
          </tbody>
        </table>

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
    { id: "subscription", text: "Подписка и отписка" },
    { id: "deep-reactivity", text: "Глубокая реактивность" },
    { id: "batching", text: "Пакетные обновления (Batching)" },
    { id: "reactive-example", text: "Интерактивный пример" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="state-api">Управление состоянием</h1>
      <p className="doc-body-text">
        Для динамического обновления интерфейса SDK предоставляет функцию <code>createState</code>. Она оборачивает переданный объект в Proxy, перехватывающий любые мутации полей и уведомляющий подписчиков.
      </p>

      <h2 className="doc-section-h2" id="subscription">Подписка и отписка</h2>
      <p className="doc-body-text">
        Реактивное состояние имеет встроенный метод подписки <code>$subscribe(callback)</code>. Обычно в качестве коллбека передается функция рендеринга плагина. Метод <code>$subscribe</code> возвращает функцию отписки (unsubscribe), вызов которой удаляет слушатель и предотвращает утечки памяти:
      </p>
      
      <CodeBlock 
        language="javascript"
        code={`const state = createState({ title: "Привет" });

function render() {
  ui.render(Text(state.title));
}

// Подписываемся на изменения:
const unsubscribe = state.$subscribe(render);

// Вызываем для первоначального отображения:
render();

// Когда подписка больше не нужна (например, при выгрузке плагина):
// unsubscribe();`}
      />

      <h2 className="doc-section-h2" id="deep-reactivity">Глубокая реактивность</h2>
      <p className="doc-body-text">
        Рантайм отслеживает изменения на любой глубине вложенности. При обращении к свойствам-объектам они динамически оборачиваются в прокси, что позволяет реактивно реагировать на изменение глубоких ключей и модификации массивов:
      </p>

      <CodeBlock 
        language="javascript"
        code={`const state = createState({
  user: {
    profile: { name: "Алексей" }
  },
  genres: ["Экшен", "Драма"]
});

// 1. Изменение глубоко вложенного свойства (автоматически вызовет рендер)
state.user.profile.name = "Иван";

// 2. Модификация массивов (добавление, удаление, сортировка)
state.genres.push("Комедия");
state.genres.splice(0, 1);`}
      />

      <h2 className="doc-section-h2" id="batching">Пакетные обновления (Batching)</h2>
      <p className="doc-body-text">
        Для оптимизации производительности вызовы подписчиков группируются с использованием очереди микрозадач (через <code>Promise.resolve()</code>). Это предотвращает множественные перерисовки интерфейса при синхронном изменении нескольких полей подряд:
      </p>

      <CodeBlock 
        language="javascript"
        code={`const state = createState({ count: 0, lastAction: "none" });

state.$subscribe(() => {
  console.log("Рендер вызван!");
});

// Синхронное изменение нескольких свойств:
state.count++;
state.lastAction = "increment";
state.count += 5;

// В консоли отобразится ровно ОДИН вывод "Рендер вызван!", 
// так как все обновления объединились в один такт.`}
      />

      <h2 className="doc-section-h2" id="reactive-example">Код реактивного счетчика</h2>
      <p className="doc-body-text">
        В песочнице вы можете интерактивно протестировать работу реактивности на примере этого счетчика:
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

      <Button variant="primary" className="doc-sandbox-btn" onClick={() => openInSandbox(`// Интерактивный пример реактивности
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
        <Play size="0.75rem" />
        <span>Запустить пример с реактивностью в Sandbox</span>
      </Button>
    </div>
  )
};
