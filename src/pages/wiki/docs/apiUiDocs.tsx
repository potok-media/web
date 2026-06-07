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
      <ul className="doc-bullet-list">
        <li><code>registerPlugin(meta)</code> — регистрирует базовые метаданные плагина.</li>
        <li><code>registerSource(config)</code> — регистрирует плагин как поисковый провайдер (источник медиа). Хост будет вызывать функцию <code>lookup</code> плагина при поиске раздач.</li>
        <li><code>registerSlotContribution(config)</code> — привязывает рендер-функцию плагина к определенному интерфейсному слоту (например, <code>media-actions</code>).</li>
      </ul>

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
