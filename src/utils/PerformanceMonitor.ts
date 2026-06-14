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

export interface ActivityEvent {
  time: string; // HH:MM:SS.mmm
  type: "keydown" | "render" | "longtask" | "route" | "scroll" | "api";
  description: string;
}

export interface FpsDropReport {
  timestamp: number;
  time: string;
  fps: number;
  activities: ActivityEvent[];
}

type PerformanceListener = () => void;

class PerformanceMonitorRegistry {
  public metrics: Record<string, ComponentPerformanceMetrics> = {};
  public longTasks: LongTaskMetric[] = [];
  public lastInputTime: number = 0;
  public inputLatency: number = 0;
  
  public activityLog: ActivityEvent[] = [];
  public lastFpsDropReport: FpsDropReport | null = null;
  private lastFpsDropTime: number = 0;

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
      
      // Check for FPS drop below 50 (after at least 15 frames have been tracked to avoid startup noise)
      if (this.fps < 50 && this.frameTimes.length > 15) {
        const nowMs = Date.now();
        // Cooldown of 1.5 seconds to prevent spamming reports for a single lag spike
        if (nowMs - this.lastFpsDropTime > 1500) {
          this.lastFpsDropTime = nowMs;
          const date = new Date();
          const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}.${String(date.getMilliseconds()).padStart(3, "0")}`;
          
          this.lastFpsDropReport = {
            timestamp: nowMs,
            time: timeStr,
            fps: this.fps,
            activities: [...this.activityLog] // Snapshot current activity queue
          };
          
          console.warn(`[PerformanceMonitor] FPS dropped to ${this.fps} at ${timeStr}. Recent activities:`, this.lastFpsDropReport.activities);
          
          // Send to Vite server (works in both dev mode and preview mode)
          if (typeof window !== "undefined") {
            fetch("/api/potok-log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                fps: this.fps,
                time: timeStr,
                activities: this.lastFpsDropReport.activities
              })
            }).catch(() => {});
          }

          this.notify();
        }
      }

      // Measure input latency if keydown was recently registered
      if (this.lastInputTime > 0) {
        this.inputLatency = now - this.lastInputTime;
        this.lastInputTime = 0; // reset
        this.notify();
      }
      
      requestAnimationFrame(trackFrame);
    };
    requestAnimationFrame(trackFrame);

    // Set up D-pad input latency tracker & log keydowns
    window.addEventListener("keydown", (e) => {
      const code = e.keyCode || e.which;
      const keyName = e.key || `Code ${code}`;
      this.addActivity("keydown", `D-pad key pressed: ${keyName}`);

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
          this.addActivity("longtask", `JS Thread blocked (Long Task) for ${Math.round(entry.duration)}ms`);
        }
        this.notify();
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch (e) {
      console.warn("[PerformanceMonitor] Long Tasks API not supported in this environment");
    }

    // Globally intercept fetch requests to log API activity
    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const urlInput = args[0];
        let url = "";
        if (typeof urlInput === "string") {
          url = urlInput;
        } else if (urlInput instanceof Request) {
          url = urlInput.url;
        } else if (urlInput && typeof urlInput === "object" && "url" in urlInput) {
          url = (urlInput as any).url;
        } else {
          url = String(urlInput);
        }

        // Clean up URL to show relative path/query
        let endpoint = url;
        try {
          const parsed = new URL(url, window.location.origin);
          endpoint = parsed.pathname + parsed.search;
        } catch {}

        // Skip logging for our own diagnostics logs to avoid loops/pollution
        if (endpoint.includes("/api/potok-log")) {
          return originalFetch(...args);
        }

        this.addActivity("api", `API Request: ${endpoint}`);
        const startTime = performance.now();
        try {
          const response = await originalFetch(...args);
          const duration = Math.round(performance.now() - startTime);
          this.addActivity("api", `API Success: ${endpoint} (${duration}ms)`);
          return response;
        } catch (error) {
          const duration = Math.round(performance.now() - startTime);
          this.addActivity("api", `API Error: ${endpoint} (${duration}ms)`);
          throw error;
        }
      };
    }

    // Globally intercept History API to log routing
    if (window.history) {
      const originalPush = window.history.pushState;
      const originalReplace = window.history.replaceState;
      
      const self = this;
      window.history.pushState = function(...args) {
        const path = String(args[2] || "");
        self.addActivity("route", `Navigate (push): ${path}`);
        return originalPush.apply(this, args);
      };
      
      window.history.replaceState = function(...args) {
        const path = String(args[2] || "");
        self.addActivity("route", `Navigate (replace): ${path}`);
        return originalReplace.apply(this, args);
      };

      window.addEventListener("popstate", () => {
        this.addActivity("route", `Navigate (popstate): ${window.location.pathname}${window.location.search}`);
      });
    }
  }

  public addActivity(type: ActivityEvent["type"], description: string) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    
    this.activityLog.push({
      time: timeStr,
      type,
      description
    });

    if (this.activityLog.length > 30) {
      this.activityLog.shift();
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
    
    this.addActivity("render", `Rendered: ${name} (${Math.round(duration)}ms)`);
    this.notify();
  }

  public clearMetrics() {
    this.metrics = {};
    this.longTasks = [];
    this.inputLatency = 0;
    this.activityLog = [];
    this.lastFpsDropReport = null;
    this.lastFpsDropTime = 0;
    this.notify();
  }
}

export const performanceMonitor = new PerformanceMonitorRegistry();

export function usePerformanceTrack(componentName: string, enabled = true) {
  if (!enabled || typeof window === "undefined") return;

  const renderStart = performance.now();

  useEffect(() => {
    const renderEnd = performance.now();
    const duration = renderEnd - renderStart;
    performanceMonitor.recordRender(componentName, duration);
  });
}
