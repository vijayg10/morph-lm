import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const agentExecutionsTotal = new Counter({
  name: 'agent_executions_total',
  help: 'Total number of agent executions',
  labelNames: ['agent', 'status'] as const,
  registers: [register],
});

export const agentExecutionDuration = new Histogram({
  name: 'agent_execution_duration_seconds',
  help: 'Agent execution duration in seconds',
  labelNames: ['agent'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

export const agentActiveProcesses = new Gauge({
  name: 'agent_active_processes',
  help: 'Number of currently active agent processes',
  labelNames: ['agent'] as const,
  registers: [register],
});

export const sessionsActiveTotal = new Gauge({
  name: 'sessions_active_total',
  help: 'Number of active sessions',
  registers: [register],
});
