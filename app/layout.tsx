import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroHunt | Intelligent Flight Search",
  description: "Find the best flight combinations for your next adventure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="app-container">
          {children}
        </main>
      </body>
    </html>
  );
}
