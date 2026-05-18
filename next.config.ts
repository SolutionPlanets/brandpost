import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "solution-planets",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI or production builds
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/prereqs/environmental-variables-for-global-sentry-options/
  authToken: process.env.SENTRY_AUTH_TOKEN,

  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
