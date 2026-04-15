import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoMarketics — Market Governance System",
  description: "GIS-enabled digital governance platform for managing public markets with interactive stall mapping, vendor management, and real-time analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
