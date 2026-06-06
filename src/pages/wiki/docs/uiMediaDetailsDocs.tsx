import { Play } from "lucide-react";

export const CastOverviewComponentsDoc = {
  title: "Карточка медиа: MediaCast, MediaOverview",
  category: "Компоненты",
  toc: [
    { id: "cast", text: "MediaCast (Актерский состав)" },
    { id: "overview-comp", text: "MediaOverview (Обзор фильма)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Детализация медиа</h1>
      <p className="doc-body-text">
        Отображают структурированную информацию о создателях фильма, жанрах, рейтинге и текстовое описание.
      </p>

      <h2 className="doc-section-h2" id="cast">MediaCastBuilder</h2>
      <p className="doc-body-text">
        Отображает список актеров в виде прокручиваемого ряда с фотографиями, оригинальными именами и ролями.
      </p>

      <h2 className="doc-section-h2" id="overview-comp">MediaOverviewBuilder</h2>
      <p className="doc-body-text">
        Большая панель описания фильма. Включает постер, название, жанры, год, страну, рейтинг и синопсис.
      </p>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Метод</th>
            <th>Аргумент</th>
            <th>Описание</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>media(v)</code></td>
            <td><code>any</code></td>
            <td>Объект с подробным описанием медиафайла.</td>
          </tr>
          <tr>
            <td><code>selectedEpisode(v)</code></td>
            <td><code>any</code></td>
            <td>Текущий выбранный эпизод (если просматривается сериал).</td>
          </tr>
          <tr>
            <td><code>onResetEpisode(cb)</code></td>
            <td><code>Function</code></td>
            <td>Коллбек сброса выбранной серии обратно к описанию сезона.</td>
          </tr>
        </tbody>
      </table>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Актерский состав
const { ui } = PotokSDK;

const actor = {
  name: "Мэттью Макконахи",
  character: "Купер",
  profilePath: "https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg"
};

ui.render(
  VStack()
    .spacing(16)
    .child(Heading("В главных ролях").level(2))
    .child(
      MediaCast().cast([actor, actor, actor])
    )
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};

export const StreamRowListComponentsDoc = {
  title: "Потоки: StreamRow, StreamList, StreamSkeletonList",
  category: "Компоненты",
  toc: [
    { id: "stream-row", text: "StreamRow (Строка раздачи)" },
    { id: "stream-list", text: "StreamList (Каталог потоков)" },
    { id: "stream-skel", text: "StreamSkeletonList (Плейсхолдер)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Потоки и раздачи</h1>
      <p className="doc-body-text">
        Ключевые компоненты для вывода найденных торрент-раздач и стриминговых ссылок.
      </p>

      <h2 className="doc-section-h2" id="stream-row">StreamRowBuilder</h2>
      <p className="doc-body-text">
        Строка стрима. Отображает размер файла, количество сидов и пиров, качество видео, аудио-дорожки и название раздачи.
      </p>

      <h2 className="doc-section-h2" id="stream-list">StreamListBuilder</h2>
      <p className="doc-body-text">
        Интегрирует полноценный список раздач с возможностью быстрой фильтрации по качеству и весу.
      </p>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Метод</th>
            <th>Аргумент</th>
            <th>Описание</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>streams(arr)</code></td>
            <td><code>any[]</code></td>
            <td>Массив объектов стримов/раздач.</td>
          </tr>
          <tr>
            <td><code>loading(v)</code></td>
            <td><code>boolean</code></td>
            <td>Включает состояние загрузки.</td>
          </tr>
          <tr>
            <td><code>showFilters(v)</code></td>
            <td><code>boolean</code></td>
            <td>Отображает панель фильтров в верхней части списка.</td>
          </tr>
          <tr>
            <td><code>onSelectStream(cb)</code></td>
            <td><code>(stream) =&gt; void</code></td>
            <td>Вызывается при клике по строке стрима.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="stream-skel">StreamSkeletonListBuilder</h2>
      <p className="doc-body-text">
        Отображает мерцающие плейсхолдеры строк стримов во время выполнения асинхронного поиска по торрент-трекерам.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Вывод списка раздач
const { ui } = PotokSDK;

const mockStream = {
  title: "Интерстеллар / Interstellar (2014) BDRip 1080p | Line",
  size: "14.5 GB",
  seeds: 234,
  peers: 12,
  quality: "1080p",
  tracker: "Rutracker"
};

ui.render(
  StreamList()
    .streams([mockStream, mockStream])
    .showFilters(true)
    .onSelectStream((stream) => {
      ui.showHUD("success", "Запуск воспроизведения с трекера: " + stream.tracker);
    })
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};
