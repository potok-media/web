---
title: "Реактивность и State"
description: "createState оборачивает объект в Proxy; мутации триггерят $subscribe."
---

<a id="state-api"></a>

`createState` оборачивает объект в `Proxy`; мутации триггерят `$subscribe`.

<a id="subscription"></a>

## Подписка

`$subscribe`(callback) — подписка на изменения. Возвращает unsubscribe. Обычно callback = render:

```javascript
const state = createState({ title: "Привет" });

function render() {
  ui.render(Text(state.title));
}

// Подписываемся на изменения:
const unsubscribe = state.$subscribe(render);

// Вызываем для первоначального отображения:
render();

// Когда подписка больше не нужна (например, при выгрузке плагина):
// unsubscribe();
```

<a id="deep-reactivity"></a>

## Глубокая реактивность

Вложенные объекты и массивы тоже реактивны — глубокие ключи и push/splice триггерят рендер:

```javascript
const state = createState({
  user: {
    profile: { name: "Алексей" }
  },
  genres: ["Экшен", "Драма"]
});

// 1. Изменение глубоко вложенного свойства (автоматически вызовет рендер)
state.user.profile.name = "Иван";

// 2. Модификация массивов (добавление, удаление, сортировка)
state.genres.push("Комедия");
state.genres.splice(0, 1);
```

<a id="batching"></a>

## Пакетные обновления (Batching)

Синхронные мутации батчатся через `Promise.resolve()` — один вызов подписчика на такт:

```javascript
const state = createState({ count: 0, lastAction: "none" });

state.$subscribe(() => {
  console.log("Рендер вызван!");
});

// Синхронное изменение нескольких свойств:
state.count++;
state.lastAction = "increment";
state.count += 5;

// В консоли отобразится ровно ОДИН вывод "Рендер вызван!", 
// так как все обновления объединились в один такт.
```

<a id="reactive-example"></a>

## Код реактивного счетчика

Счётчик с `$subscribe`:

```javascript
const state = createState({ clicks: 0 });

function render() {
  ui.render(
    VStack()
      .child(Text("Кликов: " + state.clicks))
      .child(Button("Кликнуть").onClick(() => state.clicks++))
  );
}
```

[Запустить пример с реактивностью в Sandbox](/wiki/sandbox/#code=%2F%2F%20%D0%98%D0%BD%D1%82%D0%B5%D1%80%D0%B0%D0%BA%D1%82%D0%B8%D0%B2%D0%BD%D1%8B%D0%B9%20%D0%BF%D1%80%D0%B8%D0%BC%D0%B5%D1%80%20%D1%80%D0%B5%D0%B0%D0%BA%D1%82%D0%B8%D0%B2%D0%BD%D0%BE%D1%81%D1%82%D0%B8%0Aconst%20%7B%20ui%2C%20createState%20%7D%20%3D%20PotokSDK%3B%0A%0Aconst%20state%20%3D%20createState\(%7B%0A%20%20clicks%3A%200%2C%0A%20%20lastClicked%3A%20%22%D0%9D%D0%B8%D0%BA%D0%BE%D0%B3%D0%B4%D0%B0%22%0A%7D\)%3B%0A%0Afunction%20draw\(\)%20%7B%0A%20%20ui.render\(%0A%20%20%20%20Card\(\)%0A%20%20%20%20%20%20.title\(%22%D0%A1%D1%87%D0%B5%D1%82%D1%87%D0%B8%D0%BA%20%D0%BA%D0%BB%D0%B8%D0%BA%D0%BE%D0%B2%22\)%0A%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20%20%20.child\(Text\(%22%D0%9A%D0%BB%D0%B8%D0%BA%D0%BE%D0%B2%20%D0%B7%D0%B0%D1%84%D0%B8%D0%BA%D1%81%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%3A%20%22%20%2B%20state.clicks\).bold\(true\).size\(%22lg%22\)\)%0A%20%20%20%20%20%20%20%20%20%20.child\(Text\(%22%D0%9F%D0%BE%D1%81%D0%BB%D0%B5%D0%B4%D0%BD%D0%B5%D0%B5%20%D0%BD%D0%B0%D0%B6%D0%B0%D1%82%D0%B8%D0%B5%3A%20%22%20%2B%20state.lastClicked\).variant\(%22secondary%22\)\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Button\(%22%D0%9A%D0%BB%D0%B8%D0%BA!%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.variant\(%22primary%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.clicks%2B%2B%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.lastClicked%20%3D%20new%20Date\(\).toLocaleTimeString\(\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20\)%0A%20%20\)%3B%0A%7D%0A%0Astate.%24subscribe\(draw\)%3B%0Adraw\(\)%3B)
