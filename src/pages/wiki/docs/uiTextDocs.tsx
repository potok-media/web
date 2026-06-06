import { Play } from "lucide-react";

export const TextComponentsDoc = {
  title: "Типографика: Heading, Text, Badge",
  category: "Компоненты",
  toc: [
    { id: "heading", text: "Heading (Заголовок)" },
    { id: "text", text: "Text (Обычный текст)" },
    { id: "badge", text: "Badge (Бейдж)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Типографика</h1>
      <p className="doc-body-text">
        Инструменты для форматирования текстовой информации, вывода заголовков и статусных меток.
      </p>

      <h2 className="doc-section-h2" id="heading">HeadingBuilder</h2>
      <p className="doc-body-text">
        Вывод крупного жирного текста заголовка. Метод <code>level(v: number)</code> задает уровень заголовка от 1 до 4 (соответственно тегам h1-h4).
      </p>

      <h2 className="doc-section-h2" id="text">TextBuilder</h2>
      <p className="doc-body-text">
        Базовый текстовый элемент с поддержкой тем.
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
            <td><code>variant(v)</code></td>
            <td><code>"primary" | "secondary" | "success" | "warning" | "error"</code></td>
            <td>Определяет цвет текста в соответствии с темой.</td>
          </tr>
          <tr>
            <td><code>size(v)</code></td>
            <td><code>"sm" | "md" | "lg" | "xl"</code></td>
            <td>Размер шрифта.</td>
          </tr>
          <tr>
            <td><code>bold(v)</code></td>
            <td><code>boolean</code></td>
            <td>Управляет жирностью текста.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="badge">BadgeBuilder</h2>
      <p className="doc-body-text">
        Компактный закругленный бейдж с цветным фоном. Использует метод <code>color(v: string)</code> для установки заливки (<code>"info"</code>, <code>"success"</code>, <code>"warning"</code>, <code>"error"</code>).
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Пример оформления текстов
const { ui } = PotokSDK;

ui.render(
  Card()
    .title("Примеры типографики")
    .child(
      VStack()
        .spacing(10)
        .child(Heading("Главный заголовок H1").level(1))
        .child(Heading("Подраздел H2").level(2))
        .child(Text("Обычный базовый текст плагина").variant("primary"))
        .child(Text("Вторичное описание серого цвета").variant("secondary").size("sm"))
        .child(Text("Ошибка валидации данных").variant("error").bold(true))
        .child(
          HStack()
            .spacing(6)
            .child(Badge("FullHD").color("info"))
            .child(Badge("Новое").color("success"))
            .child(Badge("Топ").color("warning"))
        )
    )
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};

export const StatusComponentsDoc = {
  title: "Информационные: StatusRow, Markdown",
  category: "Компоненты",
  toc: [
    { id: "statusrow", text: "StatusRow (Строка статуса)" },
    { id: "markdown", text: "Markdown (Рендеринг разметки)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Информационные компоненты</h1>
      <p className="doc-body-text">
        Используются для отображения технических параметров и рендеринга текста, отформатированного с помощью Markdown.
      </p>

      <h2 className="doc-section-h2" id="statusrow">StatusRowBuilder</h2>
      <p className="doc-body-text">
        Компонент, выводящий строку с цветной точкой статуса (онлайн/оффлайн) и текстовым значением. Отлично подходит для вывода логов или пинга серверов.
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
            <td><code>status(v)</code></td>
            <td><code>"success" | "warning" | "offline"</code></td>
            <td>Определяет цвет статусной точки (зеленый/желтый/серый).</td>
          </tr>
          <tr>
            <td><code>value(v)</code></td>
            <td><code>string</code></td>
            <td>Текст значения в правой части строки (например, <code>"45 ms"</code>).</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="markdown">MarkdownBuilder</h2>
      <p className="doc-body-text">
        Компонент для вывода форматированного текста. Безопасно преобразует синтаксис Markdown в валидное HTML дерево, блокируя теги <code>&lt;script&gt;</code> и скриптовые ссылки.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Строка статуса и форматирование
const { ui } = PotokSDK;

ui.render(
  VStack()
    .spacing(16)
    .child(
      Card()
        .title("Мониторинг сети")
        .child(
          VStack()
            .spacing(6)
            .child(StatusRow("Шлюз BFF").status("success").value("24 ms"))
            .child(StatusRow("Локальный прокси").status("warning").value("140 ms"))
            .child(StatusRow("Резервный сервер").status("offline"))
        )
    )
    .child(
      Markdown("# Markdown заголовок\\n\\n* Пункт списка 1\\n* Пункт списка 2\\n\\n[Ссылка на яндекс](https://yandex.ru)")
    )
);`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};
