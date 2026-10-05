---
title: "Isolated storage"
description: "PotokSDK.storage.local — async key-value, isolated per pluginId."
---

<a id="storage-methods"></a>

`PotokSDK.storage.local` — async key-value, isolated per `pluginId`.

## Available methods

| Method | Signature | Description |
| --- | --- | --- |
| `getItem` | `getItem(key: string): Promise<string | null>` | Asynchronously reads a key value. |
| `setItem` | `setItem(key: string, value: any): Promise<void>` | Saves a value under the given key. |

<a id="isolation"></a>

## Isolated namespaces

For security the host prefixes every stored value with `pluginId`. Plugin A cannot access plugin B keys. Direct `window.localStorage` access is blocked.

[Run storage example in Sandbox](/wiki/en/sandbox/#code=%2F%2F%20Save%20and%20load%20settings%20example%0Aconst%20%7B%20ui%2C%20storage%2C%20createState%20%7D%20%3D%20PotokSDK%3B%0A%0Aconst%20state%20%3D%20createState\(%7B%0A%20%20savedValue%3A%20%22Nothing%20saved%22%2C%0A%20%20inputValue%3A%20%22%22%0A%7D\)%3B%0A%0Aasync%20function%20initStorage\(\)%20%7B%0A%20%20const%20saved%20%3D%20await%20storage.local.getItem\(%22user_custom_note%22\)%3B%0A%20%20if%20\(saved\)%20%7B%0A%20%20%20%20state.savedValue%20%3D%20saved%3B%0A%20%20%7D%0A%7D%0A%0Afunction%20render\(\)%20%7B%0A%20%20ui.render\(%0A%20%20%20%20Card\(\)%0A%20%20%20%20%20%20.title\(%22Local%20storage%22\)%0A%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20%20%20.child\(Text\(%22Saved%20in%20DB%3A%20%22%20%2B%20state.savedValue\).bold\(true\)\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Input\(%22note-input%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.label\(%22New%20entry%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.value\(state.inputValue\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onChange\(\(val\)%20%3D%3E%20state.inputValue%20%3D%20val\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Button\(%22Save%20to%20DB%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.variant\(%22primary%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(async%20\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20await%20storage.local.setItem\(%22user_custom_note%22%2C%20state.inputValue\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.savedValue%20%3D%20state.inputValue%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20ui.showHUD\(%22success%22%2C%20%22Value%20saved%20successfully!%22\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20\)%0A%20%20\)%3B%0A%7D%0A%0Astate.%24subscribe\(render\)%3B%0Arender\(\)%3B%0AinitStorage\(\)%3B)
