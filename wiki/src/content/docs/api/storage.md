---
title: "Изолированное хранилище"
description: "PotokSDK.storage.local — async key-value, изолировано по pluginId."
---

<a id="storage-methods"></a>

`PotokSDK.storage.local` — async key-value, изолировано по `pluginId`.

## Доступные методы

| Метод | Сигнатура | Описание |
| --- | --- | --- |
| `getItem` | `getItem(key: string): Promise<string | null>` | Асинхронно считывает значение ключа. |
| `setItem` | `setItem(key: string, value: any): Promise<void>` | Сохраняет переданное значение под указанным ключом. |

<a id="isolation"></a>

## Концепция изолированных пространств

Ключи с префиксом `pluginId`. Плагины не видят чужие данные. `window.localStorage` недоступен.

[Запустить пример работы с БД в Sandbox](/wiki/sandbox/#code=%2F%2F%20%D0%9F%D1%80%D0%B8%D0%BC%D0%B5%D1%80%20%D1%81%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D0%B5%D0%BD%D0%B8%D1%8F%20%D0%B8%20%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B8%20%D0%BD%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B5%D0%BA%0Aconst%20%7B%20ui%2C%20storage%2C%20createState%20%7D%20%3D%20PotokSDK%3B%0A%0Aconst%20state%20%3D%20createState\(%7B%0A%20%20savedValue%3A%20%22%D0%9D%D0%B8%D1%87%D0%B5%D0%B3%D0%BE%20%D0%BD%D0%B5%20%D1%81%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D0%B5%D0%BD%D0%BE%22%2C%0A%20%20inputValue%3A%20%22%22%0A%7D\)%3B%0A%0Aasync%20function%20initStorage\(\)%20%7B%0A%20%20const%20saved%20%3D%20await%20storage.local.getItem\(%22user_custom_note%22\)%3B%0A%20%20if%20\(saved\)%20%7B%0A%20%20%20%20state.savedValue%20%3D%20saved%3B%0A%20%20%7D%0A%7D%0A%0Afunction%20render\(\)%20%7B%0A%20%20ui.render\(%0A%20%20%20%20Card\(\)%0A%20%20%20%20%20%20.title\(%22%D0%9B%D0%BE%D0%BA%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B5%20%D1%85%D1%80%D0%B0%D0%BD%D0%B8%D0%BB%D0%B8%D1%89%D0%B5%22\)%0A%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20%20%20.child\(Text\(%22%D0%A1%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D0%B5%D0%BD%D0%BE%20%D0%B2%20%D0%91%D0%94%3A%20%22%20%2B%20state.savedValue\).bold\(true\)\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Input\(%22note-input%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.label\(%22%D0%9D%D0%BE%D0%B2%D0%B0%D1%8F%20%D0%B7%D0%B0%D0%BF%D0%B8%D1%81%D1%8C%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.value\(state.inputValue\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onChange\(\(val\)%20%3D%3E%20state.inputValue%20%3D%20val\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Button\(%22%D0%A1%D0%BE%D1%85%D1%80%D0%B0%D0%BD%D0%B8%D1%82%D1%8C%20%D0%B2%20%D0%91%D0%94%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.variant\(%22primary%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(async%20\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20await%20storage.local.setItem\(%22user_custom_note%22%2C%20state.inputValue\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.savedValue%20%3D%20state.inputValue%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.showHUD\(%22success%22%2C%20%22%D0%97%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%83%D1%81%D0%BF%D0%B5%D1%88%D0%BD%D0%BE%20%D0%B7%D0%B0%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%BE!%22\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20\)%0A%20%20\)%3B%0A%7D%0A%0Astate.%24subscribe\(render\)%3B%0Arender\(\)%3B%0AinitStorage\(\)%3B)
