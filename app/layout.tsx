import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/Header";
import { AccessibilityControls } from "@/components/accessibility/AccessibilityControls";
import { SpeedInsights } from "@vercel/speed-insights/next";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeryGoodMelon.Fun - Thoughtful Games to Reduce Anxiety",
  description: "Creative, accessible, AI-powered games designed to help you relax. No ads, no accounts, no stress - just thoughtful experiences.",
  keywords: ["games", "relaxation", "anxiety relief", "accessible games", "creative games", "watermelon", "bowling"],
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
    description: "Creative, accessible games designed to help you relax. No ads, no accounts, no stress.",
    siteName: "VeryGoodMelon.Fun",
  },
  twitter: {
    card: "summary_large_image",
    title: "VeryGoodMelon.Fun - Thoughtful Games to Reduce Anxiety",
    description: "Creative, accessible games designed to help you relax.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#e63946",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${quicksand.variable} antialiased`} suppressHydrationWarning>
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="min-h-screen" role="main">
          {children}
        </main>
        <footer className="border-t border-card-border mt-20" role="contentinfo">
          <div className="container mx-auto px-6 py-12 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-primary-light">
              <p>Made with purpose. Every pixel has meaning.</p>
              <p>© 2025 VeryGoodMelon.Fun</p>
            </div>
          </div>
        </footer>
        <AccessibilityControls />
        <SpeedInsights />
      </body>
    </html>
  );
}
