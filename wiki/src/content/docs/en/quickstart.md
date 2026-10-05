---
title: "Your first plugin"
description: "Create a manifest and entry point, then run and debug a Potok plugin."
---

Create a directory containing `manifest.json` and `index.js`.

## Manifest

```json title="manifest.json"
{
  "id": "my-first-plugin",
  "name": "My first plugin",
  "version": "1.0.0",
  "entrypoint": "index.js",
  "permissions": ["ui-notifications"],
  "slots": [{ "id": "hello", "slotName": "home-rows-top", "title": "Hello" }]
}
```

`id`, `name`, and `entrypoint` are required. Request permissions only for the APIs you use. See the [manifest reference](/wiki/en/api/manifest/) for fields, permissions, and slots.

## Entry point

```js title="index.js"
const { ui } = PotokSDK;
const { VStack, Heading, Button } = ui.components;

ui.render(
  VStack()
    .spacing(12)
    .child(Heading("Hello, Potok!"))
    .child(Button("Click me").onClick(() => {
      ui.showHUD("success", "It works!");
    })),
  "hello"
);
```

Build UI with [SDK components](/wiki/en/components/): the plugin describes a tree and the host renders it. The sandbox exposes the same builders directly; remove the second `ui.render` argument (the slot ID) to preview the example there.

## Test and install

1. Open the [sandbox](/wiki/en/sandbox/) and test your UI and event handlers.
2. Serve the plugin directory over HTTP and install its URL in Potok's extension settings.
3. Check the plugin's slot contribution and extension inspector messages.

The sandbox provides test implementations of HTTP, storage, notifications, and navigation. Install the plugin in the app to verify permissions, source registration, and integration with real data.
