export const INITIAL_SANDBOX_CODE = `// Potok Plugin SDK Sandbox
// Build your interactive plugin here!

const { ui, createState } = PotokSDK;

const state = createState({
  counter: 0,
  textValue: "Hello, Potok!",
  isEnabled: true
});

function render() {
  ui.render(
    VStack()
      .spacing(20)
      .alignItems("center")
      .child(
        Heading("INTERACTIVE PLUGIN").level(2)
      )
      .child(
        Text("Click count: " + state.counter)
          .size("lg")
          .bold(true)
          .variant(state.counter > 5 ? "success" : "primary")
      )
      .child(
        Text(state.textValue)
          .variant("secondary")
      )
      .child(
        HStack()
          .spacing(12)
          .child(
            Button("Increment")
              .variant("primary")
              .icon("play")
              .onClick(() => {
                state.counter++;
                if (state.counter === 5) {
                  ui.showHUD("success", "You clicked 5 times!");
                }
              })
          )
          .child(
            Button("Reset")
              .variant("ghost")
              .onClick(() => {
                state.counter = 0;
              })
          )
      )
      .child(
        Input("text-input")
          .label("Change text above")
          .placeholder("Enter text...")
          .value(state.textValue)
          .onChange((val) => {
            state.textValue = val;
          })
      )
      .child(
        Toggle("toggle-switch")
          .label("Show extra info")
          .value(state.isEnabled)
          .onChange((checked) => {
            state.isEnabled = checked;
          })
      )
      .child(
        state.isEnabled 
          ? Markdown("### Sandbox help\\n* State updates reactively\\n* Browser localStorage is blocked in the sandbox\\n* API calls go through http.get and http.post\\n* Event logs appear in the panel below")
          : Spacer()
      )
  );
}

state.$subscribe(render);
render();
`;