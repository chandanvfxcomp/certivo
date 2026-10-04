// src/lib/logger.ts
//
// Minimal structured logger. JSON-line output so it's greppable and ready
// for any log pipeline later, without pulling in a dependency for
// something this small in P0.
//
// Deliberately does NOT redact anything — that's a policy decision, not
// an oversight: it means every call site is responsible for never passing
// PII/secrets in `meta`. (Section 12.3: "Never expose another user's PII
// inside an audit entry shown to a tenant" is about what a tenant can
// *see* via AuditLog reads; this logger is server-side-only output and a
// separate concern, but the same discipline applies — don't log emails,
// phone numbers, tokens, or password hashes here.)

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta ?? {}),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(serialized);
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(serialized);
  } else {
    // eslint-disable-next-line no-console
    console.log(serialized);
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => write("debug", message, meta),
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
