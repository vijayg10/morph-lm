import pino from 'pino';
import type { Config } from '../config/config.js';

let _logger: pino.Logger;

export function createLogger(config: Config): pino.Logger {
  _logger = pino({
    level: config.LOG_LEVEL,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  return _logger;
}

export function getLogger(): pino.Logger {
  if (!_logger) {
    _logger = pino({ level: 'info' });
  }
  return _logger;
}
