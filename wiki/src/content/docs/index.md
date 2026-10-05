---
title: "О проекте Potok"
description: "Potok — платформа плагинов и UI-модулей для медиа-экосистемы. Декларативный UI, изолированная песочница."
---

<a id="overview"></a>

Potok — платформа плагинов и UI-модулей для медиа-экосистемы. Декларативный UI, изолированная песочница.

Расширения не трогают DOM и глобалы браузера — только SDK API.

## Архитектура

-   JS-билдеры → JSON-схема → нативный рендер хоста.
-   Код плагина в изолированном контексте, без `window`/`document`/`localStorage`.
-   Слоты через React Portals и CSS-селекторы из реестра.
-   Slot inspector для отладки на лету.

* * *

<a id="declarative"></a>

## Декларативный UI

Плагин собирает UI билдерами (SwiftUI-like), хост рендерит скомпилированную JSON-схему:

```javascript
ui.render(
  VStack()
    .spacing(10)
    .child(Heading("Hello, world!"))
    .child(Button("Click me").onClick(() => {
      ui.showHUD("success", "Done!");
    }))
);
```

<a id="sandbox-details"></a>

## Безопасность и Песочница

Плагин в изолированной JS-песочнице:

-   `window`, `document`, `localStorage` → undefined.
-   Сеть только через `PotokSDK.http`.
-   `storage.local` изолирован и привязан к `pluginId`.

[Запустить этот пример в Sandbox](/wiki/sandbox/#code=%2F%2F%20Quick%20UI%20example%0Aconst%20%7B%20ui%20%7D%20%3D%20PotokSDK%3B%0A%0Aui.render\(%0A%20%20VStack\(\)%0A%20%20%20%20.spacing\(12\)%0A%20%20%20%20.child\(Heading\(%22Introduction%22\).level\(2\)\)%0A%20%20%20%20.child\(Text\(%22Welcome%20to%20the%20Sandbox!%20Edit%20this%20text%20and%20run%20again.%22\)\)%0A%20%20%20%20.child\(Button\(%22Notify%22\).onClick\(\(\)%20%3D%3E%20ui.showHUD\(%22info%22%2C%20%22Clicked!%22\)\)\)%0A\)%3B)
