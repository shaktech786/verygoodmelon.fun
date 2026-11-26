import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // CI screenshots the dev server for visual baselines, where the dev badge is not part of the page
  ...(process.env.CI ? { devIndicators: false as const } : {}),
  async redirects() {
    return [
      // The public numbers now live in a section of the privacy policy
      { source: "/analytics", destination: "/privacy#analytics", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
