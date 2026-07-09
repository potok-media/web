export type InspectorTemplateId = "button" | "status" | "settings";

export const INSPECTOR_TEMPLATE_OPTIONS = [
  { value: "", label: "Выберите шаблон..." },
  { value: "recommended", label: "Рекомендуемый шаблон для слота" },
  { value: "button", label: "Кнопки действия (HStack)" },
  { value: "status", label: "Информационный статус (Card)" },
  { value: "settings", label: "Форма настроек (VStack)" },
] as const;

export const INSPECTOR_TEMPLATE_CODE: Record<InspectorTemplateId, string> = {
  button: `// Шаблон: HStack с кнопками действий
const { ui } = PotokSDK;

return HStack()
  .spacing(10)
  .child(
    Button("Открыть плеер")
      .variant("primary")
      .onClick(() => ui.showHUD("success", "Запуск воспроизведения..."))
  )
  .child(
    Button("В закладки")
      .variant("ghost")
      .onClick(() => ui.showHUD("info", "Добавлено в закладки!"))
  );`,
  status: `// Шаблон: Card со статусом TorrServer
const { ui } = PotokSDK;

return Card()
  .title("Состояние TorrServer")
  .subtitle("Мониторинг сети")
  .child(
    VStack()
      .spacing(6)
      .child(Text("Входящая скорость: 4.8 МБ/с").variant("success"))
      .child(Text("Активных пиров: 34").variant("secondary"))
  );`,
  settings: `// Шаблон: VStack с формой параметров
const { ui } = PotokSDK;

return Card()
  .title("Настройки TorrServer")
  .child(
    VStack()
      .spacing(12)
      .child(Input("port").label("Порт TorrServer").value("8090"))
      .child(Toggle("ssl").label("Использовать SSL").value(false))
      .child(
        Button("Сохранить параметры")
          .variant("primary")
          .onClick(() => ui.showHUD("success", "Настройки сохранены!"))
      )
  );`,
};

export function isInspectorTemplateId(val: string): val is InspectorTemplateId {
  return val === "button" || val === "status" || val === "settings";
}