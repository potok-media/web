import { logger } from "../logger";

export class SettlementManager {
  settlementState: 'idle' | 'settling' | 'settled' = 'idle';
  private expectedPlugins = new Set<string>();
  private settlementTimeoutId: any = null;
  private notify: () => void;

  constructor(notify: () => void) {
    this.notify = notify;
  }

  init(expectedPlugins: string[]) {
    if (this.settlementState !== 'idle') return;
    this.settlementState = 'settling';
    this.expectedPlugins = new Set(expectedPlugins);
    
    if (expectedPlugins.length === 0) {
      this.complete();
      return;
    }

    this.settlementTimeoutId = setTimeout(() => {
      logger.warn("[ExtensionRegistry] Settlement safety timeout reached. Forcing complete.");
      this.complete();
    }, 1000);
    this.notify();
  }

  reportReady(pluginId: string) {
    if (this.settlementState !== 'settling') return;
    this.expectedPlugins.delete(pluginId);
    if (this.expectedPlugins.size === 0) {
      this.complete();
    }
  }

  complete() {
    if (this.settlementState === 'settled') return;
    this.settlementState = 'settled';
    if (this.settlementTimeoutId) {
      clearTimeout(this.settlementTimeoutId);
      this.settlementTimeoutId = null;
    }
    this.notify();
  }

  getIsSettled(): boolean {
    return this.settlementState === 'settled';
  }
}
