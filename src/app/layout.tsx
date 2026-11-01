import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./monthly.css";

export const metadata: Metadata = {
  title: "PlaniLux — ton planning, en mieux",
  description: "Des semaines plus douces, une journée à la fois. Crée et personnalise tes plannings avec PlaniLux.",
  applicationName: "PlaniLux",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "PlaniLux", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f6f3",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
