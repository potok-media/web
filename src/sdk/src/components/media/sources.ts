import { compileMaybe } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

export class MediaSearchProviderBuilder {
  private id: string;
  private name: string;
  private iconUrl?: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  icon(url: string): this {
    this.iconUrl = url;
    return this;
  }

  onSearch(cb: CallbackFunction): this {
    const callbackId = CallbackRegistry.register(cb, undefined, true);
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
    window.parent.postMessage({
      source: 'potok-plugin-sdk',
      action: 'REGISTER_SEARCH_PROVIDER',
      payload: {
        id: this.id,
        name: this.name,
        icon: this.iconUrl,
        callbackId
      }
    }, hostOrigin);
    return this;
  }

  register(cb: CallbackFunction): this {
    return this.onSearch(cb);
  }
}

export class ElementMutationBuilder {
  private builder: BlockMutationBuilder;
  private elementId: string;

  constructor(builder: BlockMutationBuilder, elementId: string) {
    this.builder = builder;
    this.elementId = elementId;
  }

  hide(): BlockMutationBuilder {
    this.builder.addMutation({ elementId: this.elementId, action: 'hide' });
    return this.builder;
  }

  edit(props: Record<string, unknown>): BlockMutationBuilder {
    this.builder.addMutation({ elementId: this.elementId, action: 'edit', props });
    return this.builder;
  }

  before(ui: unknown): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'before',
      layout: compileMaybe(ui)
    });
    return this.builder;
  }

  after(ui: unknown): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'after',
      layout: compileMaybe(ui)
    });
    return this.builder;
  }

  replace(ui: unknown): BlockMutationBuilder {
    this.builder.addMutation({
      elementId: this.elementId,
      action: 'replace',
      layout: compileMaybe(ui)
    });
    return this.builder;
  }
}

export class BlockMutationBuilder {
  private blockName: string;
  private mutations: unknown[];
  private appends: unknown[];
  private prepends: unknown[];

  constructor(blockName: string) {
    this.blockName = blockName;
    this.mutations = [];
    this.appends = [];
    this.prepends = [];
  }

  element(id: string): ElementMutationBuilder {
    return new ElementMutationBuilder(this, id);
  }

  addMutation(mutation: unknown): void {
    this.mutations.push(mutation);
  }

  append(ui: unknown): this {
    this.appends.push(compileMaybe(ui));
    return this;
  }

  prepend(ui: unknown): this {
    this.prepends.push(compileMaybe(ui));
    return this;
  }

  apply(): void {
    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
    window.parent.postMessage({
      source: 'potok-plugin-sdk',
      action: 'REGISTER_BLOCK_MUTATIONS',
      payload: {
        blockName: this.blockName,
        mutations: this.mutations,
        appends: this.appends,
        prepends: this.prepends
      }
    }, hostOrigin);
  }
}
