---
title: "Сетевой клиент http"
description: "Плагин в iframe — fetch снаружи не работает. Запросы через PotokSDK.http (прокси хоста)."
---

<a id="get"></a>

Плагин в `iframe` — `fetch` снаружи не работает. Запросы через `PotokSDK.http` (прокси хоста).



## HTTP GET

```javascript
http.get(url: string, headers?: Record<string, string>): Promise<{ status: number, data: any }>
```

<a id="post"></a>

## HTTP POST

```javascript
http.post(url: string, body?: any, headers?: Record<string, string>): Promise<{ status: number, data: any }>
```

<a id="cors"></a>

## Преимущества проксирования

-   `CORS` — запрос идёт через бэкенд Potok, не из `iframe`.
-   JSON в ответе парсится автоматически — data уже объект.

[Загрузить Todo по сети in Sandbox](/wiki/sandbox/#code=%2F%2F%20%D0%9F%D1%80%D0%B8%D0%BC%D0%B5%D1%80%20%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B8%20%D0%B4%D0%B0%D0%BD%D0%BD%D1%8B%D1%85%20%D0%BF%D0%BE%20%D1%81%D0%B5%D1%82%D0%B8%0Aconst%20%7B%20ui%2C%20http%2C%20createState%20%7D%20%3D%20PotokSDK%3B%0A%0Aconst%20state%20%3D%20createState\(%7B%0A%20%20loading%3A%20true%2C%0A%20%20todoTitle%3A%20%22%22%2C%0A%20%20error%3A%20null%0A%7D\)%3B%0A%0Aasync%20function%20loadData\(\)%20%7B%0A%20%20try%20%7B%0A%20%20%20%20const%20res%20%3D%20await%20http.get\(%22https%3A%2F%2Fjsonplaceholder.typicode.com%2Ftodos%2F1%22\)%3B%0A%20%20%20%20state.todoTitle%20%3D%20res.data.title%3B%0A%20%20%20%20state.loading%20%3D%20false%3B%0A%20%20%7D%20catch%20\(err\)%20%7B%0A%20%20%20%20state.error%20%3D%20err.message%3B%0A%20%20%20%20state.loading%20%3D%20false%3B%0A%20%20%7D%0A%7D%0A%0Afunction%20render\(\)%20%7B%0A%20%20ui.render\(%0A%20%20%20%20Card\(\)%0A%20%20%20%20%20%20.title\(%22%D0%97%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B0%20%D0%BF%D0%BE%20%D1%81%D0%B5%D1%82%D0%B8%22\)%0A%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20state.loading%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3F%20LoadingSpinner\(\).message\(%22%D0%97%D0%B0%D0%B3%D1%80%D1%83%D0%B6%D0%B0%D0%B5%D0%BC%20TODO%20%D1%81%20%D1%81%D0%B5%D1%80%D0%B2%D0%B5%D1%80%D0%B0...%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3A%20Text\(state.error%20%3F%20%22%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%3A%20%22%20%2B%20state.error%20%3A%20%22%D0%97%D0%B0%D0%B4%D0%B0%D1%87%D0%B0%20%D1%81%20%D1%81%D0%B5%D1%80%D0%B2%D0%B5%D1%80%D0%B0%3A%20%22%20%2B%20state.todoTitle\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Button\(%22%D0%97%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%B8%D1%82%D1%8C%20%D0%B7%D0%B0%D0%BD%D0%BE%D0%B2%D0%BE%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.loading%20%3D%20true%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20loadData\(\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20\)%0A%20%20\)%3B%0A%7D%0A%0Astate.%24subscribe\(render\)%3B%0Arender\(\)%3B%0AloadData\(\)%3B)
