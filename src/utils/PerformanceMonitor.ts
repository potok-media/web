import { useEffect } from "react";

export interface ComponentPerformanceMetrics {
  count: number;
  totalDuration: number;
  maxDuration: number;
  lastUpdate: number;
}

export interface LongTaskMetric {
  startTime: number;
  duration: number;
}

type PerformanceListener = () => void;

class PerformanceMonitorRegistry {
  public metrics: Record<string, ComponentPerformanceMetrics> = {};
  public longTasks: LongTaskMetric[] = [];
  public lastInputTime: number = 0;
  public inputLatency: number = 0;
  
  private listeners: Set<PerformanceListener> = new Set();
  private fps: number = 60;
  private frameTimes: number[] = [];

  constructor() {
    if (typeof window === "undefined") return;

    // Set up FPS tracker
    const trackFrame = () => {
      const now = performance.now();
      this.frameTimes.push(now);
      
      // Keep only frame times from the last 1 second
      const oneSecondAgo = now - 1000;
      while (this.frameTimes.length > 0 && this.frameTimes[0] < oneSecondAgo) {
        this.frameTimes.shift();
      }
      
      this.fps = this.frameTimes.length;
      
      // Measure input latency if keydown was recently registered
      if (this.lastInputTime > 0) {
        this.inputLatency = now - this.lastInputTime;
        this.lastInputTime = 0; // reset
        this.notify();
      }
      
      requestAnimationFrame(trackFrame);
    };
    requestAnimationFrame(trackFrame);

    // Set up D-pad input latency tracker
    window.addEventListener("keydown", (e) => {
      const code = e.keyCode || e.which;
      if ([37, 38, 39, 40, 13].includes(code)) { // DPAD Arrow keys + Enter
        this.lastInputTime = performance.now();
      }
    }, { capture: true });

    // Set up Long Tasks observer (Chrome-only, supported in Android TV WebView)
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
          });
          if (this.longTasks.length > 50) {
            this.longTasks.shift();
          }
        }
        this.notify();
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch (e) {
      console.warn("[PerformanceMonitor] Long Tasks API not supported in this environment");
    }
  }

  public addListener(cb: PerformanceListener) {
    this.listeners.add(cb);
  }

  public removeListener(cb: PerformanceListener) {
    this.listeners.delete(cb);
  }

  private notifyScheduled = false;

  public notify() {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    requestAnimationFrame(() => {
      this.notifyScheduled = false;
      this.listeners.forEach((cb) => cb());
    });
  }

  public getFps(): number {
    return this.fps;
  }

  public recordRender(name: string, duration: number) {
    if (!this.metrics[name]) {
      this.metrics[name] = {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        lastUpdate: 0,
      };
    }
    const m = this.metrics[name];
    m.count++;
    m.totalDuration += duration;
    m.maxDuration = Math.max(m.maxDuration, duration);
    m.lastUpdate = Date.now();
    this.notify();
  }

  public clearMetrics() {
    this.metrics = {};
    this.longTasks = [];
    this.inputLatency = 0;
    this.notify();
  }
}

export const performanceMonitor = new PerformanceMonitorRegistry();

/**
 * React Hook to monitor a component's render execution time.
 * Calculates render time including layout commit.
 */
export function usePerformanceTrack(componentName: string, enabled = true) {
  if (!enabled || typeof window === "undefined") return;

  const renderStart = performance.now();

  useEffect(() => {
    const renderEnd = performance.now();
    const duration = renderEnd - renderStart;
    performanceMonitor.recordRender(componentName, duration);
  });
}
