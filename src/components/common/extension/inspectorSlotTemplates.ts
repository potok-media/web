/** Per-slot starter code shown when the developer inspector opens. */
export function getInspectorSlotTemplate(slotName: string): string {
  if (slotName === "media-actions") {
    return `// Шаблон для media-actions: Кнопки быстрого запуска стриминга
const { ui } = PotokSDK;

return HStack()
  .spacing(8)
  .child(
    Button("Смотреть в 4K")
      .variant("primary")
      .onClick(() => {
        ui.showHUD("success", "Запуск парсинга источников в качестве 4K...");
      })
  )
  .child(
    Button("Копировать Magnet")
      .variant("secondary")
      .onClick(() => {
        ui.showHUD("info", "Magnet-ссылка скопирована в буфер обмена!");
      })
  );`;
  }

  if (slotName === "sidebar-status") {
    return `// Шаблон для sidebar-status: Информационная панель TorrServer
const { ui } = PotokSDK;

return Card()
  .child(
    VStack()
      .spacing(6)
      .child(
        HStack()
          .spacing(6)
          .child(Badge("TorrServer").color("success"))
          .child(Text("Работает").variant("success").bold(true))
      )
      .child(Text("Входящая скорость: 4.8 МБ/с").size("sm").variant("secondary"))
      .child(Text("Версия: 1.2.86").size("sm").variant("secondary"))
  );`;
  }

  if (
    slotName === "sidebar-menu" ||
    slotName === "sidebar-menu-home" ||
    slotName === "sidebar-menu-library"
  ) {
    return `// Шаблон для ${slotName}: Дополнительные разделы навигации
const { ui } = PotokSDK;

return VStack()
  .spacing(4)
  .child(
    Button("Случайный фильм")
      .variant("sidebar-item")
      .icon("play")
      .onClick(() => {
        ui.navigateTo("/media/movie/random");
      })
  )
  .child(
    Button("Документация")
      .variant("sidebar-item")
      .icon("sliders")
      .onClick(() => {
        ui.navigateTo("/wiki");
      })
  );`;
  }

  if (slotName === "settings-tabs") {
    return `// Шаблон для settings-tabs: Настройки кеширования плагина
const { ui } = PotokSDK;

return Card()
  .title("Настройки TorrServer")
  .subtitle("Параметры буферизации")
  .child(
    VStack()
      .spacing(10)
      .child(Input("cache-size").label("Размер кэша (МБ)").value("1024"))
      .child(Toggle("preload").label("Предзагрузка серий").value(true))
      .child(
        Button("Сохранить параметры")
          .variant("primary")
          .onClick(() => ui.showHUD("success", "Настройки сохранены!"))
      )
  );`;
  }

  return `// Универсальный шаблон UI компонента для слота ${slotName}
const { ui } = PotokSDK;

return Card()
  .title("Компонент инспектора")
  .subtitle("Слот: ${slotName}")
  .child(
    VStack()
      .spacing(12)
      .child(Text("Этот блок собран с использованием Potok SDK UI."))
      .child(
        Button("Вызвать HUD уведомление")
          .variant("primary")
          .onClick(() => {
            ui.showHUD("info", "Уведомление от слота ${slotName}");
          })
      )
  );`;
}