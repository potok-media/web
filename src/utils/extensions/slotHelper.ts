import type { SlotContribution, UIComponentSchema } from "@potok/sdk-types";

export class SlotManager {
  private contributions = new Map<string, { contribution: SlotContribution; pluginId: string }>();
  private slotRenders = new Map<string, { label: string; icon?: string; layout: UIComponentSchema }>();
  
  private getSandboxIframe: (pluginId: string) => HTMLIFrameElement | undefined;
  private notify: () => void;

  constructor(
    getSandboxIframe: (pluginId: string) => HTMLIFrameElement | undefined,
    notify: () => void
  ) {
    this.getSandboxIframe = getSandboxIframe;
    this.notify = notify;
  }

  registerContribution(pluginId: string, contribution: SlotContribution) {
    this.contributions.set(contribution.id, { contribution, pluginId });
    this.notify();
  }

  getContributions(slotName: string): { contribution: SlotContribution; pluginId: string }[] {
    return Array.from(this.contributions.values()).filter(
      (c) => c.contribution.slotName === slotName
    );
  }

  registerRender(slotId: string, render: { label: string; icon?: string; layout: UIComponentSchema }) {
    this.slotRenders.set(slotId, render);
    this.notify();
  }

  getRender(slotId: string) {
    return this.slotRenders.get(slotId);
  }

  triggerRender(slotId: string, props: Record<string, unknown>) {
    const contribution = this.contributions.get(slotId);
    if (!contribution) return;

    const iframe = this.getSandboxIframe(contribution.pluginId);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          source: "potok-host",
          action: "RENDER_SLOT",
          payload: { slotId, props }
        },
        "*"
      );
    }
  }

  triggerUIEvent(pluginId: string, callbackId: string, eventData: unknown) {
    const iframe = this.getSandboxIframe(pluginId);
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          source: "potok-host",
          action: "TRIGGER_UI_EVENT",
          payload: { callbackId, eventData }
        },
        "*"
      );
    }
  }

  clearForPlugin(pluginId: string) {
    for (const [, val] of this.contributions.entries()) {
      if (val.pluginId === pluginId) {
        this.contributions.delete(val.contribution.id);
        this.slotRenders.delete(val.contribution.id);
      }
    }
  }
}
