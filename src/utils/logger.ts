type LogLevel = "info" | "warn" | "error" | "debug";

const LOG_COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  debug: "\x1b[90m",
};

const RESET = "\x1b[0m";

function log(level: LogLevel, service: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];
  const prefix = `${color}[${timestamp}] [${level.toUpperCase()}] [${service}]${RESET}`;

  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export function createLogger(service: string) {
  return {
    info: (message: string, data?: unknown) => log("info", service, message, data),
    warn: (message: string, data?: unknown) => log("warn", service, message, data),
    error: (message: string, data?: unknown) => log("error", service, message, data),
    debug: (message: string, data?: unknown) => log("debug", service, message, data),
  };
}
