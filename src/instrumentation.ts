import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Bypass Sentry loading in development to prevent Turbopack edge compilation & HMR module factory crashes
  if (process.env.NODE_ENV === "development") {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = (err: any, request: any, context: any) => {
  if (process.env.NODE_ENV === "development") {
    console.error("Local request error captured:", err);
    return;
  }
  return Sentry.captureRequestError(err, request, context);
};
