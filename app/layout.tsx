import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Partner configs ask for Inter; without this it silently fell back to a system font.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ladekarten-Aktivierung",
  description: "Aktivieren Sie hier Ihre Ladekarte.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
