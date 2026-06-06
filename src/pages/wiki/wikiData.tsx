import React from "react";
import { IntroDoc, InstallDoc } from "./docs/introDocs";
import { ManifestDoc, StateDoc } from "./docs/apiCoreDocs";
import { HttpDoc, StorageDoc } from "./docs/apiClientDocs";
import { UiMethodsDoc } from "./docs/apiUiDocs";
import { LayoutComponentsDoc, CardComponentsDoc } from "./docs/uiBaseDocs";
import { TextComponentsDoc, StatusComponentsDoc } from "./docs/uiTextDocs";
import { InputComponentsDoc, SelectEditorComponentsDoc } from "./docs/uiInputDocs";
import { MediaCardsComponentsDoc, HeroLoadingComponentsDoc, EpisodeComponentsDoc } from "./docs/uiMediaDocs";
import { CastOverviewComponentsDoc, StreamRowListComponentsDoc } from "./docs/uiMediaDetailsDocs";
import { SearchFilterComponentsDoc, PlayerProfileSelectorDoc } from "./docs/uiSystemDocs";

export const INITIAL_SANDBOX_CODE = `// Potok Plugin SDK Sandbox
// Создайте свой интерактивный плагин прямо здесь!

const { ui, createState } = PotokSDK;

// 1. Создаем реактивное состояние
const state = createState({
  counter: 0,
  textValue: "Привет, Potok!",
  isEnabled: true
});

// 2. Описываем функцию рендеринга
function render() {
  ui.render(
    VStack()
      .spacing(20)
      .alignItems("center")
      .child(
        Heading("ИНТЕРАКТИВНЫЙ ПЛАГИН").level(2)
      )
      .child(
        Text("Счетчик нажатий: " + state.counter)
          .size("lg")
          .bold(true)
          .variant(state.counter > 5 ? "success" : "primary")
      )
      .child(
        Text(state.textValue)
          .variant("secondary")
      )
      .child(
        HStack()
          .spacing(12)
          .child(
            Button("Увеличить счетчик")
              .variant("primary")
              .icon("play")
              .onClick(() => {
                state.counter++;
                if (state.counter === 5) {
                  ui.showHUD("success", "Вы нажали кнопку 5 раз!");
                }
              })
          )
          .child(
            Button("Сбросить")
              .variant("ghost")
              .onClick(() => {
                state.counter = 0;
              })
          )
      )
      .child(
        Input("text-input")
          .label("Изменить текст выше")
          .placeholder("Введите текст...")
          .value(state.textValue)
          .onChange((val) => {
            state.textValue = val;
          })
      )
      .child(
        Toggle("toggle-switch")
          .label("Включить дополнительную информацию")
          .value(state.isEnabled)
          .onChange((checked) => {
            state.isEnabled = checked;
          })
      )
      .child(
        state.isEnabled 
          ? Markdown("### Справка по Sandbox\\n* Данные реактивно обновляются при изменении стейта\\n* Доступ к localStorage браузера заблокирован песочницей\\n* API-вызовы выполняются через http.get и http.post\\n* Логи событий выводятся в панель внизу страницы")
          : Spacer()
      )
  );
}

// 3. Подписываемся на изменения состояния
state.$subscribe(render);

// 4. Запускаем первый рендер
render();
`;

export const PAGES: Record<string, {
  title: string;
  category: string;
  toc: { id: string; text: string }[];
  render: (openInSandbox: (code: string) => void) => React.ReactNode;
}> = {
  intro: IntroDoc,
  install: InstallDoc,
  manifest: ManifestDoc,
  state: StateDoc,
  http: HttpDoc,
  storage: StorageDoc,
  "ui-methods": UiMethodsDoc,
  "layout-components": LayoutComponentsDoc,
  "card-components": CardComponentsDoc,
  "text-components": TextComponentsDoc,
  "status-components": StatusComponentsDoc,
  "input-components": InputComponentsDoc,
  "select-editor-components": SelectEditorComponentsDoc,
  "media-cards-components": MediaCardsComponentsDoc,
  "hero-loading-components": HeroLoadingComponentsDoc,
  "episode-components": EpisodeComponentsDoc,
  "cast-overview-components": CastOverviewComponentsDoc,
  "stream-row-list-components": StreamRowListComponentsDoc,
  "search-filter-components": SearchFilterComponentsDoc,
  "player-profile-selector": PlayerProfileSelectorDoc,
  sandbox: {
    title: "Интерактивная песочница",
    category: "Песочница",
    toc: [],
    render: () => null
  }
};
