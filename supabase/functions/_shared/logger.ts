// Structured JSON logging utility for UltaAI Backend

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  static info(message: string, context?: LogContext) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      service: 'UltaAI Backend',
      ...context
    }));
  }

  static error(message: string, error?: any, context?: LogContext) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      service: 'UltaAI Backend',
      ...context
    }));
  }

  static warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      service: 'UltaAI Backend',
      ...context
    }));
  }

  static debug(message: string, context?: LogContext) {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      timestamp: new Date().toISOString(),
      service: 'UltaAI Backend',
      ...context
    }));
  }

  static request(method: string, path: string, context?: LogContext) {
    this.info('HTTP Request', {
      method,
      path,
      type: 'request',
      ...context
    });
  }

  static response(status: number, method: string, path: string, context?: LogContext) {
    this.info('HTTP Response', {
      status,
      method,
      path,
      type: 'response',
      ...context
    });
  }
}