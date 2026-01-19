import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focal - AI Focus Monitor",
  description: "AI-powered focus monitoring with context-aware interventions. Stay locked in with intelligent productivity coaching.",
  keywords: ["focus", "productivity", "AI", "monitoring", "study", "work", "concentration"],
  authors: [{ name: "Focal" }],
  themeColor: "#0d0f14",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-[#0d0f14]`}>
        {children}
      </body>
    </html>
  );
}
