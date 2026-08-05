/**
 * Centralized logger.
 *
 * Single place to funnel app logging so remote error reporting (Sentry, etc.)
 * can be wired up later without touching every call site.
 * Use `logger.info/warn/error` instead of raw console calls in src/.
 */
type LogLevel = "info" | "warn" | "error";

const isDev = import.meta.env.DEV;

function emit(level: LogLevel, message: string, ...context: unknown[]) {
  // Info/warn are noise in production; errors always surface.
  if (!isDev && level !== "error") return;
  // eslint-disable-next-line no-console
  console[level](`[${level}] ${message}`, ...context);
}

export const logger = {
  info: (message: string, ...context: unknown[]) => emit("info", message, ...context),
  warn: (message: string, ...context: unknown[]) => emit("warn", message, ...context),
  error: (message: string, ...context: unknown[]) => {
    emit("error", message, ...context);
    // TODO: forward to a remote error reporter here (e.g. Sentry.captureException).
  },
};

export default logger;
