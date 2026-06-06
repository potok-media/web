import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";

export const UiMethodsDoc = {
  title: "Глобальные методы UI",
  category: "API",
  toc: [
    { id: "render", text: "ui.render()" },
    { id: "hud", text: "ui.showHUD()" },
    { id: "player", text: "ui.playVideo()" },
    { id: "ep-selector", text: "ui.showEpisodeSelector()" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="render">Глобальный объект ui</h1>
      <p className="doc-body-text">
        Помимо сборщиков разметки, <code>PotokSDK.ui</code> предоставляет набор методов для вызова системных оверлеев, воспроизведения видео и вывода всплывающих уведомлений.
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
  headers: { "User-Agent": "PotokPlayer" },
  position: 3600
});`} 
      />

      <h2 className="doc-section-h2" id="ep-selector">Селектор Серий</h2>
      <p className="doc-body-text">
        Метод <code>ui.showEpisodeSelector(config)</code> вызывает системное всплывающее окно для выбора сезонов и серий, разработанное специально для сериалов.
      </p>

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
