---
title: "Reactivity & State"
description: "createState wraps an object in a Proxy; mutations trigger $subscribe."
---

<a id="state-api"></a>

`createState` wraps an object in a `Proxy`; mutations trigger `$subscribe`.

<a id="subscription"></a>

## Subscribe

`$subscribe`(callback) — subscribe to changes. Returns unsubscribe. Usually callback = render:

```javascript
const state = createState({ title: "Hello" });

function render() {
  ui.render(Text(state.title));
}

// Subscribe to changes:
const unsubscribe = state.$subscribe(render);

// Initial render:
render();

// When no longer needed (e.g. plugin unload):
// unsubscribe();
```

<a id="deep-reactivity"></a>

## Deep reactivity

Nested objects and arrays are reactive — deep keys and push/splice trigger render:

```javascript
const state = createState({
  user: {
    profile: { name: "Alex" }
  },
  genres: ["Action", "Drama"]
});

// 1. Deep property change (triggers render)
state.user.profile.name = "Ivan";

// 2. Array mutations (push, splice, sort)
state.genres.push("Comedy");
state.genres.splice(0, 1);
```

<a id="batching"></a>

## Batch updates (Batching)

Synchronous mutations batch via `Promise.resolve()` — one subscriber call per tick:

```javascript
const state = createState({ count: 0, lastAction: "none" });

state.$subscribe(() => {
  console.log("Render called!");
});

// Synchronous multi-field updates:
state.count++;
state.lastAction = "increment";
state.count += 5;

// Console shows exactly ONE "Render called!" 
// because updates are batched into one tick.
```

<a id="reactive-example"></a>

## Reactive counter code

Counter with `$subscribe`:

```javascript
const state = createState({ clicks: 0 });

function render() {
  ui.render(
    VStack()
      .child(Text("Clicks: " + state.clicks))
      .child(Button("Click").onClick(() => state.clicks++))
  );
}
```

[Run reactivity example in Sandbox](/wiki/en/sandbox/#code=%2F%2F%20Interactive%20reactivity%20example%0Aconst%20%7B%20ui%2C%20createState%20%7D%20%3D%20PotokSDK%3B%0A%0Aconst%20state%20%3D%20createState\(%7B%0A%20%20clicks%3A%200%2C%0A%20%20lastClicked%3A%20%22Never%22%0A%7D\)%3B%0A%0Afunction%20draw\(\)%20%7B%0A%20%20ui.render\(%0A%20%20%20%20Card\(\)%0A%20%20%20%20%20%20.title\(%22Click%20counter%22\)%0A%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20VStack\(\)%0A%20%20%20%20%20%20%20%20%20%20.spacing\(12\)%0A%20%20%20%20%20%20%20%20%20%20.child\(Text\(%22Clicks%20recorded%3A%20%22%20%2B%20state.clicks\).bold\(true\).size\(%22lg%22\)\)%0A%20%20%20%20%20%20%20%20%20%20.child\(Text\(%22Last%20click%3A%20%22%20%2B%20state.lastClicked\).variant\(%22secondary%22\)\)%0A%20%20%20%20%20%20%20%20%20%20.child\(%0A%20%20%20%20%20%20%20%20%20%20%20%20Button\(%22Click!%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.variant\(%22primary%22\)%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20.onClick\(\(\)%20%3D%3E%20%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.clicks%2B%2B%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20state.lastClicked%20%3D%20new%20Date\(\).toLocaleTimeString\(\)%3B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D\)%0A%20%20%20%20%20%20%20%20%20%20\)%0A%20%20%20%20%20%20\)%0A%20%20\)%3B%0A%7D%0A%0Astate.%24subscribe\(draw\)%3B%0Adraw\(\)%3B)
