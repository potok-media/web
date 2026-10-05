---
title: "HTTP client"
description: "Plugin in an iframe — fetch to external APIs does not work. Requests via PotokSDK.http (host proxy)."
---

<a id="get"></a>

Plugin in an `iframe` — `fetch` to external APIs does not work. Requests via `PotokSDK.http` (host proxy).



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

## Proxy benefits

-   `CORS` — request goes through Potok backend, not from the `iframe`.
-   JSON responses are parsed automatically — data is already an object.

[Load Todo over network in Sandbox](/wiki/en/sandbox/#code=%2F%2F%20Network%20data%20loading%20example%0Aconst%20%7B%20ui%2C%20http%2C%20createState%20%7D%20%3D%20PotokSDK%3B%0A%0Aconst%20state%20%3D%20createState\(%7B%0A%20%20loading%3A%20true%2C%0A%20%20todoTitle%3A%20%22%22%2C%0A%20%20error%3A%20null%0A%7D\)%3B%0A%0Aasync%20function%20loadData\(\)%20%7B%0A%20%20try%20%7B%0A%20%20%20%20const%20res%20%3D%20await%20http.get\(%22https%3A%2F%2Fjsonplaceholder.typicode.com%2Ftodos%2F1%22\)%3B%0A%20%20%20%20state.todoTitle%20%3D%20res.data.title%3B%0A%20%20%20%20state.loading%20%3D%20false%3B%0A%20%20%7D%20catch%20\(err\)%20%7B%0A%20%20%20%20state.error%20%3D%20err.message%3B%0A%20%20%20%20state.loading%20%3D%20false%3B%0A%20%20%7D%0A%7D%0A%0Afunction%20render\(\)%20%7B%0A%20%20ui.render\(%0A%20%20%20%20Card\(\)%0A%20%20%20%20%20%20.title\(%22Network%20loading%22\)%0A%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20state.loading%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3F%20LoadingSpinner\(\).message\(%22Loading%20TODO%20from%20server...%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3A%20Text\(state.error%20%3F%20%22Error%3A%20%22%20%2B%20state.error%20%3A%20%22Task%20from%20server%3A%20%22%20%2B%20state.todoTitle\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Button\(%22Reload%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.loading%20%3D%20true%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20loadData\(\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20\)%0A%20%20\)%3B%0A%7D%0A%0Astate.%24subscribe\(render\)%3B%0Arender\(\)%3B%0AloadData\(\)%3B)
