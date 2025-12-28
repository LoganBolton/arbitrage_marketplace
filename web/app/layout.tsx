import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arbitrage Marketplace",
  description: "Browse marketplace listings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
