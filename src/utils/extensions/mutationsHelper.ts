import type { ElementMutation, UIComponentSchema } from "@potok/sdk-types";

export class BlockMutationsManager {
  private blockMutations = new Map<
    string,
    Map<string, { mutations: ElementMutation[]; appends: UIComponentSchema[]; prepends: UIComponentSchema[] }>
  >();

  register(
    pluginId: string,
    blockName: string,
    mutations: ElementMutation[] = [],
    appends: UIComponentSchema[] = [],
    prepends: UIComponentSchema[] = []
  ) {
    if (!this.blockMutations.has(blockName)) {
      this.blockMutations.set(blockName, new Map());
    }
    this.blockMutations.get(blockName)!.set(pluginId, { mutations, appends, prepends });
  }

  get(blockName: string) {
    const forBlock = this.blockMutations.get(blockName);
    if (!forBlock) return [];
    return Array.from(forBlock.entries()).map(([pluginId, val]) => ({
      pluginId,
      ...val
    }));
  }

  clearForPlugin(pluginId: string) {
    for (const [blockName, map] of this.blockMutations.entries()) {
      if (map.has(pluginId)) {
        map.delete(pluginId);
        if (map.size === 0) {
          this.blockMutations.delete(blockName);
        }
      }
    }
  }
}
