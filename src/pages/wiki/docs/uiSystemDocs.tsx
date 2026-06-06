import { Play } from "lucide-react";

export const SearchFilterComponentsDoc = {
  title: "Поиск и Фильтры: SearchBar, StreamFilterBar",
  category: "Компоненты",
  toc: [
    { id: "searchbar", text: "SearchBar (Панель поиска)" },
    { id: "filterbar", text: "StreamFilterBar (Панель сортировки)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Поиск и Сортировка</h1>
      <p className="doc-body-text">
        Компоненты для фильтрации и навигации по каталогам раздач.
      </p>

      <h2 className="doc-section-h2" id="searchbar">SearchBarBuilder</h2>
      <p className="doc-body-text">
        Строка ввода поискового запроса со встроенной кнопкой сброса и иконкой лупы.
      </p>

      <h2 className="doc-section-h2" id="filterbar">StreamFilterBarBuilder</h2>
      <p className="doc-body-text">
        Панель управления сортировкой стримов. Позволяет переключать фильтры по качеству, источнику раздачи, и направлению сортировки (по сидам, по размеру).
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
            <td><code>countLabel(v)</code></td>
            <td><code>string</code></td>
            <td>Текст с количеством найденных раздач.</td>
          </tr>
          <tr>
            <td><code>trackers(arr)</code></td>
            <td><code>string[]</code></td>
            <td>Список доступных названий трекеров для фильтрации.</td>
          </tr>
          <tr>
            <td><code>sortOption(v)</code></td>
            <td><code>string</code></td>
            <td>Текущий активный вариант сортировки.</td>
          </tr>
          <tr>
            <td><code>onQualityChange(cb)</code></td>
            <td><code>Function</code></td>
            <td>Коллбек смены фильтра качества.</td>
          </tr>
        </tbody>
      </table>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Строка поиска
const { ui, createState } = PotokSDK;

const state = createState({
  query: ""
});

function draw() {
  ui.render(
    VStack()
      .spacing(12)
      .child(
        SearchBar()
          .value(state.query)
          .placeholder("Поиск по раздачам...")
          .onChange((v) => state.query = v)
          .onClear(() => state.query = "")
      )
      .child(Text("Ищем: " + (state.query || "все раздачи")))
  );
}

state.$subscribe(draw);
draw();`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};

export const PlayerProfileSelectorDoc = {
  title: "Системные: MediaPlayer, ProfileSelector",
  category: "Компоненты",
  toc: [
    { id: "mediaplayer", text: "MediaPlayer (Плеер)" },
    { id: "profile", text: "ProfileSelector (Профили)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Системные компоненты</h1>
      <p className="doc-body-text">
        Компоненты для интеграции встроенных проигрывателей и страниц выбора профилей настроек в кастомные панели плагина.
      </p>

      <h2 className="doc-section-h2" id="mediaplayer">MediaPlayerBuilder</h2>
      <p className="doc-body-text">
        Интегрирует плеер HLS/Dash видеопотоков прямо в интерфейсную страницу плагина.
      </p>

      <h2 className="doc-section-h2" id="profile">ProfileSelectorBuilder</h2>
      <p className="doc-body-text">
        Отображает список сохраненных профилей подключений Potok с пингом шлюза, кнопками создания, изменения и удаления профилей.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Системный профиль-менеджер
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("Подключение")
    .child(
      ProfileSelector()
        .connectionProfiles([
          { id: "p1", gatewayURL: "http://localhost:5000", label: "Локальный шлюз" }
        ])
        .activeProfileID("p1")
        .onSelectProfile((p) => {
          ui.showHUD("success", "Выбран профиль " + p.label);
        })
    )
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};
