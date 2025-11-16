import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { AccessibilityControls } from "@/components/accessibility/AccessibilityControls";
import { ToastContainer } from "@/components/ui/Toast";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FeedbackButton } from "@/components/FeedbackButton";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeryGoodMelon.Fun - Thoughtful Games to Reduce Anxiety",
  description: "Creative, accessible, AI-powered games designed to help you relax. No ads, no accounts, no stress - just thoughtful experiences.",
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
        <ErrorBoundary>
          <main id="main-content" className="min-h-screen" role="main">
            {children}
          </main>
        </ErrorBoundary>
        <Footer />
        <AccessibilityControls />
        <FeedbackButton />
        <ToastContainer />
        <SpeedInsights />
      </body>
    </html>
  );
}
