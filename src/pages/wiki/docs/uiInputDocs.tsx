import { Play } from "lucide-react";

export const InputComponentsDoc = {
  title: "Ввод данных: Button, Input, Toggle",
  category: "Компоненты",
  toc: [
    { id: "button", text: "Button (Кнопка)" },
    { id: "input", text: "Input (Поле ввода)" },
    { id: "toggle", text: "Toggle (Переключатель)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Интерактивный ввод</h1>
      <p className="doc-body-text">
        Базовые элементы для обработки пользовательских нажатий, ввода текстов и переключения опций.
      </p>

      <h2 className="doc-section-h2" id="button">ButtonBuilder</h2>
      <p className="doc-body-text">
        Кнопка действия. Поддерживает несколько визуальных вариантов.
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
            <td><code>variant(v)</code></td>
            <td><code>"primary" | "secondary" | "danger" | "ghost" | "sidebar-item"</code></td>
            <td>Цветовая схема оформления кнопки.</td>
          </tr>
          <tr>
            <td><code>icon(v)</code></td>
            <td><code>string</code></td>
            <td>Иконка из каталога Lucide.</td>
          </tr>
          <tr>
            <td><code>onClick(cb)</code></td>
            <td><code>Function</code></td>
            <td>Коллбек-функция при клике по кнопке.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="input">InputBuilder</h2>
      <p className="doc-body-text">
        Однострочное поле ввода текста с поддержкой различных типов (text, password, number).
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
            <td><code>label(v)</code></td>
            <td><code>string</code></td>
            <td>Текст ярлыка над полем ввода.</td>
          </tr>
          <tr>
            <td><code>placeholder(v)</code></td>
            <td><code>string</code></td>
            <td>Подсказка внутри поля.</td>
          </tr>
          <tr>
            <td><code>value(v)</code></td>
            <td><code>string</code></td>
            <td>Значение поля.</td>
          </tr>
          <tr>
            <td><code>onChange(cb)</code></td>
            <td><code>(v: string) =&gt; void</code></td>
            <td>Коллбек при изменении текста пользователем.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="toggle">ToggleBuilder</h2>
      <p className="doc-body-text">
        Двухпозиционный переключатель (чекбокс). Использует метод <code>onChange(cb: (checked: boolean) =&gt; void)</code> для отслеживания булевого состояния.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Обработка ввода формы
const { ui, createState } = PotokSDK;

const state = createState({
  username: "",
  agree: false
});

function draw() {
  ui.render(
    Card()
      .title("Вход в систему")
      .child(
        VStack()
          .spacing(12)
          .child(
            Input("username")
              .label("Имя")
              .placeholder("Введите логин...")
              .value(state.username)
              .onChange((v) => state.username = v)
          )
          .child(
            Toggle("agreement")
              .label("Принять соглашение")
              .value(state.agree)
              .onChange((v) => state.agree = v)
          )
          .child(
            Button("Зарегистрироваться")
              .variant("primary")
              .disabled(!state.agree || !state.username)
              .onClick(() => {
                ui.showHUD("success", "Зарегистрирован: " + state.username);
              })
          )
      )
  );
}

state.$subscribe(draw);
draw();`)}>
        <Play size={12} />
        <span>Запустить форму в Sandbox</span>
      </button>
    </div>
  )
};

export const SelectEditorComponentsDoc = {
  title: "Сложный ввод: Select, CodeEditor",
  category: "Компоненты",
  toc: [
    { id: "select", text: "Select (Выпадающий список)" },
    { id: "codeeditor", text: "CodeEditor (Редактор кода)" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title">Сложные элементы ввода</h1>
      <p className="doc-body-text">
        Компоненты для выбора параметров из выпадающего списка и полнофункционального редактирования текстового кода.
      </p>

      <h2 className="doc-section-h2" id="select">SelectBuilder</h2>
      <p className="doc-body-text">
        Выпадающее меню (Dropdown) для выбора одной опции из списка.
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
            <td><code>options(arr)</code></td>
            <td><code>{"{ label: string, value: string }[]"}</code></td>
            <td>Массив доступных элементов списка.</td>
          </tr>
          <tr>
            <td><code>value(v)</code></td>
            <td><code>string</code></td>
            <td>Устанавливает текущее выбранное значение.</td>
          </tr>
          <tr>
            <td><code>onChange(cb)</code></td>
            <td><code>(val: string) =&gt; void</code></td>
            <td>Вызывается при смене опции.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="codeeditor">CodeEditorBuilder</h2>
      <p className="doc-body-text">
        Интегрирует редактор Monaco в пользовательский плагин. Поддерживает подсветку синтаксиса JavaScript и автодополнение.
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
            <td><code>value(v)</code></td>
            <td><code>string</code></td>
            <td>Текст исходного кода.</td>
          </tr>
          <tr>
            <td><code>readOnly(v)</code></td>
            <td><code>boolean</code></td>
            <td>Блокирует редактирование текста.</td>
          </tr>
          <tr>
            <td><code>onChange(cb)</code></td>
            <td><code>(code: string) =&gt; void</code></td>
            <td>Вызывается при изменении содержимого.</td>
          </tr>
        </tbody>
      </table>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`const { ui, createState } = PotokSDK;
const state = createState({ lang: "js", code: "console.log('Test');" });
function draw() {
  ui.render(Card().title("Настройки компилятора").child(
    VStack().spacing(12)
      .child(Select("lang").label("Синтаксис").options([{ label: "JavaScript", value: "js" }, { label: "Python", value: "py" }]).value(state.lang).onChange((v) => state.lang = v))
      .child(CodeEditor("compiler_src").label("Исходный код").value(state.code).onChange((v) => state.code = v))
  ));
}
state.$subscribe(draw); draw();`)}>
        <Play size={12} />
        <span>Запустить в Sandbox</span>
      </button>
    </div>
  )
};
