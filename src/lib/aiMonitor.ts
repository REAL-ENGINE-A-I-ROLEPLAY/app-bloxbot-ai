export interface MonitorSnapshot {
  outputErrors: number;
  assetFailures: number;
  memoryUsageMB: number;
  fps: number;
  networkLatencyMs: number;
}

export interface MonitorAlert {
  severity: "low" | "medium" | "high";
  code: "output-errors" | "asset-failures" | "memory" | "fps" | "network";
  message: string;
  suggestedTask: string;
}

export function evaluateMonitorSnapshot(snapshot: MonitorSnapshot): MonitorAlert[] {
  const alerts: MonitorAlert[] = [];
  if (snapshot.outputErrors > 0) {
    alerts.push({
      severity: snapshot.outputErrors > 5 ? "high" : "medium",
      code: "output-errors",
      message: `${snapshot.outputErrors} output errors detected`,
      suggestedTask: "Run error diagnosis and script repair workflow",
    });
  }
  if (snapshot.assetFailures > 0) {
    alerts.push({
      severity: snapshot.assetFailures > 10 ? "high" : "medium",
      code: "asset-failures",
      message: `${snapshot.assetFailures} failed asset loads detected`,
      suggestedTask: "Run dependency and ownership asset scan",
    });
  }
  if (snapshot.memoryUsageMB > 2_500) {
    alerts.push({
      severity: "medium",
      code: "memory",
      message: `Memory usage elevated at ${snapshot.memoryUsageMB} MB`,
      suggestedTask: "Run memory optimization and LOD pass",
    });
  }
  if (snapshot.fps < 35) {
    alerts.push({
      severity: snapshot.fps < 20 ? "high" : "medium",
      code: "fps",
      message: `Low FPS detected (${snapshot.fps})`,
      suggestedTask: "Run performance bottleneck analysis",
    });
  }
  if (snapshot.networkLatencyMs > 220) {
    alerts.push({
      severity: "low",
      code: "network",
      message: `Network latency elevated (${snapshot.networkLatencyMs} ms)`,
      suggestedTask: "Run replication/network diagnostics",
    });
  }
  return alerts;
}
