import { Play } from "lucide-react";

export const LayoutComponentsDoc = {
  title: "Контейнеры: VStack, HStack, Grid",
  category: "Компоненты",
  toc: [
    { id: "vstack", text: "VStack (Вертикальный стек)" },
    { id: "hstack", text: "HStack (Горизонтальный стек)" },
    { id: "grid", text: "Grid (Сетка ячеек)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Компоненты компоновки</h1>
      <p className="doc-body-text">
        Компоненты компоновки служат контейнерами для других UI-компонентов. Они определяют правила выравнивания и расстояния между дочерними узлами.
      </p>

      <h2 className="doc-section-h2" id="vstack">VStackBuilder</h2>
      <p className="doc-body-text">
        Размещает элементы друг под другом.
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
            <td><code>spacing(v)</code></td>
            <td><code>number</code></td>
            <td>Устанавливает зазор между дочерними элементами в пикселях.</td>
          </tr>
          <tr>
            <td><code>alignItems(v)</code></td>
            <td><code>"start" | "center" | "end" | "stretch"</code></td>
            <td>Положение элементов по поперечной горизонтальной оси.</td>
          </tr>
          <tr>
            <td><code>justifyContent(v)</code></td>
            <td><code>"start" | "center" | "end" | "between" | "around"</code></td>
            <td>Распределение элементов по вертикальной оси.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="hstack">HStackBuilder</h2>
      <p className="doc-body-text">
        Размещает элементы в одну строку слева направо. Поддерживает те же методы выравнивания и зазоров, что и <code>VStack</code>.
      </p>

      <h2 className="doc-section-h2" id="grid">GridBuilder</h2>
      <p className="doc-body-text">
        Отрисовывает адаптивную сетку с фиксированной минимальной шириной колонки. Подходит для вывода списков карточек.
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
            <td><code>minWidth(v)</code></td>
            <td><code>string</code> (например <code>"11.25rem"</code>)</td>
            <td>Минимально допустимая ширина одной колонки.</td>
          </tr>
          <tr>
            <td><code>gap(v)</code></td>
            <td><code>string</code> (например <code>"0.75rem"</code>)</td>
            <td>Зазор между ячейками.</td>
          </tr>
        </tbody>
      </table>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Пример компоновки контейнеров
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(16)
    .alignItems("stretch")
    .child(Heading("Панель разметки").level(2))
    .child(
      HStack()
        .spacing(10)
        .justifyContent("between")
        .child(Text("Первый").bold(true))
        .child(Text("Второй").variant("success"))
        .child(Text("Третий").variant("secondary"))
    )
    .child(
      Grid()
        .minWidth("7.5rem")
        .gap("0.625rem")
        .child(Card().title("Блок 1").child(Text("Содержимое")))
        .child(Card().title("Блок 2").child(Text("Содержимое")))
        .child(Card().title("Блок 3").child(Text("Содержимое")))
    )
);`)}>
        <Play size={12} />
        <span>Запустить Layout-тест в Sandbox</span>
      </button>
    </div>
  )
};

export const CardComponentsDoc = {
  title: "Элементы структуры: Card, Divider, Spacer",
  category: "Компоненты",
  toc: [
    { id: "card", text: "Card (Карточка)" },
    { id: "divider", text: "Divider (Разделитель)" },
    { id: "spacer", text: "Spacer (Распорка)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Элементы структуры</h1>
      <p className="doc-body-text">
        Служат для группировки информации и визуального разделения интерфейса на логические блоки.
      </p>

      <h2 className="doc-section-h2" id="card">CardBuilder</h2>
      <p className="doc-body-text">
        Стеклянная карточка-панель с границами, скруглением углов и эффектом размытия заднего фона.
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
            <td><code>title(v)</code></td>
            <td><code>string</code></td>
            <td>Заголовок карточки.</td>
          </tr>
          <tr>
            <td><code>subtitle(v)</code></td>
            <td><code>string</code></td>
            <td>Подзаголовок карточки.</td>
          </tr>
          <tr>
            <td><code>child(v)</code></td>
            <td><code>UIComponent</code></td>
            <td>Вкладывает компонент внутрь карточки.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="divider">DividerBuilder</h2>
      <p className="doc-body-text">
        Отображает тонкую горизонтальную линию (аналог тега <code>&lt;hr&gt;</code>) для разделения списков или контента.
      </p>

      <h2 className="doc-section-h2" id="spacer">SpacerBuilder</h2>
      <p className="doc-body-text">
        Пружина-распорка, занимающая все доступное свободное пространство. Применяется внутри <code>HStack</code> или <code>VStack</code> для прижатия элементов к краям экрана.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Сборка карточки с разделителями
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(12)
    .child(
      Card()
        .title("Опции системы")
        .subtitle("Панель настройки параметров")
        .child(
          VStack()
            .spacing(8)
            .child(Text("Включить аппаратное ускорение"))
            .child(Divider())
            .child(Text("Сохранять историю поиска"))
        )
    )
    .child(
      HStack()
        .child(Text("Подпись слева"))
        .child(Spacer())
        .child(Text("Подпись справа"))
    )
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};
