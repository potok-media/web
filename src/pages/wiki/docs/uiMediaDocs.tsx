import { Play } from "lucide-react";

export const MediaCardsComponentsDoc = {
  title: "Медиа-сетки: MediaCard, MediaRow",
  category: "Компоненты",
  toc: [
    { id: "mediacard", text: "MediaCard (Карточка фильма)" },
    { id: "mediarow", text: "MediaRow (Горизонтальный ряд)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Компоненты витрины</h1>
      <p className="doc-body-text">
        Специализированные компоненты для отображения постеров, карточек фильмов/сериалов и их горизонтальной прокрутки.
      </p>

      <h2 className="doc-section-h2" id="mediacard">MediaCardBuilder</h2>
      <p className="doc-body-text">
        Отрисовывает постер фильма с наложением названия, года выпуска и рейтинга Кинопоиска/IMDb при наведении.
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
            <td><code>item(v)</code></td>
            <td><code>any</code></td>
            <td>Объект медиа (должен содержать <code>title</code>, <code>posterUrl</code>, <code>rating</code>).</td>
          </tr>
          <tr>
            <td><code>onClick(cb)</code></td>
            <td><code>Function</code></td>
            <td>Коллбек при клике по карточке.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="mediarow">MediaRowBuilder</h2>
      <p className="doc-body-text">
        Горизонтальная карусель карточек <code>MediaCard</code> с заголовком и кнопкой «Показать все».
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Отрисовка списка фильмов
const { ui } = PotokSDK;

const film = {
  title: "Интерстеллар",
  posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
  year: 2014,
  rating: 8.6
};

ui.render(
  MediaRow()
    .title("Рекомендованные фильмы")
    .items([film, film, film])
    .onCardClick((item) => {
      ui.showHUD("info", "Выбран фильм: " + item.title);
    })
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};

export const HeroLoadingComponentsDoc = {
  title: "Промо-панели: HeroSpotlight, LoadingSpinner",
  category: "Компоненты",
  toc: [
    { id: "hero", text: "HeroSpotlight (Баннер)" },
    { id: "spinner", text: "LoadingSpinner (Индикатор загрузки)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Баннеры и загрузчики</h1>
      <p className="doc-body-text">
        Компоненты для привлечения внимания пользователей и отображения состояния загрузки данных.
      </p>

      <h2 className="doc-section-h2" id="hero">HeroSpotlightBuilder</h2>
      <p className="doc-body-text">
        Огромный промо-баннер с фоновым артом фильма, описанием и большими кнопками «Смотреть» и «Подробнее». Предназначен для размещения на главной странице.
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
            <td><code>items(v)</code></td>
            <td><code>any[]</code></td>
            <td>Массив медиафайлов для карусели промо-баннера.</td>
          </tr>
          <tr>
            <td><code>onPlay(cb)</code></td>
            <td><code>(item) =&gt; void</code></td>
            <td>Коллбек кнопки запуска воспроизведения.</td>
          </tr>
          <tr>
            <td><code>onDetails(cb)</code></td>
            <td><code>(item) =&gt; void</code></td>
            <td>Коллбек кнопки открытия описания.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="spinner">LoadingSpinnerBuilder</h2>
      <p className="doc-body-text">
        Отображает анимированный круговой индикатор ожидания. Метод <code>fullscreen(true)</code> блокирует весь экран полупрозрачной подложкой.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Демонстрация баннера и загрузки
const { ui } = PotokSDK;

const bannerItem = {
  title: "Бегущий по лезвию 2049",
  overview: "В новый век репликанты выполняют самую грязную работу...",
  backdropUrl: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg"
};

ui.render(
  VStack()
    .spacing(20)
    .child(
      HeroSpotlight()
        .items([bannerItem])
        .onPlay((item) => ui.showHUD("success", "Смотрим " + item.title))
    )
);`)}>
        <Play size={12} />
        <span>Запустить баннер в Sandbox</span>
      </button>
    </div>
  )
};

export const EpisodeComponentsDoc = {
  title: "Сериалы: EpisodesSection, EpisodeCard",
  category: "Компоненты",
  toc: [
    { id: "ep-section", text: "EpisodesSection (Каталог серий)" },
    { id: "ep-card", text: "EpisodeCard (Карточка серии)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Каталог серий</h1>
      <p className="doc-body-text">
        Набор специализированных визуальных компонентов для организации интерфейса просмотра телесериалов и аниме.
      </p>

      <h2 className="doc-section-h2" id="ep-section">EpisodesSectionBuilder</h2>
      <p className="doc-body-text">
        Автономный блок, запрашивающий список серий, разделяющий их по сезонам и выводящий в виде сетки с изображениями превью.
      </p>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Метод</th>
            <th>Тип</th>
            <th>Описание</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>mediaId(v)</code></td>
            <td><code>number | string</code></td>
            <td>ID сериала в базе данных шлюза.</td>
          </tr>
          <tr>
            <td><code>numberOfSeasons(v)</code></td>
            <td><code>number</code></td>
            <td>Общее число сезонов сериала.</td>
          </tr>
          <tr>
            <td><code>onEpisodeClick(cb)</code></td>
            <td><code>Function</code></td>
            <td>Коллбек при выборе эпизода пользователем.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="ep-card">EpisodeCardBuilder</h2>
      <p className="doc-body-text">
        Отдельная карточка эпизода. Отображает скриншот кадра, номер, название серии и краткое текстовое описание.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Карточки эпизодов
const { ui } = PotokSDK;

const epData = {
  episodeNumber: 1,
  seasonNumber: 1,
  name: "Зима Близко",
  overview: "Лорд Эддард Старк принимает короля Роберта в своем замке Винтерфелл...",
  stillPath: "https://image.tmdb.org/t/p/w500/j5M3P1xMWh1Sohc29N3L9B6c4W0.jpg"
};

ui.render(
  VStack()
    .spacing(15)
    .child(Heading("Список серий сезона").level(2))
    .child(
      EpisodeCard()
        .episode(epData)
        .onClick((ep) => {
          ui.showHUD("info", "Запуск серии " + ep.episodeNumber);
        })
    )
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};
