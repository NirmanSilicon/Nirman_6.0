import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GoldenHour — Emergency Readiness Coordination System",
    template: "%s | GoldenHour",
  },
  description:
    "GoldenHour coordinates emergency alerts, hospital capability matching, and preparation task workflows — so trauma teams are ready before the patient arrives.",
  keywords: [
    "emergency",
    "medical",
    "health",
    "safety",
    "trauma",
    "golden hour",
    "hospital coordination",
    "emergency readiness",
  ],
  authors: [{ name: "GoldenHour Team" }],
  creator: "GoldenHour",
  publisher: "GoldenHour",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "GoldenHour",
    title: "GoldenHour — Emergency Readiness Coordination System",
    description:
      "GoldenHour coordinates emergency alerts, hospital capability matching, and preparation task workflows — so trauma teams are ready before the patient arrives.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GoldenHour Emergency Readiness Coordination",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GoldenHour — Emergency Readiness Coordination System",
    description:
      "GoldenHour coordinates emergency alerts, hospital capability matching, and preparation task workflows — so trauma teams are ready before the patient arrives.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefbeb" },
    { media: "(prefers-color-scheme: dark)", color: "#451a03" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-white font-sans text-gray-900">
        {children}
      </body>
    </html>
  );
}
