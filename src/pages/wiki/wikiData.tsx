import React from "react";
import { IntroDoc, InstallDoc } from "./docs/introDocs";
import { ManifestDoc, StateDoc } from "./docs/apiCoreDocs";
import { HttpDoc, StorageDoc } from "./docs/apiClientDocs";
import { UiMethodsDoc } from "./docs/apiUiDocs";

import { createComponentDoc } from "./docs/ComponentDocRenderer";

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
  // Введение
  intro: IntroDoc,
  install: InstallDoc,
  
  // API методы
  manifest: ManifestDoc,
  state: StateDoc,
  http: HttpDoc,
  storage: StorageDoc,
  "ui-methods": UiMethodsDoc,
  
  // UI: Контейнеры (Разметка и Сетки)
  "vstack-doc": createComponentDoc("VStack", "UI: Контейнеры"),
  "hstack-doc": createComponentDoc("HStack", "UI: Контейнеры"),
  "grid-doc": createComponentDoc("Grid", "UI: Контейнеры"),
  "card-doc": createComponentDoc("Card", "UI: Контейнеры"),
  "divider-doc": createComponentDoc("Divider", "UI: Контейнеры"),
  "spacer-doc": createComponentDoc("Spacer", "UI: Контейнеры"),
  
  // UI: Текст и Инфо
  "heading-doc": createComponentDoc("Heading", "UI: Текст и Инфо"),
  "text-doc": createComponentDoc("Text", "UI: Текст и Инфо"),
  "badge-doc": createComponentDoc("Badge", "UI: Текст и Инфо"),
  "statusrow-doc": createComponentDoc("StatusRow", "UI: Текст и Инфо"),
  "markdown-doc": createComponentDoc("Markdown", "UI: Текст и Инфо"),
  
  // UI: Формы и Ввод
  "button-doc": createComponentDoc("Button", "UI: Формы и Ввод"),
  "input-doc": createComponentDoc("Input", "UI: Формы и Ввод"),
  "toggle-doc": createComponentDoc("Toggle", "UI: Формы и Ввод"),
  "select-doc": createComponentDoc("Select", "UI: Формы и Ввод"),
  "codeeditor-doc": createComponentDoc("CodeEditor", "UI: Формы и Ввод"),
  
  // UI: Медиа компоненты
  "mediacard-doc": createComponentDoc("MediaCard", "UI: Медиа"),
  "mediarow-doc": createComponentDoc("MediaRow", "UI: Медиа"),
  "herospotlight-doc": createComponentDoc("HeroSpotlight", "UI: Медиа"),
  "loadingspinner-doc": createComponentDoc("LoadingSpinner", "UI: Медиа"),
  "episodessection-doc": createComponentDoc("EpisodesSection", "UI: Медиа"),
  "episodecard-doc": createComponentDoc("EpisodeCard", "UI: Медиа"),
  "episodeselector-doc": createComponentDoc("EpisodeSelector", "UI: Медиа"),
  
  // UI: Плееры и Потоки
  "mediacast-doc": createComponentDoc("MediaCast", "UI: Рендеринг и Стриминг"),
  "mediaoverview-doc": createComponentDoc("MediaOverview", "UI: Рендеринг и Стриминг"),
  "streamrow-doc": createComponentDoc("StreamRow", "UI: Рендеринг и Стриминг"),
  "streamlist-doc": createComponentDoc("StreamList", "UI: Рендеринг и Стриминг"),
  "streamskeletonlist-doc": createComponentDoc("StreamSkeletonList", "UI: Рендеринг и Стриминг"),
  "mediaplayer-doc": createComponentDoc("MediaPlayer", "UI: Рендеринг и Стриминг"),
  "profileselector-doc": createComponentDoc("ProfileSelector", "UI: Рендеринг и Стриминг"),
  "searchbar-doc": createComponentDoc("SearchBar", "UI: Рендеринг и Стриминг"),
  "streamfilterbar-doc": createComponentDoc("StreamFilterBar", "UI: Рендеринг и Стриминг"),
  
  // Разработка
  sandbox: {
    title: "Интерактивная песочница",
    category: "Песочница",
    toc: [],
    render: () => null
  }
};
