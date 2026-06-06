import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";

export const HttpDoc = {
  title: "Сетевой клиент http",
  category: "API",
  toc: [
    { id: "get", text: "http.get()" },
    { id: "post", text: "http.post()" },
    { id: "cors", text: "Обход CORS ограничений" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="get">Сетевые запросы</h1>
      <p className="doc-body-text">
        Поскольку плагин выполняется в изолированном iframe, прямые запросы через <code>fetch</code> к внешним API заблокированы политиками безопасности и CORS.
        SDK предоставляет прокси-обертку <code>PotokSDK.http</code>, которая пересылает запросы через хост.
      </p>

      <h2 className="doc-section-h2" id="get">HTTP GET</h2>
      <CodeBlock language="javascript" code={`http.get(url: string, headers?: Record<string, string>): Promise<{ status: number, data: any }>`} />

      <h2 className="doc-section-h2" id="post">HTTP POST</h2>
      <CodeBlock language="javascript" code={`http.post(url: string, body?: any, headers?: Record<string, string>): Promise<{ status: number, data: any }>`} />

      <h2 className="doc-section-h2" id="cors">Преимущества проксирования</h2>
      <ul className="doc-bullet-list">
        <li><strong>Обход CORS:</strong> Запросы выполняются бэкендом Potok (или расширением браузера), что снимает любые блокировки CORS со стороны серверов-источников.</li>
        <li><strong>Автоматический парсинг JSON:</strong> Если сервер возвращает JSON, клиент вернет уже распарсенный объект в поле <code>data</code>.</li>
      </ul>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Пример загрузки данных по сети
const { ui, http, createState } = PotokSDK;

const state = createState({
  loading: true,
  todoTitle: "",
  error: null
});

async function loadData() {
  try {
    const res = await http.get("https://jsonplaceholder.typicode.com/todos/1");
    state.todoTitle = res.data.title;
    state.loading = false;
  } catch (err) {
    state.error = err.message;
    state.loading = false;
  }
}

function render() {
  ui.render(
    Card()
      .title("Загрузка по сети")
      .child(
        VStack()
          .spacing(12)
          .child(
            state.loading 
              ? LoadingSpinner().message("Загружаем TODO с сервера...")
              : Text(state.error ? "Ошибка: " + state.error : "Задача с сервера: " + state.todoTitle)
          )
          .child(
            Button("Загрузить заново")
              .onClick(() => {
                state.loading = true;
                loadData();
              })
          )
      )
  );
}

state.$subscribe(render);
render();
loadData();`)}>
        <Play size={12} />
        <span>Загрузить Todo по сети in Sandbox</span>
      </button>
    </div>
  )
};

export const StorageDoc = {
  title: "Изолированное хранилище",
  category: "API",
  toc: [
    { id: "storage-methods", text: "Методы работы с БД" },
    { id: "isolation", text: "Концепция изолированных пространств" }
  ],
  render: (openInSandbox: (code: string) => void) => (
    <div>
      <h1 className="wiki-doc-title" id="storage-methods">Локальное хранилище</h1>
      <p className="doc-body-text">
        Для сохранения настроек плагина, токенов авторизации или кэша используется асинхронное локальное хранилище <code>PotokSDK.storage.local</code>.
      </p>

      <h2 className="doc-section-h2">Доступные методы</h2>
      <table className="doc-table">
        <thead>
          <tr>
            <th>Метод</th>
            <th>Сигнатура</th>
            <th>Описание</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>getItem</code></td>
            <td><code>getItem(key: string): Promise&lt;string | null&gt;</code></td>
            <td>Асинхронно считывает значение ключа.</td>
          </tr>
          <tr>
            <td><code>setItem</code></td>
            <td><code>setItem(key: string, value: any): Promise&lt;void&gt;</code></td>
            <td>Сохраняет переданное значение под указанным ключом.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="doc-section-h2" id="isolation">Концепция изолированных пространств</h2>
      <p className="doc-body-text">
        В целях безопасности хост привязывает префикс <code>pluginId</code> к каждому сохраненному значению. Плагин <code>A</code> не имеет физического доступа к ключам плагина <code>B</code>. Прямой доступ к <code>window.localStorage</code> полностью блокируется.
      </p>

      <button className="doc-sandbox-btn" onClick={() => openInSandbox(`// Пример сохранения и загрузки настроек
const { ui, storage, createState } = PotokSDK;

const state = createState({
  savedValue: "Ничего не сохранено",
  inputValue: ""
});

async function initStorage() {
  const saved = await storage.local.getItem("user_custom_note");
  if (saved) {
    state.savedValue = saved;
  }
}

function render() {
  ui.render(
    Card()
      .title("Локальное хранилище")
      .child(
        VStack()
          .spacing(12)
          .child(Text("Сохранено в БД: " + state.savedValue).bold(true))
          .child(
            Input("note-input")
              .label("Новая запись")
              .value(state.inputValue)
              .onChange((val) => state.inputValue = val)
          )
          .child(
            Button("Сохранить в БД")
              .variant("primary")
              .onClick(async () => {
                await storage.local.setItem("user_custom_note", state.inputValue);
                state.savedValue = state.inputValue;
                ui.showHUD("success", "Значение успешно записано!");
              })
          )
      )
  );
}

state.$subscribe(render);
render();
initStorage();`)}>
        <Play size={12} />
        <span>Запустить пример работы с БД в Sandbox</span>
      </button>
    </div>
  )
};
