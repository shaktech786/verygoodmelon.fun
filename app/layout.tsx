import type { Metadata } from "next";
import "./globals.css";
import "@/components/seedpress/seedpress.css";
import { Header } from "@/components/seedpress/Header";
import { Footer } from "@/components/seedpress/Footer";
import { AccessibilityControls } from "@/components/accessibility/AccessibilityControls";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { CareModeProvider } from "@/components/games/CareMode";
import { ACCESSIBILITY_BOOT_SCRIPT } from "@/lib/accessibility/boot-script";
import { KEPT_BOOT_SCRIPT } from "@/lib/games/kept-boot";
import { PALETTES } from "@/lib/design/tokens";
import { atkinson, bricolage } from "@/lib/design/fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://verygoodmelon.fun"),
  title: "VeryGoodMelon.Fun - Thoughtful Games to Reduce Anxiety",
  description: "Creative, accessible games designed to help you relax. No ads, no sign-up, no stress - just thoughtful experiences.",
  keywords: ["games", "relaxation", "anxiety relief", "accessible games", "creative games", "watermelon"],
  authors: [{ name: "VeryGoodMelon.Fun" }],
  creator: "VeryGoodMelon.Fun",
  publisher: "VeryGoodMelon.Fun",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://verygoodmelon.fun",
    title: "VeryGoodMelon.Fun - Thoughtful Games to Reduce Anxiety",
    description: "Creative, accessible games designed to help you relax. No ads, no sign-up, no stress.",
    siteName: "VeryGoodMelon.Fun",
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'VeryGoodMelon.Fun' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VeryGoodMelon.Fun - Thoughtful Games to Reduce Anxiety",
    description: "Creative, accessible games designed to help you relax.",
    images: ['/logo.png'],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PALETTES.light.paper },
    { media: "(prefers-color-scheme: dark)", color: PALETTES.dark.paper },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${atkinson.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCESSIBILITY_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: KEPT_BOOT_SCRIPT }} />
        {/* Import map for TalkingHead 3D avatar library (loaded at runtime from /talkinghead/) */}
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                "three": "https://esm.sh/three@0.180.0",
                "three/": "https://esm.sh/three@0.180.0/",
              },
            }),
          }}
        />
        <link rel="dns-prefetch" href="https://esm.sh" />
        <link rel="preconnect" href="https://esm.sh" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VeryGoodMelon" />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <Header />
        <CareModeProvider>
          <ErrorBoundary>
            <main id="main-content" className="min-h-screen" role="main">
              {children}
            </main>
          </ErrorBoundary>
          <Footer />
        </CareModeProvider>
        <AccessibilityControls />
        <FeedbackDialog />
        <SiteAnalytics />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
