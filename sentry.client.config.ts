import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Errors thrown by scripts the browser injects into our pages — not reachable
  // from our bundle and nothing user-facing breaks, but each one otherwise
  // burns a session replay and adds alert-fatigue noise that masks real errors.
  ignoreErrors: [
    // DuckDuckGo mobile injects user scripts that call its native message
    // broker; a page origin not allowlisted for the invoked feature rejects
    // with BrokerError.policyRestriction, whose message is "invalid origin".
    // See duckduckgo/apple-browsers UserScriptMessaging.swift.
    "invalid origin",
    // Benign layout notification the spec requires browsers to fire.
    "ResizeObserver loop",
  ],
  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],
  debug: false,
});
