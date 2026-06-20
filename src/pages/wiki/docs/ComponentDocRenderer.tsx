import { Play } from "lucide-react";
import { CodeBlock } from "../../../components/wiki/CodeBlock";
import metadataRaw from "../docs-metadata.json";

interface MethodMeta {
  argument: string;
  description: string;
  default?: string;
}

interface ComponentMeta {
  title: string;
  description: string;
  example: string;
  methods: Record<string, MethodMeta>;
  extendsLayout?: boolean;
}

const metadata = metadataRaw as Record<string, ComponentMeta>;

export const baseMethodsTable = (
  <table className="doc-table">
    <thead>
      <tr>
        <th>Базовый метод</th>
        <th>Аргумент</th>
        <th>Описание</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>id(v)</code></td>
        <td><code>string</code></td>
        <td>Задает уникальный идентификатор элемента.</td>
      </tr>
      <tr>
        <td><code>padding(v)</code></td>
        <td><code>number | string | object</code></td>
        <td>Внутренние отступы элемента.</td>
      </tr>
      <tr>
        <td><code>margin(v)</code></td>
        <td><code>number | string | object</code></td>
        <td>Внешние отступы элемента.</td>
      </tr>
      <tr>
        <td><code>width(v)</code></td>
        <td><code>string | number</code></td>
        <td>Ширина элемента (например, <code>"100%"</code> или <code>250</code>).</td>
      </tr>
      <tr>
        <td><code>height(v)</code></td>
        <td><code>string | number</code></td>
        <td>Высота элемента (например, <code>"auto"</code> или <code>100</code>).</td>
      </tr>
      <tr>
        <td><code>visible(v)</code></td>
        <td><code>boolean</code></td>
        <td>Управляет видимостью элемента на экране.</td>
      </tr>
      <tr>
        <td><code>disabled(v)</code></td>
        <td><code>boolean</code></td>
        <td>Переводит элемент в неактивное состояние.</td>
      </tr>
      <tr>
        <td><code>flex(v)</code></td>
        <td><code>number</code></td>
        <td>Коэффициент распределения свободного пространства (flex-grow).</td>
      </tr>
    </tbody>
  </table>
);

export const layoutMethodsTable = (
  <table className="doc-table">
    <thead>
      <tr>
        <th>Метод разметки</th>
        <th>Аргумент</th>
        <th>Описание</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>spacing(v)</code></td>
        <td><code>number</code></td>
        <td>Зазор между дочерними элементами в пикселях.</td>
      </tr>
      <tr>
        <td><code>alignItems(v)</code></td>
        <td><code>"start" | "center" | "end" | "stretch"</code></td>
        <td>Выравнивание элементов по поперечной оси.</td>
      </tr>
      <tr>
        <td><code>justifyContent(v)</code></td>
        <td><code>"start" | "center" | "end" | "between" | "around"</code></td>
        <td>Выравнивание элементов по главной оси.</td>
      </tr>
      <tr>
        <td><code>child(v)</code></td>
        <td><code>UIComponent</code></td>
        <td>Добавляет один дочерний элемент в контейнер.</td>
      </tr>
      <tr>
        <td><code>children(arr)</code></td>
        <td><code>UIComponent[]</code></td>
        <td>Заменяет дочерние элементы массивом компонентов.</td>
      </tr>
    </tbody>
  </table>
);

export function createComponentDoc(name: string, category: string) {
  const meta = metadata[name];
  if (!meta) {
    throw new Error(`Metadata not found for component: ${name}`);
  }

  const toc = [
    { id: "desc", text: "Описание" },
  ];

  const hasSpecificMethods = Object.keys(meta.methods || {}).length > 0;
  if (hasSpecificMethods) {
    toc.push({ id: "component-methods", text: `Методы ${name}` });
  }

  if (meta.extendsLayout) {
    toc.push({ id: "layout-methods", text: "Методы разметки" });
  }

  toc.push({ id: "base-methods", text: "Базовые методы" });
  toc.push({ id: "example", text: "Полный пример" });

  return {
    title: name,
    category,
    toc,
    render: (openInSandbox: (code: string) => void) => (
      <div>
        <h1 className="wiki-doc-title" id="desc">{meta.title}</h1>
        <p className="doc-body-text">{meta.description}</p>

        {hasSpecificMethods && (
          <>
            <h2 className="doc-section-h2" id="component-methods">Специфичные методы {name}</h2>
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Метод</th>
                  <th>Аргумент</th>
                  <th>Описание</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(meta.methods).map(([methodName, methodMeta]) => (
                  <tr key={methodName}>
                    <td><code>{methodName}(v)</code></td>
                    <td><code>{methodMeta.argument}</code></td>
                    <td>
                      {methodMeta.description}
                      {methodMeta.default !== undefined && (
                        <>
                          <br />
                          <small style={{ color: "var(--text-muted)" }}>
                            Значение по умолчанию: <code>{methodMeta.default}</code>
                          </small>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {meta.extendsLayout && (
          <>
            <h2 className="doc-section-h2" id="layout-methods">
              Методы разметки (наследуются от LayoutComponent)
            </h2>
            {layoutMethodsTable}
          </>
        )}

        <h2 className="doc-section-h2" id="base-methods">
          Базовые методы (наследуются от UIComponent)
        </h2>
        {baseMethodsTable}

        <h2 className="doc-section-h2" id="example">Пример использования</h2>
        <CodeBlock language="javascript" code={meta.example} />

        <button 
          className="doc-sandbox-btn" 
          onClick={() => openInSandbox(meta.example)}
        >
          <Play size="0.75rem" />
          <span>Запустить в Sandbox</span>
        </button>
      </div>
    )
  };
}
