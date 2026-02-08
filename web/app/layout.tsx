import type { Metadata } from "next";
import Link from "next/link";
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
      <body>
        <nav className="nav">
          <Link href="/" className="nav-link">Listings</Link>
          <Link href="/admin" className="nav-link">Admin</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
