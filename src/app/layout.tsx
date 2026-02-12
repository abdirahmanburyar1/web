import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AquaTrack – Water Supplier SaaS",
  description: "Multi-tenant water supplier platform",
  metadataBase: new URL("https://aquatrack.so"),
  openGraph: {
    title: "AquaTrack – Water Supplier SaaS",
    description: "Multi-tenant water supplier platform",
    url: "https://aquatrack.so",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
