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
      <head>
        {/* Preload the most-visited SVG floor plan so the browser fetches it
            in parallel with JS, before any React component mounts.
            On slow mobile connections this shaves 500ms–2s off perceived load. */}
        <link rel="preload" href="/MAIN_First_Floor.svg" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/ANNEX_First_Floor.svg" as="fetch" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        {/* Service Worker registration — runs after page is interactive */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
