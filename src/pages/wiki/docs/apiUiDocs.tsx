import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";

export const UiMethodsDoc = {
  title: "Глобальные методы UI",
  category: "API",
  toc: [
    { id: "render", text: "ui.render()" },
    { id: "hud", text: "ui.showHUD()" },
    { id: "player", text: "ui.playVideo()" },
    { id: "ep-selector", text: "ui.showEpisodeSelector()" },
    { id: "navigation", text: "Навигация (ui.navigateTo)" },
    { id: "themes", text: "Темы оформления" },
    { id: "registration", text: "Регистрация плагина и слотов" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="render">Глобальный объект ui</h1>
      <p className="doc-body-text">
        Помимо сборщиков разметки, <code>PotokSDK.ui</code> предоставляет набор методов для управления состоянием хост-приложения, навигации, вызова плеера и регистрации расширения в системе.
      </p>

      <h2 className="doc-section-h2" id="render-method">Метод ui.render()</h2>
      <p className="doc-body-text">
        Метод <code>ui.render(component, slotId?)</code> компилирует декларативную разметку плагина и отправляет её на рендеринг хосту. Если указан <code>slotId</code>, разметка проецируется в конкретный слот, иначе рендерится на основной экран песочницы.
      </p>

      <h2 className="doc-section-h2" id="hud">Уведомления HUD</h2>
      <p className="doc-body-text">
        Метод <code>ui.showHUD(type: string, message: string)</code> вызывает кратковременный системный баннер в углу экрана. Поддерживаемые типы: <code>"success"</code>, <code>"error"</code>, <code>"info"</code>, <code>"warning"</code>.
      </p>

      <h2 className="doc-section-h2" id="player">Запуск Видеоплеера</h2>
      <p className="doc-body-text">
        Метод <code>ui.playVideo(playbackInfo)</code> запускает полноэкранный видеоплеер. Объект воспроизведения должен содержать следующие поля:
      </p>
      <CodeBlock 
        language="javascript" 
        code={`ui.playVideo({
  title: "Название фильма",
  streamUrl: "http://example.com/video.m3u8",
  audios: [
    { name: "Русский дубляж", url: "http://example.com/video_ru.m3u8" },
    { name: "Английский оригинал", url: "http://example.com/video_en.m3u8" }
  ], // Опционально: альтернативные озвучки/дорожки
  headers: { "User-Agent": "PotokPlayer" }, // Опционально
  position: 3600 // Начать воспроизведение с секунды (опционально)
});`} 
      />

      <h2 className="doc-section-h2" id="ep-selector">Селектор Серий</h2>
      <p className="doc-body-text">
        Метод <code>ui.showEpisodeSelector(config)</code> вызывает системное всплывающее окно для выбора сезонов и серий, разработанное специально для сериалов.
      </p>
      <CodeBlock 
        language="javascript" 
        code={`ui.showEpisodeSelector({
  title: "Имя сериала",
  seasons: [{ seasonNumber: 1, name: "Сезон 1" }],
  episodes: [{ episodeNumber: 1, name: "Серия 1", seasonNumber: 1 }],
  onPlay: (ep) => {
    // Вызывается при клике на серию
    console.log("Играем:", ep.seasonNumber, ep.episodeNumber);
  }
});`} 
      />

      <h2 className="doc-section-h2" id="navigation">Навигация</h2>
      <p className="doc-body-text">
        Метод <code>ui.navigateTo(to: string, state?: any)</code> позволяет плагину программно перенаправить пользователя на другой раздел хост-приложения (например, в настройки, медиатеку или на главную страницу):
      </p>
      <CodeBlock 
        language="javascript" 
        code={`ui.navigateTo("/settings");
ui.navigateTo("/library", { filter: "watchlist" });`} 
      />

      <h2 className="doc-section-h2" id="themes">Темы оформления</h2>
      <p className="doc-body-text">
        Визуальные плагины могут регистрировать кастомные цветовые схемы и управлять активным акцентом оформления с помощью методов:
      </p>
      <ul className="doc-bullet-list">
        <li><code>ui.registerThemes(themes: Theme[])</code> — регистрирует массив кастомных цветовых тем оформления на хосте.</li>
        <li><code>ui.setAccentTheme(themeId: string)</code> — динамически переключает активный цветовой акцент хоста на указанную тему.</li>
      </ul>

      <h2 className="doc-section-h2" id="registration">Регистрация в системе</h2>
      <p className="doc-body-text">
        Для интеграции в жизненный цикл хост-приложения используются глобальные функции SDK:
      </p>
      
      <div className="doc-table-wrapper" style={{ marginTop: "1rem" }}>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Функция API</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>registerPlugin(meta)</code></td>
              <td>Регистрирует базовые метаданные плагина (уникальный <code>id</code>, отображаемое имя <code>name</code> и версию). Должна вызываться первой при загрузке скрипта.</td>
            </tr>
            <tr>
              <td><code>registerSource(config)</code></td>
              <td>Регистрирует плагин как поисковый провайдер (источник медиа-потоков). Хост обращается к зарегистрированному источнику при поиске видеофайлов.</td>
            </tr>
            <tr>
              <td><code>registerSlotContribution(config)</code></td>
              <td>Регистрирует графический вклад в указанный интерфейсный слот (например, в кнопки действий или под описание медиафайла).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="doc-section-h3" style={{ marginTop: "1.5rem" }} id="register-slot-docs">Детальное описание <code>registerSlotContribution</code></h3>
      <p className="doc-body-text">
        Эта функция позволяет плагину динамически внедрять собственный интерфейс в предопределенные области приложения. Хост вызывает рендер-функцию плагина при монтировании соответствующего экрана и отрисовывает возвращаемый макет.
      </p>
      
      <p className="doc-body-text">
        Аргумент <code>config</code> представляет собой объект со следующими параметрами:
      </p>
      <ul className="doc-bullet-list">
        <li><code>id</code> (string, обязательное) — Уникальный идентификатор вклада в рамках плагина (должен соответствовать <code>id</code> из массива <code>slots</code> в манифесте).</li>
        <li><code>slotName</code> (string, обязательное) — Целевая точка встраивания (например, <code>"media-actions"</code>, <code>"details-bottom"</code>, <code>"extension-page"</code>).</li>
        <li><code>render(props)</code> (function, обязательное) — Функция, возвращающая UI. Принимает <code>props</code> (данные текущего контекста хоста, например, информацию о просматриваемом фильме) и должна возвращать объект:
          <ul className="doc-bullet-list" style={{ marginTop: "4px", paddingLeft: "1.2rem" }}>
            <li><code>label</code> (string) — Название/подпись для вклада.</li>
            <li><code>icon</code> (string, опционально) — Имя иконки Lucide.</li>
            <li><code>layout</code> (UIComponent) — Дерево UI компонентов (создается с помощью билдеров <code>Card()</code>, <code>VStack()</code>, <code>Button()</code> и т.д.).</li>
          </ul>
        </li>
      </ul>

      <h3 className="doc-section-h3" style={{ marginTop: "1.5rem" }}>Пример простого плагина (Easy Plugin)</h3>
      <p className="doc-body-text">
        Ниже приведена структура и файлы минимального рабочего расширения, которое добавляет кастомную кнопку запуска трейлера и информационный блок на страницу деталей фильма:
      </p>

      <h4 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem", margin: "1rem 0 0.5rem 0" }}>1. Структура папки плагина:</h4>
      <CodeBlock
        language="text"
        code={`my-easy-plugin/
├── manifest.json   # Метаданные и объявление слотов
└── index.js        # Исполняемый JS код плагина`}
      />

      <h4 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem", margin: "1rem 0 0.5rem 0" }}>2. Файл <code>manifest.json</code>:</h4>
      <CodeBlock
        language="json"
        code={`{
  "id": "my-easy-plugin",
  "name": "Простой Просмотрщик",
  "version": "1.0.0",
  "description": "Добавляет кнопку просмотра трейлера и блок в деталях",
  "permissions": ["ui-notifications"],
  "slots": [
    {
      "id": "trailer-action-button",
      "slotName": "media-actions",
      "title": "Кнопка Трейлера"
    },
    {
      "id": "extra-details-info",
      "slotName": "details-bottom",
      "title": "Блок Информации"
    }
  ]
}`}
      />

      <h4 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.95rem", margin: "1rem 0 0.5rem 0" }}>3. Файл <code>index.js</code>:</h4>
      <CodeBlock
        language="javascript"
        code={`import { PotokSDK } from 'potok-sdk';

// А. Регистрируем плагин в системе
PotokSDK.registerPlugin({
  id: "my-easy-plugin",
  name: "Простой Просмотрщик"
});

// Б. Внедряем кнопку в слот действий "media-actions"
PotokSDK.registerSlotContribution({
  id: "trailer-action-button",
  slotName: "media-actions",
  render(props) {
    const { Button } = PotokSDK.ui.components;
    return {
      label: "Смотреть Трейлер",
      layout: Button("Смотреть Трейлер")
        .variant("primary")
        .onClick(() => {
          // Запуск встроенного плеера хоста с тестовым видео
          PotokSDK.ui.playVideo({
            title: \`Трейлер к \${props.title}\`,
            streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          });
        })
    };
  }
});

// В. Внедряем информационную карточку в слот под описанием "details-bottom"
PotokSDK.registerSlotContribution({
  id: "extra-details-info",
  slotName: "details-bottom",
  render(props) {
    const { Card, VStack, Text, Badge, HStack } = PotokSDK.ui.components;
    return {
      label: "Дополнительно",
      layout: Card()
        .title("Рекомендовано плагином")
        .subtitle(\`Кинопоиск ID: \${props.mediaId}\`)
        .child(
          VStack()
            .spacing(8)
            .child(Text(\`Вы просматриваете страницу "\${props.title}". Этот блок встроил кастомный плагин.\`).variant("secondary"))
            .child(
              HStack()
                .spacing(6)
                .child(Badge("Качество 1080p").color("success"))
                .child(Badge("Лицензия").color("info"))
            )
        )
    };
  }
});`}
      />

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Пример вызова системного плеера и селекторов
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("Системные оверлеи")
    .child(
      VStack()
        .spacing(12)
        .child(
          Button("Воспроизвести видео")
            .variant("primary")
            .onClick(() => {
              ui.playVideo({
                title: "Трейлер Большого Стэна",
                streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              });
            })
        )
        .child(
          Button("Показать селектор серий")
            .onClick(() => {
              ui.showEpisodeSelector({
                title: "Игра Престолов",
                seasons: [
                  { seasonNumber: 1, name: "Сезон 1" },
                  { seasonNumber: 2, name: "Сезон 2" }
                ],
                episodes: [
                  { episodeNumber: 1, name: "Зима близко", seasonNumber: 1 },
                  { episodeNumber: 2, name: "Королевский тракт", seasonNumber: 1 }
                ],
                onPlay: (ep) => {
                  ui.showHUD("success", "Играем эпизод " + ep.episodeNumber);
                }
              });
            })
        )
    )
);`)}>
        <Play size={12} />
        <span>Протестировать оверлеи в Sandbox</span>
      </button>
    </div>
  )
};
