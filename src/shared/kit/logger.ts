import { pino } from "pino";

// The log of a process the host's cron runs (crawl, process, translate, registers): one JSON line a message, with its
// time, level and process, written as it is said (a synchronous write: a line before an exit is never lost). Read back
// by operations' summary and alerts, which take each line's `msg` (`messageOfLine`).
export interface ProcessLog {
  info(message: string): void;
  error(message: string): void;
}

export function processLog(name: string): ProcessLog {
  const logger = pino(
    {
      base: { process: name },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
    },
    pino.destination({ sync: true }),
  );
  return {
    info: (message) => logger.info(message),
    error: (message) => logger.error(message),
  };
}

// A log line's message and time: a JSON line's `msg` and `time`, or a line written before the logs were JSON as it is.
export function messageOfLine(line: string): {
  readonly message: string;
  readonly time?: string;
} {
  if (line.startsWith("{"))
    try {
      const parsed = JSON.parse(line) as { msg?: unknown; time?: unknown };
      if (typeof parsed.msg === "string")
        return {
          message: parsed.msg,
          ...(typeof parsed.time === "string" ? { time: parsed.time } : {}),
        };
    } catch {
      // Not JSON after all: the line as it is.
    }
  return { message: line };
}
