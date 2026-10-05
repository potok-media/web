export const SANDBOX_EXAMPLE_IDS = ['notifications', 'forms', 'overlays', 'episodes'] as const;

export function sandboxExampleCode(id: string, language: string): string {
  const ru = language.startsWith('ru');
  const text = (r: string, e: string) => JSON.stringify(ru ? r : e);
  switch (id) {
    case 'notifications':
      return `const { ui } = PotokSDK;
ui.render(
  VStack().spacing(20)
    .child(Heading(${text('Уведомления Potok', 'Potok notifications')}).level(2))
    .child(Text(${text('Нажмите на кнопки: уведомления отображаются так же, как в приложении.', 'Click a button to see the same notification as in the app.')}).variant('secondary'))
    .child(Grid().minWidth('12rem').gap('12px').children([
      Button(${text('Информация', 'Information')}).variant('primary').onClick(() => ui.showHUD('info', ${text('Новая версия доступна', 'An update is available')}, { durationMs: 5000 })),
      Button(${text('Успех', 'Success')}).onClick(() => ui.showHUD('success', ${text('Изменения сохранены', 'Changes saved')})),
      Button(${text('Предупреждение', 'Warning')}).onClick(() => ui.showHUD('warning', ${text('Проверьте подключение', 'Check your connection')})),
      Button(${text('Ошибка', 'Error')}).variant('danger').onClick(() => ui.showHUD('error', ${text('Не удалось загрузить данные', 'Could not load data')}))
    ]))
);`;
    case 'forms':
      return `const { ui, createState } = PotokSDK;
const state = createState({ name: '', enabled: true, volume: 50, sort: 'new' });
function draw() {
  ui.render(VStack().spacing(20)
    .child(Heading(${text('Форма настроек', 'Settings form')}).level(2))
    .child(Input('name').label(${text('Имя', 'Name')}).placeholder(${text('Введите имя', 'Enter a name')}).value(state.name).onChange(v => state.name = v))
    .child(Toggle('enabled').label(${text('Автовоспроизведение', 'Autoplay')}).value(state.enabled).onChange(v => state.enabled = v))
    .child(Range('volume').label(${text('Громкость', 'Volume')}).min(0).max(100).value(state.volume).showValue(true).onChange(v => state.volume = v))
    .child(Dropdown().label(${text('Сортировка', 'Sort')}).value(state.sort).items([
      { id: 'new', label: ${text('Сначала новые', 'Newest first')} },
      { id: 'rating', label: ${text('По рейтингу', 'Top rated')} }
    ]).onSelect(v => state.sort = v))
    .child(Button(${text('Сохранить', 'Save')}).variant('primary').onClick(() => ui.showHUD('success', ${text('Настройки сохранены', 'Settings saved')})))
  );
}
state.$subscribe(draw); draw();`;
    case 'overlays':
      return `const { ui, createState } = PotokSDK;
const state = createState({ open: false });
function draw() {
  ui.render(VStack().spacing(20)
    .child(Heading(${text('Окно и подсказка', 'Dialog and tooltip')}).level(2))
    .child(Tooltip(${text('Открывает настоящее окно Potok', 'Opens the real Potok dialog')}).child(
      Button(${text('Открыть окно', 'Open dialog')}).variant('primary').onClick(() => state.open = true)))
    .child(Modal().open(state.open).title(${text('Подтверждение', 'Confirmation')}).padding(24)
      .onClose(() => state.open = false)
      .child(Text(${text('Проверьте размеры, тему и закрытие по Escape.', 'Check sizing, theme, and dismissal with Escape.')}))
      .child(Button(${text('Подтвердить', 'Confirm')}).variant('primary').onClick(() => {
        state.open = false; ui.showHUD('success', ${text('Готово', 'Done')});
      })))
  );
}
state.$subscribe(draw); draw();`;
    case 'episodes':
      return `const { ui } = PotokSDK;
ui.render(Button(${text('Выбрать серию', 'Choose episode')}).variant('primary').onClick(() => {
  ui.showEpisodeSelector({
    title: ${text('Демонстрационный сериал', 'Demo series')},
    episodes: [
      { id: 'ep-1', season: 1, episode: 1, title: ${text('Первая серия', 'First episode')}, audios: [] },
      { id: 'ep-2', season: 1, episode: 2, title: ${text('Вторая серия', 'Second episode')}, audios: [] }
    ],
    onPlay: ({ episode }) => ui.showHUD('success', episode.title),
    onClose: () => ui.showHUD('info', ${text('Выбор закрыт', 'Picker closed')})
  });
}));`;
    default: return '';
  }
}
