---
title: "About Potok"
description: "Potok — plugin and UI module platform for the media stack. Declarative UI, isolated sandbox."
---

<a id="overview"></a>

Potok — plugin and UI module platform for the media stack. Declarative UI, isolated sandbox.

Extensions never touch the DOM or browser globals — only the SDK API.

## Architecture

-   JS builders → JSON schema → native host render.
-   Plugin code in an isolated context; no `window`/`document`/`localStorage`.
-   Slots via React Portals and CSS selectors from the registry.
-   Slot inspector for live debugging.

* * *

<a id="declarative"></a>

## Declarative UI

Plugins build UI with builders (SwiftUI-like); the host renders the compiled JSON schema:

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

## Security & Sandbox

Plugin runs in an isolated JS sandbox:

-   `window`, `document`, `localStorage` → undefined.
-   Network only via `PotokSDK.http`.
-   `storage.local` is isolated and scoped to `pluginId`.

[Run this example in Sandbox](/wiki/en/sandbox/#code=%2F%2F%20Quick%20UI%20example%0Aconst%20%7B%20ui%20%7D%20%3D%20PotokSDK%3B%0A%0Aui.render\(%0A%20%20VStack\(\)%0A%20%20%20%20.spacing\(12\)%0A%20%20%20%20.child\(Heading\(%22Introduction%22\).level\(2\)\)%0A%20%20%20%20.child\(Text\(%22Welcome%20to%20the%20Sandbox!%20Edit%20this%20text%20and%20run%20again.%22\)\)%0A%20%20%20%20.child\(Button\(%22Notify%22\).onClick\(\(\)%20%3D%3E%20ui.showHUD\(%22info%22%2C%20%22Clicked!%22\)\)\)%0A\)%3B)
